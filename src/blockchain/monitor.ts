import { query } from '../db';
import logger from '../utils/logger';
import blockfrostService from './blockfrost';
import { EventType, MonitoredAddress, MonitoredContract, TransactionEvent } from '../types';
import { processEvent } from '../webhooks/processor';
import config from '../config';

// Cache to store last processed transactions for each address and contract
const lastProcessedTxs = {
  addresses: new Set<string>(),
  contracts: new Set<string>(),
  // Reset after 1000 items to prevent memory growth
  maxSize: 1000,
  reset: function() {
    this.addresses.clear();
    this.contracts.clear();
  }
};

/**
 * Initialize monitoring for addresses and contracts
 */
export const initializeMonitoring = async (): Promise<void> => {
  try {
    logger.info('Initializing blockchain monitoring service');
    
    // Clear the cache
    lastProcessedTxs.reset();
    
    // Fetch all active addresses and contracts
    const addresses = await getActiveAddresses();
    const contracts = await getActiveContracts();
    
    logger.info(`Loaded ${addresses.length} addresses and ${contracts.length} contracts for monitoring`);
    
    // Start monitoring
    monitorBlockchain();
  } catch (error) {
    logger.error('Failed to initialize monitoring:', error);
    throw error;
  }
};

/**
 * Get all active monitored addresses from the database
 */
