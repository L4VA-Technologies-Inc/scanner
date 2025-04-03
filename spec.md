# Cardano Blockchain Monitoring Service Specification

## Overview
A daemon service that monitors specified wallets and smart contracts on the Cardano blockchain, triggers webhook notifications for configured events, and provides an API for interacting with the Cardano blockchain.

## Technology Stack
- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL for data persistence
- **Blockchain Interface**: Cardano Serialization Library, BlockFrost API
- **API Framework**: Express.js
- **Authentication**: JWT-based authentication with API keys
- **Testing**: Jest for unit and integration tests
- **Deployment**: Docker and Docker Compose
- **Monitoring**: Prometheus and Grafana

## Core Components

### 1. Blockchain Monitor
- Real-time monitoring of specified Cardano addresses and smart contracts
- Transaction detection and filtering based on configurable criteria
- Smart contract event detection (e.g., minting, burning of tokens, contract execution)
- Historical transaction indexing for newly added wallets/contracts

### 2. Webhook System
- Registration of webhook endpoints for specific blockchain events
- Configurable retry mechanisms for failed webhook deliveries
- Webhook payload customization
- Webhook event history and status tracking
- Signature verification for secure webhook delivery

### 3. API Gateway
- RESTful API design with OpenAPI/Swagger documentation
- API key management (creation, rotation, revocation)
- Rate limiting and usage tracking
- Comprehensive error handling

### 4. Admin Dashboard (Optional Future Enhancement)
- Web interface for service configuration
- Webhook testing and monitoring
- API key management
- Analytics and reporting

## Feature Specifications

### Blockchain Monitoring
- **Address Monitoring**: Track transactions, balance changes, and UTxO states for specific addresses
- **Smart Contract Monitoring**: Listen for contract executions, parameter changes, and other contract-specific events
- **Token Monitoring**: Track minting, burning, and transfers of native tokens
- **ADA Staking and Delegation**: Monitor staking activities, delegation changes to stake pools, and reward distributions
- **Governance Activities**: Track voting on Catalyst projects and participation in other governance mechanisms
- **DeFi Protocol Activities**: Monitor interactions with DeFi protocols like lending, borrowing, liquidity provision, and yield farming
- **Metadata Transactions**: Track and parse transaction metadata which is used for various applications
- **NFT-specific Monitoring**: Specialized monitoring for NFT marketplace activities, royalty payments, and collection statistics
- **DEX Activities**: Track swaps, liquidity additions/removals on decentralized exchanges
- **Collateralized Assets**: Monitor assets used as collateral in lending and borrowing protocols
- **Multi-signature Transactions**: Track transactions requiring multiple signatures to execute
- **Time-locked Contracts**: Monitor contracts with time-based execution conditions
- **Oracle Data Feeds**: Track data feed updates from blockchain oracles
- **Filtering Capabilities**: Filter events by transaction type, amount, involved addresses, etc.

### Webhook System
- **Event Registration**: Register webhook URLs to be triggered for specific events
- **Delivery Guarantees**: Implement retry logic with exponential backoff
- **Security**: Sign webhook payloads for verification
- **Payload Templates**: Allow customization of webhook payload structure
- **Delivery Logs**: Maintain logs of webhook delivery attempts and responses

### API Features
- **Transaction Operations**: Create, sign, and submit transactions
- **Wallet Operations**: Query wallet balances, transaction history, and UTxO states
- **Smart Contract Operations**: Query contract state, submit contract transactions
- **Token Operations**: Query token metadata, mint/burn tokens (if authorized)
- **Analytics**: Query blockchain statistics relevant to monitored addresses/contracts

### API Key Management
- **Key Generation**: Secure generation of API keys
- **Access Control**: Granular permissions for different API endpoints
- **Usage Tracking**: Monitor and limit API usage by key
- **Key Rotation**: Support for secure key rotation
- **Revocation**: Immediate revocation of compromised keys

## API Endpoints

### Authentication
- `POST /api/auth/keys` - Generate new API key
- `DELETE /api/auth/keys/:keyId` - Revoke API key
- `GET /api/auth/keys` - List active API keys

### Monitoring Configuration
- `POST /api/monitoring/addresses` - Add address to monitor
- `DELETE /api/monitoring/addresses/:addressId` - Remove address from monitoring
- `GET /api/monitoring/addresses` - List monitored addresses
- `POST /api/monitoring/contracts` - Add contract to monitor
- `DELETE /api/monitoring/contracts/:contractId` - Remove contract from monitoring
- `GET /api/monitoring/contracts` - List monitored contracts

