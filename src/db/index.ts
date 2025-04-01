import { Pool } from 'pg';
import config from '../config';
import logger from '../utils/logger';

// Create a new database pool with the connection string from configuration
const pool = new Pool({
  connectionString: config.database.url,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err.stack);
  } else {
    logger.info('Database connected successfully');
  }
});

// Export the query function for use in other modules
export const query = (text: string, params: any[]): Promise<any> => {
  logger.debug('Executing query:', { text, params });
  return pool.query(text, params);
};

export default pool;
