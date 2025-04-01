import { Request } from 'express';

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  is_active: boolean;
}

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

export interface MonitoredAddress {
  id: string;
  address: string;
  name: string | null;
  description: string | null;
  last_checked_at: Date | null;
  created_at: Date;
  created_by: string;
  is_active: boolean;
}

export interface MonitoredContract {
  id: string;
  address: string;
  name: string | null;
  description: string | null;
  contract_type: string | null;
  last_checked_at: Date | null;
  created_at: Date;
  created_by: string;
  is_active: boolean;
}

export interface TransactionEvent {
  id: string;
  tx_hash: string;
  block_height: number | null;
  block_time: Date | null;
  event_type: string;
  event_data: Record<string, any>;
  address_id: string | null;
  contract_id: string | null;
  processed: boolean;
  created_at: Date;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  event_types: string[];
  headers: Record<string, string> | null;
  created_at: Date;
  created_by: string;
  is_active: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  attempt_count: number;
  status: WebhookDeliveryStatus;
  status_code: number | null;
  response_body: string | null;
  next_retry_at: Date | null;
  created_at: Date;
  completed_at: Date | null;
}

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  RETRYING = 'retrying',
  MAX_RETRIES_EXCEEDED = 'max_retries_exceeded'
}

// Explicitly match the exact string literals that BlockFrostAPI expects
export type CardanoNetwork = 'mainnet' | 'preprod' | 'preview' | 'testnet';

export interface CardanoTransaction {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: {
    unit: string;
    quantity: string;
  }[];
  fees: string;
  deposit: string;
  size: number;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  utxo_count: number;
  withdrawal_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_count: number;
  redeemer_count: number;
  valid_contract: boolean;
  metadata?: Record<string, any>;
}

export interface BlockfrostTransactionResponse {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: {
    unit: string;
    quantity: string;
  }[];
  fees: string;
  deposit: string;
  size: number;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  utxo_count: number;
  withdrawal_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

export interface CardanoAddress {
  address: string;
  amount: {
    unit: string;
    quantity: string;
  }[];
  stake_address: string | null;
  type: string;
  script: boolean;
}

export interface CardanoUtxo {
  tx_hash: string;
  tx_index: number;
  output_index: number;
  amount: {
    unit: string;
    quantity: string;
  }[];
  block: string;
  data_hash?: string;
  inline_datum?: string;
  reference_script_hash?: string;
}

export interface CardanoAsset {
  asset: string;
  policy_id: string;
  asset_name: string;
  fingerprint: string;
  quantity: string;
  initial_mint_tx_hash: string;
  mint_or_burn_count: number;
  onchain_metadata?: Record<string, any>;
  metadata?: Record<string, any>;
}

export enum EventType {
  TRANSACTION_RECEIVED = 'transaction_received',
  TRANSACTION_SENT = 'transaction_sent',
  ADA_RECEIVED = 'ada_received',
  ADA_SENT = 'ada_sent',
  TOKEN_RECEIVED = 'token_received',
  TOKEN_SENT = 'token_sent',
  TOKEN_MINTED = 'token_minted',
  TOKEN_BURNED = 'token_burned',
  NFT_RECEIVED = 'nft_received',
  NFT_SENT = 'nft_sent',
  CONTRACT_EXECUTED = 'contract_executed',
  STAKE_DELEGATED = 'stake_delegated',
  REWARD_RECEIVED = 'reward_received',
  GOVERNANCE_VOTE = 'governance_vote',
  DEFI_INTERACTION = 'defi_interaction',
  DEX_INTERACTION = 'dex_interaction',
  COLLATERAL_LOCKED = 'collateral_locked',
  COLLATERAL_RELEASED = 'collateral_released',
  ORACLE_UPDATE = 'oracle_update',
  METADATA_ADDED = 'metadata_added',
  MULTI_SIG_TRANSACTION = 'multi_sig_transaction',
  TIME_LOCKED_EXECUTION = 'time_locked_execution'
}

export interface ApiError extends Error {
  status_code?: number;
  response?: {
    data?: any;
    status?: number;
  };
}