### Webhook Management
- `POST /api/webhooks` - Register new webhook
- `PUT /api/webhooks/:webhookId` - Update webhook configuration
- `DELETE /api/webhooks/:webhookId` - Delete webhook
- `GET /api/webhooks` - List registered webhooks
- `POST /api/webhooks/:webhookId/test` - Test webhook delivery

### Blockchain Operations
- `GET /api/blockchain/addresses/:address/balance` - Get address balance
- `GET /api/blockchain/addresses/:address/transactions` - Get address transactions
- `GET /api/blockchain/addresses/:address/utxos` - Get address UTxOs
- `POST /api/blockchain/transactions` - Submit transaction
- `GET /api/blockchain/transactions/:txHash` - Get transaction details
- `GET /api/blockchain/contracts/:contractAddress/state` - Get contract state
- `GET /api/blockchain/tokens/:policyId/:assetName` - Get token information

### Deliveries
- `GET /api/deliveries` - Retrieve historical webhook delivery records

### Health Check
- `GET /health` - Health status check for the service

## WebSocket Endpoints

See `asyncapi.yaml` in the project root for a detailed specification of WebSocket messages.

## API Documentation

### Swagger Documentation
- The API is fully documented using OpenAPI/Swagger 3.0 specifications
- Swagger UI is available at `http://localhost:<PORT>/api-docs`
- Each endpoint is fully documented with:
  - Request parameters and body schemas
  - Response formats and status codes
  - Authentication requirements
  - Example requests and responses (where applicable)
- API is organized into functional tags:
  - Blockchain - endpoints for interacting with the Cardano blockchain
  - Webhooks - endpoints for managing webhook registrations and delivery
  - Monitoring - endpoints for monitoring system health and statistics

### API Routes

#### Blockchain Operations
- `GET /api/blockchain/addresses/:address/balance` - Get address balance
- `GET /api/blockchain/addresses/:address/transactions` - List address transactions
- `GET /api/blockchain/addresses/:address/utxos` - List address UTXOs
- `POST /api/blockchain/transactions` - Submit transaction
- `GET /api/blockchain/transactions/:txHash` - Get transaction details
- `GET /api/blockchain/contracts/:contractAddress/state` - Get contract state
- `GET /api/blockchain/tokens/:policyId/:assetName` - Get token information

#### Deliveries
*   **Endpoint:** `/api/deliveries`
*   **Method:** `GET`
*   **Description:** Retrieve historical webhook delivery records. Supports filtering by `webhookId`, `eventId`, and `status`, as well as pagination (`limit`, `offset`) and sorting (`sortBy`, `sortOrder`).
*   **Authentication:** Requires API Key (`Bearer` token in `Authorization` header).
*   **Query Parameters:**
    *   `webhookId` (uuid, optional)
    *   `eventId` (uuid, optional)
    *   `status` (enum, optional: PENDING, IN_PROGRESS, SUCCEEDED, RETRYING, FAILED, MAX_RETRIES_EXCEEDED)
    *   `limit` (integer, optional, default: 20, max: 100)
    *   `offset` (integer, optional, default: 0)
    *   `sortBy` (enum, optional, default: created_at): created_at, completed_at, next_retry_at, attempt_count
    *   `sortOrder` (enum, optional, default: DESC): ASC, DESC
*   **Response (Success - 200 OK):**
    ```json
    {
      "data": [
        // Array of WebhookDelivery objects (schema defined in Swagger/OpenAPI)
        {
          "id": "uuid-delivery-1",
          "webhook_id": "uuid-webhook-1",
          "event_id": "uuid-event-1",
          "status": "SUCCEEDED",
          "attempt_count": 1,
          "status_code": 200,
          "response_body": "{\"message\": \"received\"}",
          "created_at": "2023-10-27T10:00:00.000Z",
          "completed_at": "2023-10-27T10:00:01.000Z",
          "next_retry_at": null
        }
        // ... more delivery objects
      ],
      "totalCount": 150 // Total matching records
    }
    ```
*   **Response (Error - 400 Bad Request):** Invalid query parameters.
*   **Response (Error - 401 Unauthorized):** Missing or invalid API key.
*   **Response (Error - 500 Internal Server Error):** Server-side error during processing.

## Documentation

The project includes the following documentation files:

