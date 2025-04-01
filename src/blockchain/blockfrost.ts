import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import config from '../config';
import logger from '../utils/logger';
import { CardanoTransaction, CardanoAddress, CardanoNetwork, CardanoUtxo, CardanoAsset, BlockfrostTransactionResponse } from '../types';

// Create BlockFrost API client based on network
const getBlockfrostClient = (): BlockFrostAPI => {
  const { apiKey, network } = config.blockfrost;
  
  if (!apiKey) {
    throw new Error('Blockfrost API key is not configured');
  }
  
  let projectId = apiKey;
  
  // Initialize with sensible default
  let networkType: string = 'mainnet';
  
  // Validate the network value
  switch (network) {
    case 'mainnet':
      networkType = 'mainnet';
      break;
    case 'preprod':
      networkType = 'preprod';
      break;
    case 'preview':
      networkType = 'preview';
      break;
    case 'testnet':
      networkType = 'testnet';
      break;
    default:
      logger.warn(`Unsupported network type: ${network}, defaulting to mainnet`);
  }
  
  // Directly use network parameter with string type
  return new BlockFrostAPI({
    projectId,
    network: networkType as any,
  });
};

// Initialize Blockfrost client
let blockfrostClient: BlockFrostAPI;

try {
  blockfrostClient = getBlockfrostClient();
  logger.info('Blockfrost client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Blockfrost client:', error);
  throw error;
}

/**
 * Get address information from Blockfrost
 */
export const getAddressInfo = async (address: string): Promise<CardanoAddress> => {
  try {
    const addressInfo = await blockfrostClient.addresses(address);
    logger.debug(`Retrieved address info for ${address}`);
    return addressInfo as CardanoAddress;
  } catch (error) {
    logger.error(`Error getting address info for ${address}:`, error);
    throw error;
  }
};

/**
 * Get transaction details from Blockfrost
 */
export const getTransactionInfo = async (txHash: string): Promise<CardanoTransaction> => {
  try {
    const txInfo = await blockfrostClient.txs(txHash) as BlockfrostTransactionResponse;
    logger.debug(`Retrieved transaction info for ${txHash}`);
    
    // Convert to CardanoTransaction by adding missing properties
    const transaction: CardanoTransaction = {
      ...txInfo,
      asset_mint_count: 0, // Default value for asset_mint_count if not present
      metadata: {} // Default empty metadata
    };
    
    // Try to get transaction metadata if available
    try {
      const metadata = await blockfrostClient.txsMetadata(txHash);
      if (metadata && metadata.length > 0) {
        transaction.metadata = metadata.reduce((acc: Record<string, any>, item) => {
          acc[item.label] = item.json_metadata;
          return acc;
        }, {});
      }
    } catch (metadataError) {
      logger.debug(`No metadata available for transaction ${txHash}`);
    }
    
    return transaction;
  } catch (error) {
    logger.error(`Error getting transaction info for ${txHash}:`, error);
    throw error;
  }
};

/**
 * Get address transactions from Blockfrost
 */
export const getAddressTransactions = async (address: string, count: number = 20, page: number = 1): Promise<any[]> => {
  try {
    const transactions = await blockfrostClient.addressesTransactions(address, { count, page });
    logger.debug(`Retrieved ${transactions.length} transactions for address ${address}`);
    return transactions;
  } catch (error) {
    logger.error(`Error getting transactions for address ${address}:`, error);
    throw error;
  }
};

/**
 * Get UTXOs for an address from Blockfrost
 */
export const getAddressUtxos = async (address: string): Promise<CardanoUtxo[]> => {
  try {
    const utxos = await blockfrostClient.addressesUtxos(address);
    logger.debug(`Retrieved ${utxos.length} UTXOs for address ${address}`);
    return utxos as CardanoUtxo[];
  } catch (error) {
    logger.error(`Error getting UTXOs for address ${address}:`, error);
    throw error;
  }
};

/**
 * Get asset information from Blockfrost
 */
export const getAssetInfo = async (assetId: string): Promise<CardanoAsset> => {
  try {
    const assetInfo = await blockfrostClient.assetsById(assetId);
    logger.debug(`Retrieved asset info for ${assetId}`);
    return assetInfo as CardanoAsset;
  } catch (error) {
    logger.error(`Error getting asset info for ${assetId}:`, error);
    throw error;
  }
};

/**
 * Submit transaction to the Cardano blockchain
 */
export const submitTransaction = async (txCbor: string): Promise<string> => {
  try {
    const result = await blockfrostClient.txSubmit(Buffer.from(txCbor, 'hex'));
    logger.info(`Transaction submitted successfully: ${result}`);
    return result;
  } catch (error) {
    logger.error('Error submitting transaction:', error);
    throw error;
  }
};

export default {
  getAddressInfo,
  getTransactionInfo,
  getAddressTransactions,
  getAddressUtxos,
  getAssetInfo,
  submitTransaction,
};
