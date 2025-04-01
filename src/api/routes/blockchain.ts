import { Router, Request, Response } from 'express';
import { apiKeyAuth, requirePermission } from '../../middleware/auth';
import logger from '../../utils/logger';
import blockfrostService from '../../blockchain/blockfrost';
import { ApiError } from '../../types';

const router = Router();

/**
 * @swagger
 * /api/blockchain/addresses/{address}/balance:
 *   get:
 *     summary: Get address balance
 *     description: Retrieve the current balance of a Cardano address
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         description: Cardano address
 *         schema:
 *           type: string
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Address balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   description: The Cardano address
 *                 balance:
 *                   type: string
 *                   description: The address balance in lovelace (1 ADA = 1,000,000 lovelace)
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.get('/addresses/:address/balance', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Get address info from Blockfrost
    const addressInfo = await blockfrostService.getAddressInfo(address);
    
    res.json({
      address,
      balance: addressInfo.amount
    });
  } catch (error: unknown) {
    logger.error(`Error getting balance for address ${req.params.address}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Address not found' });
    } else {
      res.status(500).json({ error: 'Failed to get address balance' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/addresses/{address}/transactions:
 *   get:
 *     summary: Get address transactions
 *     description: Retrieve transactions for a Cardano address
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         description: Cardano address
 *         schema:
 *           type: string
 *       - in: query
 *         name: count
 *         description: Number of transactions to return
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           default: 1
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of transactions for the address
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.get('/addresses/:address/transactions', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    
    // Get transactions from Blockfrost
    const transactions = await blockfrostService.getAddressTransactions(address, count, page);
    
    res.json({
      address,
      page,
      count,
      transactions
    });
  } catch (error: unknown) {
    logger.error(`Error getting transactions for address ${req.params.address}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Address not found' });
    } else {
      res.status(500).json({ error: 'Failed to get address transactions' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/addresses/{address}/utxos:
 *   get:
 *     summary: Get address UTXOs
 *     description: Retrieve unspent transaction outputs (UTXOs) for a Cardano address
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         description: Cardano address
 *         schema:
 *           type: string
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of UTXOs for the address
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.get('/addresses/:address/utxos', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Get UTXOs from Blockfrost
    const utxos = await blockfrostService.getAddressUtxos(address);
    
    res.json({
      address,
      utxo_count: utxos.length,
      utxos
    });
  } catch (error: unknown) {
    logger.error(`Error getting UTXOs for address ${req.params.address}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Address not found' });
    } else {
      res.status(500).json({ error: 'Failed to get address UTXOs' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/transactions:
 *   post:
 *     summary: Submit transaction
 *     description: Submit a transaction to the Cardano blockchain
 *     tags: [Blockchain]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cbor:
 *                 type: string
 *                 description: Transaction CBOR
 *     security:
 *       - ApiKeyAuth: []
 *       - PermissionAuth: [write]
 *     responses:
 *       201:
 *         description: Transaction submitted successfully
 *       400:
 *         description: Invalid transaction
 *       409:
 *         description: Transaction already submitted
 *       500:
 *         description: Server error
 */
router.post('/transactions', apiKeyAuth, requirePermission('write'), async (req: Request, res: Response) => {
  try {
    const { cbor } = req.body;
    
    if (!cbor) {
      return res.status(400).json({ error: 'Transaction CBOR is required' });
    }
    
    // Submit transaction to Blockfrost
    const txHash = await blockfrostService.submitTransaction(cbor);
    
    res.status(201).json({
      transaction_hash: txHash
    });
  } catch (error: unknown) {
    logger.error('Error submitting transaction:', error);
    
    // Handle specific error cases
    const apiError = error as ApiError;
    if (apiError.status_code === 400) {
      res.status(400).json({ error: 'Invalid transaction' });
    } else if (apiError.status_code === 409) {
      res.status(409).json({ error: 'Transaction already submitted' });
    } else {
      res.status(500).json({ error: 'Failed to submit transaction' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/transactions/{txHash}:
 *   get:
 *     summary: Get transaction details
 *     description: Retrieve details of a transaction by its hash
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         description: Transaction hash
 *         schema:
 *           type: string
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/transactions/:txHash', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    
    // Get transaction details from Blockfrost
    const txInfo = await blockfrostService.getTransactionInfo(txHash);
    
    res.json(txInfo);
  } catch (error: unknown) {
    logger.error(`Error getting transaction info for ${req.params.txHash}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Transaction not found' });
    } else {
      res.status(500).json({ error: 'Failed to get transaction details' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/contracts/{contractAddress}/state:
 *   get:
 *     summary: Get contract state
 *     description: Retrieve the state of a Cardano smart contract
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: contractAddress
 *         required: true
 *         description: Contract address
 *         schema:
 *           type: string
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Contract state
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Server error
 */
router.get('/contracts/:contractAddress/state', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { contractAddress } = req.params;
    
    // For now, we'll just get the address info as a basic representation of contract state
    // In a more comprehensive implementation, we would parse contract-specific data
    const addressInfo = await blockfrostService.getAddressInfo(contractAddress);
    
    // Get UTXOs to represent the contract state
    const utxos = await blockfrostService.getAddressUtxos(contractAddress);
    
    res.json({
      address: contractAddress,
      balance: addressInfo.amount,
      utxo_count: utxos.length,
      utxos: utxos
    });
  } catch (error: unknown) {
    logger.error(`Error getting contract state for ${req.params.contractAddress}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Contract not found' });
    } else {
      res.status(500).json({ error: 'Failed to get contract state' });
    }
  }
});

/**
 * @swagger
 * /api/blockchain/tokens/{policyId}/{assetName}:
 *   get:
 *     summary: Get token information
 *     description: Retrieve information about a Cardano token
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: policyId
 *         required: true
 *         description: Token policy ID
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetName
 *         description: Token asset name
 *         schema:
 *           type: string
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Token information
 *       404:
 *         description: Token not found
 *       500:
 *         description: Server error
 */
router.get('/tokens/:policyId/:assetName?', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { policyId, assetName = '' } = req.params;
    
    // Format the asset ID (policyId + assetName in hex)
    const assetId = policyId + (assetName ? Buffer.from(assetName).toString('hex') : '');
    
    // Get asset info from Blockfrost
    const assetInfo = await blockfrostService.getAssetInfo(assetId);
    
    res.json(assetInfo);
  } catch (error: unknown) {
    logger.error(`Error getting token info for ${req.params.policyId}/${req.params.assetName}:`, error);
    
    const apiError = error as ApiError;
    if (apiError.status_code === 404) {
      res.status(404).json({ error: 'Token not found' });
    } else {
      res.status(500).json({ error: 'Failed to get token information' });
    }
  }
});

export default router;