- **spec.md**: This file - contains the overall specifications and architecture of the system
- **mistakes.md**: Records issues encountered during development and their solutions
- **monitoring.md**: Detailed documentation of how different blockchain entities are monitored
  - Covers monitoring mechanisms for addresses, contracts, tokens, staking, governance, etc.
  - Explains event detection and notification processes
  - Provides implementation details for various monitoring scenarios

## Installation and Running

### Prerequisites
- Node.js v16 or higher
- npm v7 or higher
- PostgreSQL database
- Blockfrost API key for accessing the Cardano blockchain

### Quick Start
1. Clone the repository
2. Create a `.env` file in the root directory with the required configuration (see Configuration section)
3. Run the start script:
   ```bash
   ./start.sh
   ```

The start script will:
- Check for required dependencies
- Install npm packages if needed
- Create a default `.env` file if one doesn't exist
- Verify and set up the database
- Run database migrations
- Start the application in development mode with automatic reloading

### Manual Setup
If you prefer to set up the application manually:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Run database migrations:
   ```bash
   node dist/db/migrate.js
   ```

4. Start the application:
   ```bash
   npm run dev    # Development mode with auto-reload
   # OR
   npm start      # Production mode
   ```

### Accessing the API
Once running, you can access:
- API endpoints at `http://localhost:3000/api/v1/...`
- Swagger documentation at `http://localhost:3000/api-docs`

## Testing

### Automated Testing
- Unit tests with Jest for individual components
- Integration tests for API endpoints
- Blockchain interaction tests using the Cardano testnet or preprod environment
- Webhook delivery tests with mock endpoints

### Manual Testing
- A comprehensive testing guide (testing.md) is provided for manual testing of the service
- Includes instructions for testing with Cardano preprod wallets
- Step-by-step procedures for testing address monitoring, transaction retrieval, and webhook notifications
- Troubleshooting information for common issues

## Implementation Details

### Blockchain Integration
- Integration with the Blockfrost API for Cardano blockchain data
- Support for multiple Cardano networks (mainnet, preprod, preview, testnet)
- Proper type definitions for all Blockfrost API responses
- Robust error handling for network failures and API limits

### API Error Handling
- Consistent error response format across all endpoints
- Detailed error messages with appropriate HTTP status codes
- Type-safe error handling throughout the application

### Database Schema
- Relational database schema with proper foreign key relationships
- Migration utilities for database schema evolution
- Connection pooling for efficient database access

## Configuration

The service can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development, production) | development |
| PORT | HTTP server port | 3000 |
| DATABASE_URL | PostgreSQL connection string | postgres://postgres:postgres@localhost:5432/cardano_scanner |
| JWT_SECRET | Secret for JWT token signing | default_jwt_secret_for_development_only |
| BLOCKFROST_API_KEY | API key for Blockfrost | - |
| BLOCKFROST_NETWORK | Cardano network (mainnet, preprod, preview, testnet) | mainnet |
| LOG_LEVEL | Logging level | info |
| WEBHOOK_MAX_RETRIES | Maximum webhook delivery attempts | 5 |
| WEBHOOK_RETRY_DELAY | Delay between webhook retries (ms) | 30000 |

## Security Considerations
- API keys should be stored securely (hashed, not plaintext)
- All API endpoints must enforce authentication
- Implement rate limiting to prevent abuse
- Encrypt sensitive data in the database
- Implement proper input validation to prevent injection attacks
- Sign webhook payloads to ensure authenticity
- Implement secure key rotation mechanisms
- Regular security audits and vulnerability scanning

## Data Storage
- Store monitoring configurations in the database
- Maintain webhook registration and delivery history
- Cache relevant blockchain data for performance
- Implement database migration system for schema updates

## Deployment and Scaling
- Containerized deployment with Docker
- Horizontal scaling capabilities
- Database replication for high availability
- Load balancing for API endpoints

## Monitoring and Alerting
- System health monitoring
- Performance metrics collection
- Alert on service disruptions or blockchain anomalies
- Regular backup of critical data

## Future Enhancements
- GraphQL API support
- WebSocket notifications for real-time updates
- Machine learning for transaction anomaly detection
- Support for additional Cardano features as they are released
- Integration with other blockchain networks

## Authentication and Authorization

### API Key Management
- API keys are used for authentication
- Each key can have specific permissions (read, write, admin)
- Initial admin API key is created during first run
- Additional API keys can be generated using the utility script:
  ```
  npx ts-node src/utils/create-api-key.ts
  ```
- API keys should be included in requests as:
  ```
  Authorization: Bearer <api-key>
  ```
