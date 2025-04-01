-- Create database if it doesn't exist
CREATE DATABASE cardano_scanner;

-- Connect to the database
\c cardano_scanner;

-- Create tables (the tables below will be created by our migration scripts, but this gives you an idea)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS monitored_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS monitored_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  contract_type VARCHAR(255),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  event_types TEXT[] NOT NULL,
  headers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES api_keys(id),
  is_active BOOLEAN DEFAULT TRUE
);
