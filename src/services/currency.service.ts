import { prisma } from "../lib/prisma";
import { CurrencyType } from "@prisma/client";
import { getPricingService } from "./pricing";
import { SUPPORTED_FIAT_CURRENCIES } from "../data/tokens";
import { getTokenRegistry } from "./initialize-multichain";

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
