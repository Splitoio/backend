# Multi-Chain Support in Splito

Splito now supports multiple blockchain networks for settling debts. This document explains how the multi-chain system works and how to extend it.

## Architecture

The multi-chain system is designed with modularity and extensibility in mind. It consists of the following components:

1. **Chain Registry** - A registry of supported blockchain networks
2. **Token Registry** - A registry of supported tokens across different chains
3. **Plugin System** - A system for adding new chains and tokens
4. **Chain Providers** - Implementations of blockchain-specific functionality

## Supported Chains

Currently, the following chains are supported:

- **Stellar** - The original blockchain used by Splito
- **Ethereum** - Added as an example of extending to additional chains

## Adding a New Chain

To add a new blockchain network, you need to:

1. Create a new provider implementation in `src/services/chains/providers/`
2. Create a new plugin in `src/plugins/`
3. Register the plugin in `src/services/initialize-multichain.ts`

### Creating a Chain Provider

A chain provider must implement the `ChainProvider` interface, which includes methods for:

- Connecting to the blockchain
- Creating transactions
- Submitting transactions
- Validating addresses
- Estimating fees

The easiest way to create a new provider is to extend the `BaseChainProvider` class.

### Creating a Plugin

A plugin is responsible for registering chains and tokens with the system. It must implement the `Plugin` interface, which includes:

- `id` - A unique identifier for the plugin
- `name` - A human-readable name for the plugin
- `initialize` - A method to initialize the plugin

## User Flow

1. User selects a chain and token to settle with
2. User creates a settlement transaction
3. User signs the transaction with their wallet
4. User submits the signed transaction
5. System confirms the transaction on the blockchain

## API Endpoints

The following API endpoints are available for multi-chain functionality:

- `GET /api/multichain/chains` - Get available chains
- `GET /api/multichain/tokens/:chainId` - Get available tokens for a chain
- `GET /api/multichain/accounts` - Get user's chain accounts
- `POST /api/multichain/accounts` - Add a chain account for the user
- `POST /api/multichain/settlements` - Create a settlement transaction
- `POST /api/multichain/settlements/submit` - Submit a signed settlement transaction

## Database Schema

The multi-chain system uses the following database models:

- `SupportedChain` - Information about supported chains
- `Token` - Information about supported tokens
- `ChainAccount` - User accounts on different chains
- `SettlementTransaction` - Records of settlement transactions
