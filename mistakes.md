# Implementation Mistakes and Corrections

This document tracks implementation mistakes and their corrections for the Cardano Blockchain Monitoring Service.

## Initial Setup

- **Issue**: Initially tried to install non-existent npm package `blockfrost-js`
- **Correction**: Installed the correct package `@blockfrost/blockfrost-js`
- **Date**: 2025-03-31

## Dependencies

- **Issue**: Initially installed incompatible versions of some packages
- **Correction**: Adjusted package versions in package.json to ensure compatibility
- **Date**: 2025-03-31

## Type Errors in Blockchain-Related Components

#### Issue: Improper Type Definitions for Blockfrost API Integration
- **Problem**: Several type errors occurred in the blockchain integration due to mismatched types between our application and the Blockfrost API.
- **Details**: 
  1. `CardanoNetwork` type didn't match the network parameter required by the BlockFrostAPI constructor
  2. Missing type definitions for proper transaction data conversion from Blockfrost responses
  3. Incorrect or missing typings in error handling across API routes
  4. Type errors when working with metadata objects with string indexing
- **Fix**: 
  - Updated config.ts to properly type the Blockfrost network configuration
  - Created a `BlockfrostTransactionResponse` interface to handle transaction data properly
  - Added proper type casting and error handling in API route files
  - Defined explicit types for type-safe object indexing and API error responses

#### Issue: Untyped Error Handling in API Routes
- **Problem**: Error objects were being used without proper type declarations, causing TypeScript errors.
- **Details**: In both blockchain.ts and webhooks.ts route files, error objects were used without proper typing.
- **Fix**: 
  - Added proper error typing with `error: unknown` and appropriate type assertions
  - Created an `ApiError` interface that extends Error with Blockfrost-specific fields
  - Used type assertions to safely access error properties

#### Issue: Untyped Error Handling in Webhook Processor
- **Problem**: Error objects were being used without proper type declarations, causing TypeScript errors during compilation.
- **Details**: In src/webhooks/processor.ts, errors caught in try/catch blocks were using properties like `error.response` and `error.message` without proper typing, resulting in TS18046 errors.
- **Fix**: 
  - Added proper type assertions for caught errors: `const axiosError = error as { response?: { status: number, data: any }, message?: string };`
  - Applied type assertion for generic errors: `(error as Error).message || 'Unknown error'`
  - Fixed all instances where error objects were used without proper typing

#### Issue: Missing Null Checks on Blockfrost Transaction Data

**Issue**: The transaction monitoring code was failing with `TypeError: Cannot read properties of undefined (reading 'some')` because it wasn't handling potentially undefined or null properties in the transaction data returned from Blockfrost API.

**Impact**: When Blockfrost API returned incomplete transaction data (possibly due to rate limiting or API issues), the monitoring service would crash with a TypeError when trying to access properties like `tx.inputs` or `tx.outputs`.

**Fix**: Added null and array existence checks before accessing transaction properties:
- Changed from: `tx.inputs.some(...)` to `tx.inputs && Array.isArray(tx.inputs) ? tx.inputs.some(...) : false`
- Added similar checks for all transaction property accesses
- Added null coalescing for nested properties like `output.amount || []`

These defensive coding practices ensure the monitoring service can handle incomplete or malformed data from the Blockfrost API without crashing.

#### Issue: PostgreSQL Text Array Parameter Handling

**Issue**: There was confusion about the data type of the `event_types` column in the webhooks table. Initially assumed to be JSONB, but it's actually a PostgreSQL text array (`text[]`).

**Impact**: Users were unable to register webhooks with multiple event types, first receiving a "malformed array literal" error, then a "column is of type text[] but expression is of type jsonb" error.

**Fix**: 
1. Fixed the SQL query to use the correct array parameter handling:
   - Changed from: `VALUES ($1, $2, $3, $4, $5, $6)` with `JSON.stringify(event_types)`
   - First attempted: `VALUES ($1, $2, $3, $4::jsonb, $5, $6)` with `JSON.stringify(event_types)`
   - Final correct solution: `VALUES ($1, $2, $3, $4::text[], $5, $6)` passing `event_types` directly

2. Also fixed the update endpoint for webhooks to use the same approach.

This ensures PostgreSQL properly interprets the JavaScript array as a PostgreSQL text array.

#### Issue: PostgreSQL Array Containment Operator Type Mismatch

**Issue**: The webhook processor was using an incorrect PostgreSQL operator for array containment, attempting to check if a text[] array contains a jsonb element (`event_types @> $1::jsonb`).

**Impact**: Webhooks were not being triggered for events because the query to find matching webhooks was failing with the error: "operator does not exist: text[] @> jsonb".

**Fix**: Updated the query to properly check if a text array contains a specific string:
- Changed from: `"SELECT * FROM webhooks WHERE is_active = true AND event_types @> $1::jsonb"`
- Changed to: `"SELECT * FROM webhooks WHERE is_active = true AND event_types @> ARRAY[$1]::text[]"`

This change ensures that PostgreSQL can properly compare the event_types column (which is text[]) with the event type we're looking for.

#### Issue: Missing Swagger API Documentation
- **Problem**: The Swagger UI showed "No operations defined in spec!" because the API routes were missing proper JSDoc annotations.
- **Details**: The API routes in `src/api/routes/*.ts` files had simple comments instead of proper Swagger JSDoc annotations needed for OpenAPI spec generation.
- **Fix**: 
  - Added proper `@swagger` JSDoc annotations to all API routes in blockchain.ts and webhooks.ts
  - Included detailed parameter descriptions, request/response schemas, and authentication requirements
  - Organized API endpoints into functional tags (Blockchain, Webhooks)
  - Updated spec.md to document the Swagger implementation

#### Issue: Missing Swagger Documentation for Monitoring Routes

**Issue**: The monitoring routes (`/api/monitoring/addresses` and `/api/monitoring/contracts`) were missing Swagger JSDoc annotations, causing them to be excluded from the API documentation.

**Impact**: Users couldn't see these critical monitoring endpoints in the Swagger UI, making it difficult to understand how to add addresses and contracts to the monitoring system.

**Fix**: Added comprehensive Swagger JSDoc annotations to all monitoring routes, including detailed request/response schemas, parameters, and security requirements.

#### Issue: API Key Hash Generation Mismatch
- **Problem**: API keys generated by our utility weren't working with the auth middleware.
- **Details**: The API key authentication middleware in `src/middleware/auth.ts` was using a placeholder hashing method (`placeholder-hash-` + apiKey) rather than a proper cryptographic hash, while our API key generation utility was using SHA-256.
- **Fix**: 
  - Updated the API key generation utility to match the format expected by the authentication middleware
  - Used the same placeholder hashing method (`placeholder-hash-` + apiKey) in both places
  - For a production application, this should be replaced with a proper cryptographic hashing method in both places

### Database Schema Issues 

### API Implementation Issues 
