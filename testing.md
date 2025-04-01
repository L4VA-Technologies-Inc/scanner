# Testing Guide for Cardano Blockchain Scanner

This guide will walk you through the process of testing the Cardano blockchain scanner using the Cardano preprod testnet. We'll focus on basic operations to verify functionality and integration with the Blockfrost API.

## Prerequisites

1. **Blockfrost API Key**: You need a Blockfrost API key with access to the preprod network. Obtain one from [blockfrost.io](https://blockfrost.io).

2. **Preprod Wallet**: You'll need a Cardano wallet on the preprod testnet. You can create one using:
   - [Nami Wallet](https://namiwallet.io/) (browser extension)
   - [Eternl](https://eternl.io/) (browser extension)
   - [Yoroi](https://yoroi-wallet.com/) (browser extension)
   - [Typhon](https://typhonwallet.io/) (browser extension)

3. **Test ADA**: Fund your preprod wallet with test ADA. You can get test ADA from:
   - [Preprod Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)

## Environment Setup

1. Create a `.env` file with the following configuration:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cardano_scanner
JWT_SECRET=your_jwt_secret
BLOCKFROST_API_KEY=your_preprod_api_key
BLOCKFROST_NETWORK=preprod
LOG_LEVEL=debug
```

2. Start the scanner application:
```
npm run dev
```

## Testing Scenarios

### 1. Monitor a Wallet Address

First, let's add a wallet address to monitor.

1. Get your preprod wallet address from your wallet interface.

2. Create a monitored address via API:
```bash
curl -X POST http://localhost:3000/api/v1/monitoring/addresses \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "address": "addr_test1...",
    "name": "Test Preprod Wallet"
  }'
```

3. Verify the address was added:
```bash
curl -X GET http://localhost:3000/api/v1/monitoring/addresses \
  -H "x-api-key: your_api_key"
```

### 2. Test Address Balance Query

Retrieve balance information for your monitored address:

```bash
curl -X GET http://localhost:3000/api/v1/blockchain/addresses/addr_test1.../balance \
  -H "x-api-key: your_api_key"
```

Expected response structure:
```json
{
  "address": "addr_test1...",
  "balance": {
    "lovelace": "1000000",
    "assets": []
  }
}
```

### 3. Test Transaction Retrieval

View recent transactions for your address:

```bash
curl -X GET http://localhost:3000/api/v1/blockchain/addresses/addr_test1.../transactions \
  -H "x-api-key: your_api_key"
```

Expected response structure:
```json
{
  "transactions": [
    {
      "tx_hash": "hash1...",
      "block_height": 123456,
      "block_time": 1633455555,
      "output_amount": [
        {
          "unit": "lovelace",
          "quantity": "1000000"
        }
      ]
    }
  ]
}
```

### 4. Test UTXOs Retrieval

Retrieve UTXOs for your address:

```bash
curl -X GET http://localhost:3000/api/v1/blockchain/addresses/addr_test1.../utxos \
  -H "x-api-key: your_api_key"
```

Expected response structure:
```json
{
  "utxos": [
    {
      "tx_hash": "hash1...",
      "output_index": 0,
      "amount": [
        {
          "unit": "lovelace",
          "quantity": "1000000"
        }
      ]
    }
  ]
}
```

### 5. Create and Test a Webhook

1. Register a webhook to receive notifications:
```bash
curl -X POST http://localhost:3000/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-id",
    "event_types": ["transaction.received", "transaction.sent"],
    "secret": "your_webhook_secret"
  }'
```

2. Send a test transaction (requires sending test ADA):
   - Open your wallet interface
   - Send a small amount of test ADA to another address
   - The scanner should detect this transaction and trigger the webhook

3. Check webhook delivery status:
```bash
curl -X GET http://localhost:3000/api/v1/webhooks \
  -H "x-api-key: your_api_key"
```

## Testing With Sample Preprod Addresses

Here are some known preprod addresses you can monitor to see active transactions:

1. **Preprod Pool Address**: `addr_test1vqyqvq83mk7pzxzc5u8h6vyqkqv9kxhgmkm39u75kz88gg56z695`
2. **Test Faucet Address**: `addr_test1qpvv6qx8a8hd25kd9s2wgm8rh3naxhwcgcwlx2ykqvezrgcncu4m4an3tlt30y6vu9vullp4uygf90vrj5kmva6ajrqvvfh98`

## Troubleshooting

1. **API Errors**: Check the application logs for detailed error messages:
```
tail -f logs/scanner.log
```

2. **Blockfrost Connection Issues**:
   - Verify your API key is valid and has access to the preprod network
   - Check network connectivity to Blockfrost API endpoints

3. **Transaction Not Detected**:
   - Verify the blockchain monitor service is running (`npm run monitor`)
   - Check if the address is correctly registered for monitoring
   - Ensure transaction confirmations (wait for multiple blocks)

4. **Webhook Not Triggered**:
   - Verify webhook URL is accessible
   - Check webhook delivery logs in the application
   - Ensure the event type matches what you registered

## Advanced Testing

For more advanced testing, you can use the Cardano CLI to create transactions with specific metadata or smart contract interactions. Refer to the [Cardano CLI documentation](https://docs.cardano.org/cardano-components/cardano-cli/) for details.