export const getActiveAddresses = async (): Promise<MonitoredAddress[]> => {
  try {
    const result = await query(
      'SELECT * FROM monitored_addresses WHERE is_active = true',
      []
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching active addresses:', error);
    throw error;
  }
};

/**
 * Get all active monitored contracts from the database
 */
export const getActiveContracts = async (): Promise<MonitoredContract[]> => {
  try {
    const result = await query(
      'SELECT * FROM monitored_contracts WHERE is_active = true',
      []
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching active contracts:', error);
    throw error;
  }
};

/**
 * Start the blockchain monitoring process
 * This runs on a continuous interval, checking for new transactions
 * for all monitored addresses and contracts
 */
export const monitorBlockchain = (): void => {
  // Get polling interval from config, with fallback
  const POLLING_INTERVAL = config.blockchain.pollingInterval || 30000;
  
  logger.info(`Starting blockchain monitoring service with polling interval of ${POLLING_INTERVAL}ms`);
  
  // Set up interval for continuous monitoring
  setInterval(async () => {
    try {
      // Fetch all active addresses and contracts
      const addresses = await getActiveAddresses();
      const contracts = await getActiveContracts();
      
      // Check for transactions for each address
      for (const address of addresses) {
        await checkAddressTransactions(address);
      }
      
      // Check for transactions for each contract
      for (const contract of contracts) {
        await checkContractTransactions(contract);
      }
      
    } catch (error) {
      logger.error('Error in blockchain monitoring cycle:', error);
    }
  }, POLLING_INTERVAL);
};

/**
 * Check for new transactions for a monitored address
 */
export const checkAddressTransactions = async (address: MonitoredAddress): Promise<void> => {
  try {
    // Get the last 20 transactions for this address
    const transactions = await blockfrostService.getAddressTransactions(address.address);
    
    // Update the last checked timestamp
    await query(
      'UPDATE monitored_addresses SET last_checked_at = CURRENT_TIMESTAMP WHERE id = $1',
      [address.id]
    );
    
    // Process each transaction
    for (const tx of transactions) {
      // Skip if we've already processed this transaction for this address
      const txKey = `${address.id}:${tx.tx_hash}`;
      if (lastProcessedTxs.addresses.has(txKey)) {
        continue;
      }
      
      // Add to processed set
      lastProcessedTxs.addresses.add(txKey);
      
      // Check if we need to reset the cache to prevent memory leaks
      if (lastProcessedTxs.addresses.size > lastProcessedTxs.maxSize) {
        logger.info(`Address transaction cache exceeded ${lastProcessedTxs.maxSize} items, clearing cache`);
        lastProcessedTxs.reset();
        lastProcessedTxs.addresses.add(txKey); // Re-add current transaction after reset
      }
      
      // Get detailed transaction information
      const txInfo = await blockfrostService.getTransactionInfo(tx.tx_hash);
      
      // Determine transaction direction and relevant event types
      let eventTypes: EventType[] = [];
      
      // Check if address is in inputs or outputs to determine direction
      // Add null checks to handle potentially undefined inputs/outputs
      const isReceiver = tx.outputs && Array.isArray(tx.outputs) ? 
        tx.outputs.some((output: any) => output.address === address.address) : false;
      const isSender = tx.inputs && Array.isArray(tx.inputs) ? 
        tx.inputs.some((input: any) => input.address === address.address) : false;
      
      if (isReceiver) {
        eventTypes.push(EventType.TRANSACTION_RECEIVED);
        
        // Check for ADA received - add null check
        const adaReceived = tx.outputs && Array.isArray(tx.outputs) ?
          tx.outputs
            .filter((output: any) => output.address === address.address)
            .flatMap((output: any) => output.amount || [])
            .filter((amount: any) => amount && amount.unit === 'lovelace')
            .reduce((sum: number, amount: any) => sum + parseInt(amount.quantity, 10), 0)
          : 0;
        
        // Add debug logging to understand why ADA is not being detected
        logger.debug(`ADA detection for ${tx.tx_hash}: address=${address.address}, adaReceived=${adaReceived}`);
        if (tx.outputs && Array.isArray(tx.outputs)) {
          for (const output of tx.outputs) {
            if (output.address === address.address) {
              logger.debug(`Found matching output address: ${JSON.stringify(output)}`);
            }
          }
        }
        
        if (adaReceived > 0) {
          eventTypes.push(EventType.ADA_RECEIVED);
          logger.debug(`Detected ADA received (${adaReceived}) for tx ${tx.tx_hash}`);
        }
        
        // Check for tokens received
        const tokensReceived = tx.outputs && Array.isArray(tx.outputs) ?
          tx.outputs
            .filter((output: any) => output.address === address.address)
            .flatMap((output: any) => output.amount || [])
            .filter((amount: any) => amount && amount.unit !== 'lovelace')
          : [];
        
        if (tokensReceived.length > 0) {
          // Check if any of the tokens are NFTs (unique tokens)
          const hasNFTs = tokensReceived.some((token: any) => token.quantity === '1');
          
          if (hasNFTs) {
            eventTypes.push(EventType.NFT_RECEIVED);
          }
          
          eventTypes.push(EventType.TOKEN_RECEIVED);
        }
      }
      
      if (isSender) {
        eventTypes.push(EventType.TRANSACTION_SENT);
        
        // Check for ADA sent
        const adaSent = tx.inputs && Array.isArray(tx.inputs) ?
          tx.inputs
            .filter((input: any) => input.address === address.address)
            .flatMap((input: any) => input.amount || [])
            .filter((amount: any) => amount && amount.unit === 'lovelace')
            .reduce((sum: number, amount: any) => sum + parseInt(amount.quantity, 10), 0)
          : 0;
        
        if (adaSent > 0) {
          eventTypes.push(EventType.ADA_SENT);
        }
        
        // Check for tokens sent
        const tokensSent = tx.inputs && Array.isArray(tx.inputs) ?
          tx.inputs
            .filter((input: any) => input.address === address.address)
            .flatMap((input: any) => input.amount || [])
            .filter((amount: any) => amount && amount.unit !== 'lovelace')
          : [];
        
        if (tokensSent.length > 0) {
          // Check if any of the tokens are NFTs (unique tokens)
          const hasNFTs = tokensSent.some((token: any) => token.quantity === '1');
          
          if (hasNFTs) {
            eventTypes.push(EventType.NFT_SENT);
          }
          
          eventTypes.push(EventType.TOKEN_SENT);
        }
      }
      
      // Check for metadata
      if (txInfo.metadata) {
        eventTypes.push(EventType.METADATA_ADDED);
      }
      
      // Create an event for each event type
      for (const eventType of eventTypes) {
        await createTransactionEvent({
          tx_hash: tx.tx_hash,
          block_height: txInfo.block_height,
          block_time: new Date(txInfo.block_time * 1000), // Convert from Unix timestamp
          event_type: eventType,
          event_data: {
            tx: txInfo,
            address: address.address
          },
          address_id: address.id,
          contract_id: null,
          processed: false
        });
      }
    }
  } catch (error) {
    logger.error(`Error checking transactions for address ${address.address}:`, error);
  }
};

/**
 * Check for new transactions for a monitored contract
 */
export const checkContractTransactions = async (contract: MonitoredContract): Promise<void> => {
  try {
    // Get the last 20 transactions for this contract address
    const transactions = await blockfrostService.getAddressTransactions(contract.address);
    
    // Update the last checked timestamp
    await query(
      'UPDATE monitored_contracts SET last_checked_at = CURRENT_TIMESTAMP WHERE id = $1',
      [contract.id]
    );
    
    // Process each transaction
    for (const tx of transactions) {
      // Skip if we've already processed this transaction for this contract
      const txKey = `${contract.id}:${tx.tx_hash}`;
      if (lastProcessedTxs.contracts.has(txKey)) {
        continue;
      }
      
      // Add to processed set
      lastProcessedTxs.contracts.add(txKey);
      
      // Check if we need to reset the cache to prevent memory leaks
      if (lastProcessedTxs.contracts.size > lastProcessedTxs.maxSize) {
        logger.info(`Contract transaction cache exceeded ${lastProcessedTxs.maxSize} items, clearing cache`);
        lastProcessedTxs.reset();
        lastProcessedTxs.contracts.add(txKey); // Re-add current transaction after reset
      }
      
      // Get detailed transaction information
      const txInfo = await blockfrostService.getTransactionInfo(tx.tx_hash);
      
      // Create a contract execution event
      await createTransactionEvent({
        tx_hash: tx.tx_hash,
        block_height: txInfo.block_height,
        block_time: new Date(txInfo.block_time * 1000), // Convert from Unix timestamp
        event_type: EventType.CONTRACT_EXECUTED,
        event_data: {
          tx: txInfo,
          contract: contract.address
        },
        address_id: null,
        contract_id: contract.id,
        processed: false
      });
      
      // Check if this transaction involves token minting or burning
      if (txInfo.asset_mint_count > 0) {
        await createTransactionEvent({
          tx_hash: tx.tx_hash,
          block_height: txInfo.block_height,
          block_time: new Date(txInfo.block_time * 1000),
          event_type: EventType.TOKEN_MINTED,
          event_data: {
            tx: txInfo,
            contract: contract.address
          },
          address_id: null,
          contract_id: contract.id,
          processed: false
        });
      }
      
      // Add more contract-specific event detection here
      // This could include specific events for different contract types
      // such as DEX interactions, oracle updates, etc.
    }
  } catch (error) {
    logger.error(`Error checking transactions for contract ${contract.address}:`, error);
  }
};

/**
 * Create a transaction event and trigger webhook processing
 */
export const createTransactionEvent = async (eventData: Partial<TransactionEvent>): Promise<string> => {
  try {
    const result = await query(
      `INSERT INTO transaction_events 
       (tx_hash, block_height, block_time, event_type, event_data, address_id, contract_id, processed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        eventData.tx_hash,
        eventData.block_height,
        eventData.block_time,
        eventData.event_type,
        JSON.stringify(eventData.event_data),
        eventData.address_id,
        eventData.contract_id,
        false
      ]
    );
    
    const eventId = result.rows[0].id;
    
    // Trigger webhook processing for this event
    processEvent(eventId).catch(error => {
      logger.error(`Error processing webhooks for event ${eventId}:`, error);
    });
    
    return eventId;
  } catch (error) {
    logger.error('Error creating transaction event:', error);
    throw error;
  }
};

export default {
  initializeMonitoring,
  getActiveAddresses,
  getActiveContracts,
  monitorBlockchain,
  checkAddressTransactions,
  checkContractTransactions,
  createTransactionEvent
};
