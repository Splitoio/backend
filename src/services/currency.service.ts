import { prisma } from "../lib/prisma";
import { CurrencyType } from "@prisma/client";
import { getPricingService } from "./pricing";

// Supported fiat currencies
export const FIAT_CURRENCIES = [
  { id: "USD", name: "US Dollar", symbol: "$" },
  { id: "EUR", name: "Euro", symbol: "€" },
  { id: "GBP", name: "British Pound", symbol: "£" },
  { id: "INR", name: "Indian Rupee", symbol: "₹" },
  { id: "JPY", name: "Japanese Yen", symbol: "¥" },
  { id: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { id: "AUD", name: "Australian Dollar", symbol: "A$" },
];

/**
 * Initialize fiat currencies in the database
 */
export async function initializeFiatCurrencies() {
  for (const currency of FIAT_CURRENCIES) {
    await prisma.fiatCurrency.upsert({
      where: { id: currency.id },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        enabled: true,
      },
      create: {
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
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
  toCurrency: string,
  fromType: CurrencyType = CurrencyType.FIAT,
  toType: CurrencyType = CurrencyType.FIAT,
  fromChainId?: string,
  toChainId?: string
): Promise<number> {
  try {
    // For fiat to fiat, check database first
    if (fromType === CurrencyType.FIAT && toType === CurrencyType.FIAT) {
      const existingRate = await prisma.exchangeRate.findUnique({
        where: {
          baseCurrencyId_quoteCurrencyId: {
            baseCurrencyId: fromCurrency,
            quoteCurrencyId: toCurrency,
          },
        },
      });

      // If rate exists and is less than 24 hours old, use it
      if (
        existingRate &&
        new Date().getTime() - existingRate.timestamp.getTime() <
          24 * 60 * 60 * 1000
      ) {
        return existingRate.rate;
      }
    }

    // Use pricing service for updated rate
    const pricingService = getPricingService();
    let rate: number;

    // Transform currency IDs for pricing service if needed
    const fromCurrencyId =
      fromType === CurrencyType.TOKEN
        ? `${fromCurrency.toLowerCase()}`
        : fromCurrency.toLowerCase();

    const toCurrencyId =
      toType === CurrencyType.TOKEN
        ? `${toCurrency.toLowerCase()}`
        : toCurrency.toLowerCase();

    // Get rate from pricing service
    rate = await pricingService.getExchangeRate(fromCurrencyId, toCurrencyId);

    // For fiat to fiat, store in database
    if (fromType === CurrencyType.FIAT && toType === CurrencyType.FIAT) {
      await prisma.exchangeRate.upsert({
        where: {
          baseCurrencyId_quoteCurrencyId: {
            baseCurrencyId: fromCurrency,
            quoteCurrencyId: toCurrency,
          },
        },
        update: {
          rate,
          source: "coingecko",
          timestamp: new Date(),
        },
        create: {
          baseCurrencyId: fromCurrency,
          quoteCurrencyId: toCurrency,
          rate,
          source: "coingecko",
          timestamp: new Date(),
        },
      });
    }

    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);

    // Fallback to 1:1 if no rate found
    return 1;
  }
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  fromType: CurrencyType = CurrencyType.FIAT,
  toType: CurrencyType = CurrencyType.FIAT,
  fromChainId?: string,
  toChainId?: string
): Promise<number> {
  // If currencies are the same, return the amount as is
  if (
    fromCurrency.toLowerCase() === toCurrency.toLowerCase() &&
    fromType === toType
  ) {
    return amount;
  }

  const rate = await getExchangeRate(
    fromCurrency,
    toCurrency,
    fromType,
    toType,
    fromChainId,
    toChainId
  );

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

  // Get tokens from token registry
  const tokenRegistry = (
    await import("./initialize-multichain")
  ).getTokenRegistry();
  const chains = tokenRegistry.getTokensByChain
    ? tokenRegistry.getTokensByChain("all")
    : [];

  // Combine and return
  return [...mappedFiat, ...chains];
}
