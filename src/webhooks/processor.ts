import axios from 'axios';
import crypto from 'crypto';
import { query } from '../db';
import logger from '../utils/logger';
import config from '../config';
import { TransactionEvent, Webhook, WebhookDelivery, WebhookDeliveryStatus } from '../types';

/**
 * Process a transaction event by sending it to all matching webhooks
 */
export const processEvent = async (eventId: string): Promise<void> => {
  try {
    // Get event details
    const eventResult = await query(
      'SELECT * FROM transaction_events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      logger.error(`Event not found: ${eventId}`);
      return;
    }
    
    const event: TransactionEvent = eventResult.rows[0];
    
    // Mark event as processed
    await query(
      'UPDATE transaction_events SET processed = true WHERE id = $1',
      [eventId]
    );
    
    // Find all active webhooks that match this event type
    const webhookResult = await query(
      "SELECT * FROM webhooks WHERE is_active = true AND event_types @> ARRAY[$1]::text[]",
      [event.event_type]
    );
    
    const webhooks: Webhook[] = webhookResult.rows;
    
    if (webhooks.length === 0) {
      logger.debug(`No matching webhooks found for event ${eventId} (${event.event_type})`);
      return;
    }
    
    logger.info(`Processing event ${eventId} (${event.event_type}) for ${webhooks.length} webhooks`);
    
    // Queue webhook deliveries
    for (const webhook of webhooks) {
      await queueWebhookDelivery(webhook, event);
    }
  } catch (error) {
    logger.error(`Error processing event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Queue a webhook delivery for processing
 */
export const queueWebhookDelivery = async (webhook: Webhook, event: TransactionEvent): Promise<string> => {
  try {
    const result = await query(
      `INSERT INTO webhook_deliveries 
       (webhook_id, event_id, attempt_count, status, next_retry_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        webhook.id,
        event.id,
        0,
        WebhookDeliveryStatus.PENDING,
        new Date() // Schedule for immediate delivery
      ]
    );
    
    const deliveryId = result.rows[0].id;
    
    // Process immediately (in a real system, this might be handled by a queue)
    setImmediate(() => {
      deliverWebhook(deliveryId).catch(error => {
        logger.error(`Error delivering webhook ${deliveryId}:`, error);
      });
    });
    
    return deliveryId;
  } catch (error) {
    logger.error(`Error queueing webhook delivery for webhook ${webhook.id}, event ${event.id}:`, error);
    throw error;
  }
};

/**
 * Deliver a webhook to its endpoint
 */
