import { query } from '../db';
import crypto from 'crypto';
import logger from './logger';

/**
 * Utility to create a new API key
 */
async function createApiKey(): Promise<void> {
  try {
    // Generate a random API key
    const apiKey = 'key-' + crypto.randomBytes(16).toString('hex');
    // Match the format in the auth middleware
    const keyHash = 'placeholder-hash-' + apiKey;
    
    // Insert the key into the database
    await query(
      'INSERT INTO api_keys (name, key_hash, permissions) VALUES ($1, $2, $3) RETURNING id',
      ['API Key - ' + new Date().toISOString(), keyHash, '{admin}']
    );
    
    logger.info('=================================');
    logger.info('New API Key created successfully');
    logger.info(`API Key: ${apiKey}`);
    logger.info('=================================');
    logger.info('Use this key in the Authorization header as:');
    logger.info(`Bearer ${apiKey}`);
    logger.info('=================================');
    
  } catch (error) {
    logger.error('Failed to create API key:', error);
  } finally {
    process.exit(0);
  }
}

// Connect to the database and create a key
import '../config'; // Ensure .env is loaded
import pool from '../db';

pool.connect()
  .then(() => {
    logger.info('Database connected, creating API key...');
    return createApiKey();
  })
  .catch(error => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });
