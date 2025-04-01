# Cardano Blockchain Scanner: Monitoring Documentation

This document explains how the Cardano Blockchain Scanner monitors different types of blockchain objects and activities, detailing the mechanisms, strategies, and implementation for each monitored entity.

## Table of Contents
1. [Monitoring Architecture](#monitoring-architecture)
2. [Wallets/Addresses](#walletsaddresses)
3. [Smart Contracts](#smart-contracts) 
4. [Tokens and Assets](#tokens-and-assets)
5. [ADA Staking and Delegation](#ada-staking-and-delegation)
6. [Governance Activities](#governance-activities)
7. [DeFi Protocol Interactions](#defi-protocol-interactions)
8. [Metadata Transactions](#metadata-transactions)
9. [NFT-specific Activities](#nft-specific-activities)
10. [DEX Operations](#dex-operations)
11. [Collateralized Assets](#collateralized-assets)
12. [Multi-signature Transactions](#multi-signature-transactions)
13. [Time-locked Contracts](#time-locked-contracts)
14. [Oracle Data Feeds](#oracle-data-feeds)
15. [Custom Event Monitoring](#custom-event-monitoring)
16. [Additional Cardano-Specific Monitoring](#additional-cardano-specific-monitoring)

## Monitoring Architecture

The Cardano Scanner's monitoring architecture is based on the following key components:

1. **Polling-based Monitoring**: The scanner polls the blockchain at regular intervals (default: 30 seconds) through the Blockfrost API.

2. **Event Detection System**: Identifies specific events based on transaction structures, smart contract activity, and other blockchain operations.

3. **Webhook Notification System**: Delivers event notifications to registered endpoints for real-time integration with external systems.

4. **Transaction Deduplication**: Maintains caches of processed transactions to prevent duplicate event notifications.

5. **Monitoring Database**: Stores configurations for addresses, contracts, and other monitored entities.

## Wallets/Addresses

### Implementation Details
- **Mechanism**: The scanner polls the Blockfrost API every 30 seconds to check for new transactions involving monitored addresses.
- **Cache System**: Uses an in-memory cache (`lastProcessedTxs.addresses`) to prevent duplicate processing of transactions.
- **Event Types**: 
  - `TRANSACTION_RECEIVED` - Address receives any transaction
  - `TRANSACTION_SENT` - Address sends any transaction
  - `ADA_RECEIVED` - Address receives ADA
  - `ADA_SENT` - Address sends ADA
  - `TOKEN_RECEIVED` - Address receives tokens
  - `TOKEN_SENT` - Address sends tokens

### Database Storage
Addresses are stored in the `monitored_addresses` table with the following key fields:
- `id`: Unique identifier
- `address`: Cardano wallet address
- `name`: User-defined name for this address
- `is_active`: Boolean indicating if monitoring is active
- `last_checked_at`: Timestamp of last check

### Monitoring Process
1. Retrieve all active addresses from the database
2. For each address, fetch recent transactions from Blockfrost
3. Filter out previously processed transactions
4. Analyze transaction inputs and outputs to determine event types
5. Create events and trigger webhook notifications

## Smart Contracts

### Implementation Details
- **Mechanism**: Similar to wallet monitoring, contracts are checked every 30 seconds for new interactions.
- **Detection**: Identifies transactions that interact with the contract address or script hash.
- **Event Types**:
  - `CONTRACT_EXECUTION` - Contract is executed/called
  - `CONTRACT_CREATION` - New contract is deployed (if monitored)
  - `CONTRACT_UPDATE` - Contract parameters are updated
  - `CONTRACT_TERMINATION` - Contract is terminated (if applicable)

### Database Storage
Contracts are stored in the `monitored_contracts` table with:
- `id`: Unique identifier
- `address`: Contract address
- `policy_id`: Associated policy ID (if applicable)
- `script_hash`: Script hash identifier
- `is_active`: Boolean indicating if monitoring is active

### Monitoring Process
1. Retrieve all active contracts from the database
2. Check for transactions involving the contract address
3. Analyze transaction inputs, outputs, and transaction metadata
4. Determine the nature of the contract interaction
5. Create appropriate events and trigger webhook notifications

## Tokens and Assets

### Implementation Details
- **Mechanism**: Tokens are monitored through address transactions that contain non-ADA assets.
- **Detection**: Identifies transactions with token operations in their inputs/outputs.
- **Event Types**:
  - `TOKEN_MINT` - New tokens are minted
  - `TOKEN_BURN` - Tokens are burned
  - `TOKEN_TRANSFER` - Tokens are transferred between addresses
  - `TOKEN_RECEIVED` - Monitored address receives tokens
  - `TOKEN_SENT` - Monitored address sends tokens

### Token Identification
Tokens are identified by their:
- `policy_id`: The policy that controls the token
- `asset_name`: The name of the asset within the policy
- `fingerprint`: A unique identifier for the token

### Monitoring Process
1. Monitor transactions for relevant addresses and contracts
2. Identify token-specific operations in transaction inputs/outputs
3. Check against policies of interest (if configured)
4. Generate appropriate token events
5. Deliver webhook notifications

## ADA Staking and Delegation

### Implementation Details
- **Mechanism**: Monitors certificate transactions related to staking and delegation.
- **Detection**: Identifies transactions with stake certificates.
- **Event Types**:
  - `STAKE_REGISTRATION` - New stake key registration
  - `STAKE_DEREGISTRATION` - Stake key is deregistered
  - `DELEGATION_CHANGE` - Address delegates to a new stake pool
  - `REWARD_WITHDRAWAL` - Staking rewards are withdrawn

### Monitoring Process
1. Monitor transactions for stake addresses of interest
2. Identify certificate operations in transactions
3. Extract stake pool information for delegation events
4. Calculate reward amounts for withdrawal events
5. Generate staking-related events
6. Deliver webhook notifications

## Governance Activities

### Implementation Details
- **Mechanism**: Monitors Catalyst voting and governance-related transactions.
- **Detection**: Identifies transactions with governance metadata and certificates.
- **Event Types**:
  - `VOTE_REGISTRATION` - Registration for voting
  - `VOTE_CAST` - Vote is submitted
  - `GOVERNANCE_ACTION` - Other governance activities

### Monitoring Process
1. Check transaction metadata for governance-related tags (usually 61284-61286)
2. Monitor specific addresses associated with governance activities
3. Analyze certificate sections for governance operations
4. Generate appropriate governance events
5. Deliver webhook notifications

## DeFi Protocol Interactions

### Implementation Details
- **Mechanism**: Monitors interactions with known DeFi smart contracts.
- **Detection**: Identifies transactions to/from DeFi protocol addresses and contracts.
- **Event Types**:
  - `DEFI_DEPOSIT` - Assets deposited to DeFi protocol
  - `DEFI_WITHDRAWAL` - Assets withdrawn from DeFi protocol
  - `DEFI_SWAP` - Token swap operation
  - `DEFI_YIELD_HARVEST` - Yield/rewards claimed
  - `DEFI_LIQUIDATION` - Position liquidation

### Protocol Identification
The scanner maintains a database of known DeFi protocol contracts with:
- Protocol name
- Contract addresses
- Transaction patterns

### Monitoring Process
1. Monitor transactions involving known DeFi contract addresses
2. Match transaction patterns to specific DeFi operations
3. Extract operation details (amounts, assets involved)
4. Generate appropriate DeFi event
5. Deliver webhook notifications

## Metadata Transactions

### Implementation Details
- **Mechanism**: Monitors transaction metadata for specific tags and content.
- **Detection**: Extracts and analyzes the metadata section of transactions.
- **Event Types**:
  - `METADATA_DETECTED` - Transaction contains monitored metadata tag
  - `SPECIFIC_METADATA_EVENT` - Custom events based on metadata content

### Metadata Tags
Common metadata tags monitored include:
- 721: NFT metadata (CIP-25)
- 20: Message metadata
- 674: Token metadata registry
- Customizable tags for specific use cases

### Monitoring Process
1. Extract metadata from transactions
2. Check for tags of interest
3. Parse and validate metadata content
4. Generate metadata-specific events
5. Deliver webhook notifications

## NFT-specific Activities

### Implementation Details
- **Mechanism**: Special case of token monitoring focused on NFTs (tokens with quantity 1).
- **Detection**: Identifies NFT-specific operations in transactions.
- **Event Types**:
  - `NFT_MINT` - New NFT is created
  - `NFT_TRANSFER` - NFT changes ownership
  - `NFT_BURN` - NFT is burned/destroyed
  - `NFT_RECEIVED` - Monitored address receives an NFT
  - `NFT_SENT` - Monitored address sends an NFT

### NFT Identification
NFTs are identified as tokens with:
- Quantity = 1
- Unique asset name under a policy
- Associated metadata (usually in metadata tag 721)

### Monitoring Process
1. Monitor token operations in transactions
2. Identify tokens with quantity = 1 (NFTs)
3. Extract and parse NFT metadata when available
4. Generate NFT-specific events
5. Deliver webhook notifications

## DEX Operations

### Implementation Details
- **Mechanism**: Monitors transactions involving decentralized exchange contracts.
- **Detection**: Identifies DEX-specific transaction patterns.
- **Event Types**:
  - `DEX_SWAP` - Token swap operation
  - `DEX_LIQUIDITY_ADD` - Liquidity provision to a pool
  - `DEX_LIQUIDITY_REMOVE` - Liquidity withdrawal from a pool
  - `DEX_ORDER_PLACE` - Order placement (for order book DEXes)
  - `DEX_ORDER_FILL` - Order execution

### DEX Identification
The scanner maintains configurations for known DEXes with:
- DEX name and type (AMM, order book)
- Contract addresses
- Transaction patterns

### Monitoring Process
1. Monitor transactions involving known DEX contracts
2. Match transaction structure to DEX operation patterns
3. Extract operation details (tokens, amounts, prices)
4. Generate DEX-specific events
5. Deliver webhook notifications

## Collateralized Assets

### Implementation Details
- **Mechanism**: Monitors transactions related to lending protocols and collateralized positions.
- **Detection**: Identifies transactions with specific patterns for collateral operations.
- **Event Types**:
  - `COLLATERAL_DEPOSIT` - Assets used as collateral
  - `COLLATERAL_WITHDRAWAL` - Collateral reclaimed
  - `LOAN_CREATION` - New loan created against collateral
  - `LOAN_REPAYMENT` - Loan repaid
  - `COLLATERAL_LIQUIDATION` - Collateral liquidated

### Monitoring Process
1. Monitor transactions involving lending protocol contracts
2. Analyze transaction structure to determine collateral operations
3. Extract operation details (collateral amount, loan amount)
4. Generate collateral-related events
5. Deliver webhook notifications

## Multi-signature Transactions

### Implementation Details
- **Mechanism**: Monitors transactions involving multi-signature scripts.
- **Detection**: Identifies transactions with native script witnesses.
- **Event Types**:
  - `MULTISIG_CREATION` - New multisig script registered
  - `MULTISIG_TRANSACTION` - Transaction using multisig authorization
  - `MULTISIG_UPDATE` - Script parameters updated

### Multisig Identification
Multi-signature scripts are identified by:
- Script hash
- Script type (typically "all", "any", or "atLeast")
- Required signatures

### Monitoring Process
1. Analyze transaction witnesses section
2. Identify native script usage
3. Extract script details and verification pattern
4. Generate multisig-related events
5. Deliver webhook notifications

## Time-locked Contracts

### Implementation Details
- **Mechanism**: Monitors transactions with time-locking constraints.
- **Detection**: Identifies transactions with time-locked scripts or time-based validity intervals.
- **Event Types**:
  - `TIMELOCK_CREATION` - New time-locked contract created
  - `TIMELOCK_ACTIVATION` - Time-locked contract becomes valid
  - `TIMELOCK_EXECUTION` - Time conditions met and contract executed
  - `TIMELOCK_EXPIRATION` - Time-locked contract expires

### Timelock Identification
Time-locked contracts are identified by:
- Validity intervals in the transaction
- Time-based script conditions
- Invalid-before and invalid-after fields

### Monitoring Process
1. Analyze transaction validity intervals
2. Check script conditions for time-based constraints
3. Compare current blockchain tip with timelock conditions
4. Generate timelock-related events when conditions change
5. Deliver webhook notifications

## Oracle Data Feeds

### Implementation Details
- **Mechanism**: Monitors transactions from known oracle providers.
- **Detection**: Identifies transactions with oracle metadata or to/from oracle contracts.
- **Event Types**:
  - `ORACLE_UPDATE` - New data point published
  - `ORACLE_AGGREGATION` - Multiple data points aggregated

### Oracle Identification
Oracles are identified by:
- Provider address
- Metadata format
- Data types provided (price feeds, weather data, etc.)

### Monitoring Process
1. Monitor transactions from known oracle addresses
2. Extract data points from transaction metadata
3. Validate and parse oracle data
4. Generate oracle update events
5. Deliver webhook notifications

## Custom Event Monitoring

The Cardano Scanner supports custom event monitoring through:

1. **Configurable Metadata Tags**: Monitor specific metadata tags important to your application.

2. **Custom Script Detection**: Configure detection for specific script patterns.

3. **Pattern Matching Rules**: Define custom rules to match transaction patterns.

4. **Event Aggregation**: Combine multiple basic events into higher-level custom events.

5. **Filtering Rules**: Set conditions to filter events based on thresholds, addresses, or other criteria.

### Implementation
Custom monitoring can be configured through:
- API endpoints for monitoring configuration
- Database tables for persistent monitoring rules
- Webhook event filtering

## Additional Cardano-Specific Monitoring

### Plutus Script Execution

### Implementation Details
- **Mechanism**: Monitors execution of Plutus scripts and their validation results.
- **Detection**: Identifies transactions with Plutus script execution.
- **Event Types**:
  - `SCRIPT_EXECUTION` - Plutus script is executed
  - `SCRIPT_VALIDATION_SUCCESS` - Script validated successfully
  - `SCRIPT_VALIDATION_FAILURE` - Script validation failed
  - `SCRIPT_EXECUTION_UNITS` - Resource consumption metrics for script execution

### Monitoring Process
1. Monitor transactions with Plutus script witnesses
2. Extract execution units consumed (CPU/memory)
3. Record validation result
4. Generate script-related events
5. Deliver webhook notifications

### Native Token Policies

### Implementation Details
- **Mechanism**: Monitors the creation and execution of native token policies.
- **Detection**: Identifies transactions with policy script execution or new policy creation.
- **Event Types**:
  - `POLICY_CREATION` - New token policy is created
  - `POLICY_EXECUTION` - Token policy script is executed
  - `POLICY_COMPLETION` - Token policy becomes permanently locked (if time-based)

### Monitoring Process
1. Monitor transactions with minting operations
2. Extract and analyze policy scripts
3. Identify policy time locks and constraints
4. Generate policy-related events
5. Deliver webhook notifications

### Hydra Head Operations

### Implementation Details
- **Mechanism**: Monitors Layer 2 Hydra Head operations on mainnet.
- **Detection**: Identifies transactions related to Hydra Head openings, closings, and contested operations.
- **Event Types**:
  - `HYDRA_HEAD_INIT` - New Hydra Head initialized
  - `HYDRA_HEAD_COMMIT` - Funds committed to a Hydra Head
  - `HYDRA_HEAD_COLLECT` - Funds collected from a Hydra Head
  - `HYDRA_HEAD_CONTEST` - Contested outcome in a Hydra Head

### Monitoring Process
1. Monitor transactions involving Hydra Head scripts
2. Analyze transaction structure to determine operation type
3. Extract Head participants and committed funds
4. Generate Hydra-related events
5. Deliver webhook notifications

### Interoperability Operations

### Implementation Details
- **Mechanism**: Monitors cross-chain and sidechain operations.
- **Detection**: Identifies transactions related to sidechains or interoperability solutions.
- **Event Types**:
  - `SIDECHAIN_COMMIT` - Assets committed to a sidechain
  - `SIDECHAIN_RELEASE` - Assets released from a sidechain
  - `BRIDGE_OPERATION` - Cross-chain bridge activity
  - `INTEROP_EVENT` - Other interoperability events

### Monitoring Process
1. Monitor transactions involving known bridge contracts
2. Identify sidechain-specific metadata or patterns
3. Analyze transaction structure to determine operation type
4. Generate interoperability-related events
5. Deliver webhook notifications

### Protocol Parameter Updates

### Implementation Details
- **Mechanism**: Monitors changes to Cardano protocol parameters.
- **Detection**: Identifies parameter updates in the blockchain's ledger state.
- **Event Types**:
  - `PROTOCOL_PARAMETER_UPDATE` - Protocol parameters are updated
  - `EPOCH_BOUNDARY` - New epoch begins
  - `HARD_FORK_INITIATION` - Hard fork process begins
  - `PROTOCOL_VERSION_CHANGE` - Protocol version is changed

### Monitoring Process
1. Monitor blockchain metadata and epoch boundaries
2. Check for parameter update proposals and their adoption
3. Compare parameter values before/after updates
4. Generate parameter update events
5. Deliver webhook notifications

### UTXO Set Analysis

### Implementation Details
- **Mechanism**: Monitors changes to the UTXO set for specific addresses.
- **Detection**: Tracks UTXO creation, consumption, and fragmentation.
- **Event Types**:
  - `UTXO_CREATION` - New UTXO is created
  - `UTXO_CONSUMPTION` - UTXO is consumed
  - `UTXO_FRAGMENTATION` - Address UTXO set becomes fragmented
  - `UTXO_CONSOLIDATION` - Address UTXO set is consolidated

### Monitoring Process
1. Track the UTXO set for monitored addresses
2. Calculate fragmentation metrics
3. Identify consolidation transactions
4. Generate UTXO-related events
5. Deliver webhook notifications

### Marlowe Contract Execution

### Implementation Details
- **Mechanism**: Monitors Marlowe smart contracts (financial contracts DSL).
- **Detection**: Identifies transactions involving Marlowe contract execution.
- **Event Types**:
  - `MARLOWE_CONTRACT_CREATION` - New Marlowe contract created
  - `MARLOWE_CONTRACT_STEP` - Marlowe contract state transition
  - `MARLOWE_CONTRACT_COMPLETION` - Marlowe contract reaches terminal state
  - `MARLOWE_PAYMENT` - Payment made from a Marlowe contract

### Monitoring Process
1. Monitor transactions with Marlowe validation scripts
2. Extract and parse Marlowe contract state
3. Identify state transitions and payments
4. Generate Marlowe-related events
5. Deliver webhook notifications

### RealFi and Identity Operations

### Implementation Details
- **Mechanism**: Monitors operations related to real-world assets and identity.
- **Detection**: Identifies transactions with Atala PRISM or RealFi-related operations.
- **Event Types**:
  - `IDENTITY_CREATION` - New identity is registered
  - `CREDENTIAL_ISSUANCE` - Verifiable credential is issued
  - `CREDENTIAL_VERIFICATION` - Credential is verified
  - `REALFI_ASSET_TOKENIZATION` - Real-world asset is tokenized

### Monitoring Process
1. Monitor transactions with identity-related metadata
2. Identify credential operations using standard formats
3. Track RealFi asset tokenization and transfers
4. Generate identity and RealFi events
5. Deliver webhook notifications

---

This documentation provides an overview of how different blockchain objects are monitored. For implementation details, refer to the source code in `/src/blockchain/monitor.ts` and related files.
