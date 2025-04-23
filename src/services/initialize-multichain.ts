import { ChainRegistry } from "./chains/registry";
import { TokenRegistry } from "./tokens/registry";
import { PluginManager } from "../utils/plugin-manager";
import { StellarPlugin } from "../plugins/stellar-plugin";
import { EthereumPlugin } from "../plugins/ethereum-plugin";
import { MultiChainSplitService } from "./multichain-split.service";
import { createLogger } from "../utils/logger";
import { prisma } from "../lib/prisma";

const logger = createLogger("multichain-system");

// Singleton instances
let chainRegistry: ChainRegistry | null = null;
let tokenRegistry: TokenRegistry | null = null;
let pluginManager: PluginManager | null = null;
let multiChainSplitService: MultiChainSplitService | null = null;

/**
 * Initialize the multi-chain system and register plugins
 */
export async function initializeMultiChainSystem() {
  // Create registries if they don't exist
  if (!chainRegistry) {
    logger.debug("Creating new chain registry");
    chainRegistry = new ChainRegistry();
  }

  if (!tokenRegistry) {
    logger.debug("Creating new token registry");
    tokenRegistry = new TokenRegistry();
  }

  // Create plugin manager if it doesn't exist
  if (!pluginManager) {
    logger.debug("Creating new plugin manager");
    pluginManager = new PluginManager(chainRegistry, tokenRegistry);
  }

  // Register plugins
  logger.debug("Registering Stellar plugin");
  await pluginManager.registerPlugin(new StellarPlugin());
  logger.debug("Registering Ethereum plugin");
  await pluginManager.registerPlugin(new EthereumPlugin());

  // Create multi-chain split service if it doesn't exist
  if (!multiChainSplitService) {
    logger.debug("Creating new multi-chain split service");
    multiChainSplitService = new MultiChainSplitService(
      chainRegistry,
      tokenRegistry
    );
  }

  logger.info("Multi-chain system initialized");

  return {
    chainRegistry,
    tokenRegistry,
    pluginManager,
    multiChainSplitService,
  };
}

/**
 * Initialize chains and tokens in the database from the registries
 */
export async function initializeChainsAndTokens() {
  logger.debug("Initializing chains and tokens in database");

  if (!chainRegistry || !tokenRegistry) {
    throw new Error(
      "Chain and token registries not initialized. Call initializeMultiChainSystem first."
    );
  }

  // Get all chains from registry
  const chains = chainRegistry.getSupportedChains();

  // Insert or update chains in the database
  for (const chain of chains) {
    logger.debug(`Upserting chain: ${chain.id}`);
    await prisma.supportedChain.upsert({
      where: { id: chain.id },
      update: {
        name: chain.name,
        currency: chain.currency,
        rpcUrl: chain.rpcUrl,
        blockExplorer: chain.blockExplorer,
        testnet: chain.testnet,
        logoUrl: chain.logoUrl,
        enabled: chain.enabled,
      },
      create: {
        id: chain.id,
        name: chain.name,
        currency: chain.currency,
        rpcUrl: chain.rpcUrl,
        blockExplorer: chain.blockExplorer,
        testnet: chain.testnet,
        logoUrl: chain.logoUrl,
        enabled: chain.enabled,
      },
    });
  }

  // Get all tokens across all chains
  const tokens = tokenRegistry.getTokensByChain("all");

  // Insert or update tokens in the database
  for (const token of tokens) {
    logger.debug(`Upserting token: ${token.id} on chain ${token.chainId}`);
    await prisma.token.upsert({
      where: { id: token.id },
      update: {
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        type: token.type,
        chainId: token.chainId,
        contractAddress: token.contractAddress,
        logoUrl: token.logoUrl,
        enabled: token.enabled,
        exchangeRateSource: token.exchangeRateSource,
      },
      create: {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        type: token.type,
        chainId: token.chainId,
        contractAddress: token.contractAddress,
        logoUrl: token.logoUrl,
        enabled: token.enabled,
        exchangeRateSource: token.exchangeRateSource,
      },
    });
  }

  logger.info(
    `Database initialized with ${chains.length} chains and ${tokens.length} tokens`
  );
}

/**
 * Get the chain registry instance
 */
export function getChainRegistry(): ChainRegistry {
  if (!chainRegistry) {
    throw new Error(
      "Chain registry not initialized. Call initializeMultiChainSystem first."
    );
  }
  return chainRegistry;
}

/**
 * Get the token registry instance
 */
export function getTokenRegistry(): TokenRegistry {
  if (!tokenRegistry) {
    throw new Error(
      "Token registry not initialized. Call initializeMultiChainSystem first."
    );
  }
  return tokenRegistry;
}

/**
 * Get the plugin manager instance
 */
export function getPluginManager(): PluginManager {
  if (!pluginManager) {
    throw new Error(
      "Plugin manager not initialized. Call initializeMultiChainSystem first."
    );
  }
  return pluginManager;
}

/**
 * Get the multi-chain split service instance
 */
export function getMultiChainSplitService(): MultiChainSplitService {
  if (!multiChainSplitService) {
    throw new Error(
      "Multi-chain split service not initialized. Call initializeMultiChainSystem first."
    );
  }
  return multiChainSplitService;
}
