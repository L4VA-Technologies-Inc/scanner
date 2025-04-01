-- Create extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Monitored Addresses Table
CREATE TABLE IF NOT EXISTS monitored_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT true
);

-- Monitored Contracts Table
CREATE TABLE IF NOT EXISTS monitored_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  contract_type VARCHAR(50),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT true
);

-- Transaction Events Table
CREATE TABLE IF NOT EXISTS transaction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash VARCHAR(255) NOT NULL,
  block_height BIGINT,
  block_time TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  address_id UUID REFERENCES monitored_addresses(id),
  contract_id UUID REFERENCES monitored_contracts(id),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  secret VARCHAR(255),
  event_types JSONB NOT NULL,
  headers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT true
);

-- Webhook Deliveries Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id),
  event_id UUID NOT NULL REFERENCES transaction_events(id),
  attempt_count INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monitored_addresses_address ON monitored_addresses(address);
CREATE INDEX IF NOT EXISTS idx_monitored_contracts_address ON monitored_contracts(address);
CREATE INDEX IF NOT EXISTS idx_transaction_events_tx_hash ON transaction_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transaction_events_address_id ON transaction_events(address_id);
CREATE INDEX IF NOT EXISTS idx_transaction_events_contract_id ON transaction_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_transaction_events_processed ON transaction_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);
