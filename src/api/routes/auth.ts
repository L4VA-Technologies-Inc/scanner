import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../../db';
import logger from '../../utils/logger';
import { apiKeyAuth, requirePermission } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';

const router = Router();

/**
 * Generate a new API key
 * POST /api/auth/keys
 */
router.post('/keys', apiKeyAuth, requirePermission('admin'), async (req: Request, res: Response) => {
  try {
    const { name, permissions, expiresAt } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Generate a random API key
    const apiKey = 'key_' + crypto.randomBytes(24).toString('hex');
    
    // Hash the API key for storage
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(apiKey, saltRounds);
    
    // Insert the new API key
    const result = await query(
      `INSERT INTO api_keys (name, key_hash, permissions, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, permissions, created_at, expires_at`,
      [
        name,
        keyHash,
        JSON.stringify(permissions || ['read']),
        expiresAt || null,
        (req as AuthenticatedRequest).apiKey?.id
      ]
    );
    
    // Return the new API key (only shown once)
    const apiKeyData = result.rows[0];
    logger.info(`API key created: ${apiKeyData.id}`);
    
    res.status(201).json({
      ...apiKeyData,
      key: apiKey // Only returned once
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * List all API keys
 * GET /api/auth/keys
 */
router.get('/keys', apiKeyAuth, requirePermission('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, permissions, created_at, expires_at, last_used_at, is_active
       FROM api_keys
       ORDER BY created_at DESC`,
      []
    );
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * Revoke an API key
 * DELETE /api/auth/keys/:keyId
 */
router.delete('/keys/:keyId', apiKeyAuth, requirePermission('admin'), async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    
    // Don't allow deleting the key that's making the request
    if (keyId === (req as AuthenticatedRequest).apiKey?.id) {
      return res.status(400).json({ error: 'Cannot revoke the key being used for authentication' });
    }
    
    // Mark the key as inactive (don't actually delete it)
    const result = await query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id',
      [keyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    logger.info(`API key revoked: ${keyId}`);
    res.status(204).end();
  } catch (error) {
    logger.error(`Error revoking API key ${req.params.keyId}:`, error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

export default router;
