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
    components: {
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