export const deliverWebhook = async (deliveryId: string): Promise<void> => {
  try {
    // Get delivery details
    const deliveryResult = await query(
      `SELECT wd.*, w.url, w.secret, w.headers, te.* 
       FROM webhook_deliveries wd
       JOIN webhooks w ON wd.webhook_id = w.id
       JOIN transaction_events te ON wd.event_id = te.id
       WHERE wd.id = $1`,
      [deliveryId]
    );
    
    if (deliveryResult.rows.length === 0) {
      logger.error(`Webhook delivery not found: ${deliveryId}`);
      return;
    }
    
    const delivery = deliveryResult.rows[0];
    
    // Update status to in progress
    await query(
      'UPDATE webhook_deliveries SET status = $1, attempt_count = attempt_count + 1 WHERE id = $2',
      [WebhookDeliveryStatus.IN_PROGRESS, deliveryId]
    );
    
    // Prepare payload
    const payload = {
      id: delivery.event_id,
      type: delivery.event_type,
      timestamp: new Date().toISOString(),
      data: delivery.event_data
    };
    
    // Sign payload if webhook has a secret
    let signature = '';
    if (delivery.secret) {
      signature = crypto
        .createHmac('sha256', delivery.secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    }
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Cardano-Scanner-Webhook/1.0',
      'X-Webhook-ID': delivery.webhook_id,
      'X-Event-ID': delivery.event_id,
      'X-Event-Type': delivery.event_type,
      'X-Delivery-ID': deliveryId,
      'X-Delivery-Timestamp': new Date().toISOString()
    };
    
    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }
    
    // Add custom headers if defined
    if (delivery.headers) {
      Object.assign(headers, delivery.headers);
    }
    
    try {
      // Send the webhook
      const response = await axios.post(delivery.url, payload, { headers, timeout: 10000 });
      
      // Update delivery status to succeeded
      await query(
        `UPDATE webhook_deliveries 
         SET status = $1, status_code = $2, response_body = $3, completed_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [WebhookDeliveryStatus.SUCCEEDED, response.status, JSON.stringify(response.data), deliveryId]
      );
      
      logger.info(`Webhook delivery ${deliveryId} succeeded with status ${response.status}`);
    } catch (error) {
      // Type the error properly to fix TS18046 errors
      const axiosError = error as { response?: { status: number, data: any }, message?: string };
      const statusCode = axiosError.response?.status || 0;
      const responseBody = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : axiosError.message;
      
      // Check if we should retry
      const shouldRetry = delivery.attempt_count < config.webhook.maxRetries;
      
      if (shouldRetry) {
        // Calculate next retry time with exponential backoff
        const retryDelayMs = config.webhook.retryDelay * Math.pow(2, delivery.attempt_count - 1);
        const nextRetryAt = new Date(Date.now() + retryDelayMs);
        
        // Update delivery status to retrying
        await query(
          `UPDATE webhook_deliveries 
           SET status = $1, status_code = $2, response_body = $3, next_retry_at = $4 
           WHERE id = $5`,
          [WebhookDeliveryStatus.RETRYING, statusCode, responseBody, nextRetryAt, deliveryId]
        );
        
        logger.warn(`Webhook delivery ${deliveryId} failed, scheduled for retry at ${nextRetryAt.toISOString()}`);
      } else {
        // Update delivery status to max retries exceeded
        await query(
          `UPDATE webhook_deliveries 
           SET status = $1, status_code = $2, response_body = $3, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $4`,
          [WebhookDeliveryStatus.MAX_RETRIES_EXCEEDED, statusCode, responseBody, deliveryId]
        );
        
        logger.error(`Webhook delivery ${deliveryId} failed after ${delivery.attempt_count} attempts`);
      }
    }
  } catch (error) {
    logger.error(`Error processing webhook delivery ${deliveryId}:`, error);
    
    // Update delivery status to failed
    await query(
      `UPDATE webhook_deliveries 
       SET status = $1, response_body = $2, completed_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [WebhookDeliveryStatus.FAILED, (error as Error).message || 'Unknown error', deliveryId]
    );
  }
};

/**
 * Process pending and retrying webhook deliveries
 * This function should be called periodically to handle retries
 */
export const processWebhookQueue = async (): Promise<void> => {
  try {
    // Find deliveries that need to be processed
    const result = await query(
      `SELECT id FROM webhook_deliveries 
       WHERE (status = $1 OR (status = $2 AND next_retry_at <= CURRENT_TIMESTAMP))
       LIMIT 100`,
      [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRYING]
    );
    
    const deliveries = result.rows;
    
    if (deliveries.length === 0) {
      return;
    }
    
    logger.info(`Processing ${deliveries.length} webhook deliveries`);
    
    // Process each delivery
    for (const delivery of deliveries) {
      deliverWebhook(delivery.id).catch(error => {
        logger.error(`Error delivering webhook ${delivery.id}:`, error);
      });
    }
  } catch (error) {
    logger.error('Error processing webhook queue:', error);
  }
};

/**
 * Start the webhook queue processor
 * This runs on a continuous interval, checking for pending webhooks
 */
export const startWebhookProcessor = (): void => {
  const POLLING_INTERVAL = 5000; // 5 seconds
  
  logger.info('Starting webhook processor');
  
  // Set up interval for continuous processing
  setInterval(async () => {
    try {
      await processWebhookQueue();
    } catch (error) {
      logger.error('Error in webhook processor:', error);
    }
  }, POLLING_INTERVAL);
};

export default {
  processEvent,
  queueWebhookDelivery,
  deliverWebhook,
  processWebhookQueue,
  startWebhookProcessor
};
