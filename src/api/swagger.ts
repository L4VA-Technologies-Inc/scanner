import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import config from '../config';

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cardano Blockchain Monitoring Service API',
      version: '1.0.0',
      description: 'API for monitoring Cardano blockchain addresses and smart contracts',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Webhooks', description: 'Webhook configuration management' },
      { name: 'Blockchain', description: 'Querying blockchain data' },
      { name: 'Deliveries', description: 'Webhook delivery history' },
      { name: 'Health', description: 'Service health checks' }
    ],
    components: {
      schemas: {
        WebhookDelivery: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Unique delivery ID' },
            webhook_id: { type: 'string', format: 'uuid', description: 'ID of the associated webhook' },
            event_id: { type: 'string', format: 'uuid', description: 'ID of the associated event' },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'RETRYING', 'FAILED', 'MAX_RETRIES_EXCEEDED'], 
              description: 'Current status of the delivery' 
            },
            attempt_count: { type: 'integer', description: 'Number of delivery attempts made' },
            status_code: { type: 'integer', nullable: true, description: 'HTTP status code received from the target URL (if applicable)' },
            response_body: { type: 'string', nullable: true, description: 'Response body received from the target URL (if applicable, might be truncated or JSON stringified)' },
            created_at: { type: 'string', format: 'date-time', description: 'Timestamp when the delivery was created' },
            completed_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the delivery was completed (succeeded or failed definitively)' },
            next_retry_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp for the next scheduled retry attempt (if status is RETRYING)' }
          }
        }
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API key authorization using the Authorization header with format: "Bearer YOUR_API_KEY"'
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: ['./src/api/routes/*.ts'] // Path to the API route files
};

const specs = swaggerJsdoc(swaggerOptions);

/**
 * Initialize Swagger documentation
 * @param app Express application
 */
export const setupSwagger = (app: Application): void => {
  // Serve Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }'
  }));
  
  // Serve Swagger specification as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default setupSwagger;
