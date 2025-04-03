import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http'; // Import Server from http
import logger from '../utils/logger';

let wss: WebSocketServer | null = null;

export const initializeWebSocket = (server: Server): void => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');

    ws.on('message', (message) => {
      // Handle incoming messages if needed (e.g., client requests)
      logger.debug(`Received WebSocket message: ${message}`);
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    // Send a welcome message or initial state if needed
    ws.send(JSON.stringify({ type: 'info', message: 'Connected to webhook activity stream' }));
  });

  wss.on('error', (error) => {
    logger.error('WebSocket Server error:', error);
  });

  logger.info('WebSocket server initialized and listening');
};

export const broadcastWebhookActivity = (activity: any): void => {
  if (!wss) {
    logger.warn('WebSocket server not initialized, cannot broadcast activity');
    return;
  }

  const message = JSON.stringify({ type: 'webhook_activity', data: activity });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, (error) => {
        if (error) {
          logger.error('Failed to send WebSocket message:', error);
        }
      });
    }
  });
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wss;
};
