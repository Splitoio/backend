import { prisma } from "../lib/prisma";
import { CurrencyType } from "@prisma/client";
import { getPricingService } from "./pricing";
import { SUPPORTED_FIAT_CURRENCIES } from "../data/tokens";
import { getTokenRegistry, getChainRegistry } from "./initialize-multichain";
import { createLogger } from "../utils/logger";

const logger = createLogger("currency-service");

/**
 * Initialize fiat currencies in the database
 */
export async function initializeFiatCurrencies() {
  for (const currency of SUPPORTED_FIAT_CURRENCIES) {
    await prisma.fiatCurrency.upsert({
      where: { id: currency.id },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        coinGeckoId: currency.coinGeckoId,
        enabled: true,
      },
      create: {
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
        coinGeckoId: currency.coinGeckoId,
        enabled: true,
      },
    });
  }
}

/**
 * Sync a specific chain from registry to database
 * @param chainId The ID of the chain to sync
 */
export async function syncChainToDatabase(chainId: string) {
  try {
    const chainRegistry = getChainRegistry();
    const chain = chainRegistry.getChain(chainId);

    if (!chain) {
      logger.warn(`Chain ${chainId} not found in registry`);
      return false;
    }

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

    return true;
  } catch (error) {
    logger.error({ error, chainId }, "Failed to sync chain to database");
    return false;
  }
}

/**
 * Sync a specific token from registry to database
 * @param chainId The chain ID of the token
 * @param tokenId The ID of the token to sync
 */
export async function syncTokenToDatabase(chainId: string, tokenId: string) {
  try {
    const tokenRegistry = getTokenRegistry();
    const token = tokenRegistry.getToken(chainId, tokenId);

    if (!token) {
      logger.warn(`Token ${tokenId} on chain ${chainId} not found in registry`);
      return false;
    }

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

    return true;
  } catch (error) {
    logger.error(
      { error, chainId, tokenId },
      "Failed to sync token to database"
    );
    return false;
  }
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency The source currency (fiat or token)
 * @param toCurrency The target currency (fiat or token)
 * @param fromType The type of the source currency (FIAT or TOKEN)
 * @param toType The type of the target currency (FIAT or TOKEN)
 * @param fromChainId The chain ID of the source token (if fromType is TOKEN)
 * @param toChainId The chain ID of the target token (if toType is TOKEN)
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  try {
    const pricingService = getPricingService();

    // Get rate from pricing service
    const rate = await pricingService.getExchangeRate(
      fromCurrency.toLowerCase(),
      toCurrency.toLowerCase()
    );

    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);

    return 1;
  }
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // If currencies are the same, return the amount as is
  if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);

  return amount * rate;
}

/**
 * Get all supported fiat currencies
 */
export async function getSupportedFiatCurrencies() {
  return prisma.fiatCurrency.findMany({
    where: { enabled: true },
    orderBy: { id: "asc" },
  });
}

/**
 * Get all supported chains from database
 */
export async function getSupportedChains() {
  return prisma.supportedChain.findMany({
    where: { enabled: true },
    orderBy: { id: "asc" },
  });
}

/**
 * Get all tokens for a specific chain from database
 */
export async function getTokensByChain(chainId: string) {
  return prisma.token.findMany({
    where: {
      chainId,
      enabled: true,
    },
    orderBy: { symbol: "asc" },
  });
}

/**
 * Get all currencies (fiat and tokens) available for expenses
 */
export async function getAllCurrencies() {
  // Get fiat currencies
  const fiatCurrencies = await prisma.fiatCurrency.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      symbol: true,
    },
  });

  // Map fiat currencies to a common format
  const mappedFiat = fiatCurrencies.map((currency) => ({
    id: currency.id,
    name: currency.name,
    symbol: currency.symbol,
    type: CurrencyType.FIAT,
    chainId: null,
    logoUrl: null,
  }));

  const tokenRegistry = getTokenRegistry();

  const chains = tokenRegistry.getTokensByChain
    ? tokenRegistry.getTokensByChain("all")
    : [];

  return [...mappedFiat, ...chains];
}
