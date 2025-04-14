/**
 * Interface for pricing service providers
 */
export interface PricingService {
  /**
   * Get the current price of a token or currency in terms of a base currency
   * @param id The token/currency identifier
   * @param baseCurrency The base currency for the price (e.g., 'usd', 'eur')
   */
  getPrice(id: string, baseCurrency: string): Promise<number>;

  /**
   * Get the current prices of multiple tokens/currencies in terms of a base currency
   * @param ids Array of token/currency identifiers
   * @param baseCurrency The base currency for the prices (e.g., 'usd', 'eur')
   */
  getPrices(
    ids: string[],
    baseCurrency: string
  ): Promise<Record<string, number>>;

  /**
   * Get historical price of a token/currency at a specific date
   * @param id The token/currency identifier
   * @param baseCurrency The base currency for the price (e.g., 'usd', 'eur')
   * @param date The date for which to get the historical price
   */
  getHistoricalPrice(
    id: string,
    baseCurrency: string,
    date: Date
  ): Promise<number>;

  /**
   * Get exchange rate between two currencies/tokens
   * @param fromId The source currency/token identifier
   * @param toId The target currency/token identifier
   */
  getExchangeRate(fromId: string, toId: string): Promise<number>;
}

/**
 * Base class for pricing services with common utility methods
 */
export abstract class BasePricingService implements PricingService {
  abstract getPrice(id: string, baseCurrency: string): Promise<number>;
  abstract getPrices(
    ids: string[],
    baseCurrency: string
  ): Promise<Record<string, number>>;
  abstract getHistoricalPrice(
    id: string,
    baseCurrency: string,
    date: Date
  ): Promise<number>;

  /**
   * Get exchange rate between two currencies/tokens
   * Default implementation uses the ratio of prices in a common base currency (USD)
   */
  async getExchangeRate(fromId: string, toId: string): Promise<number> {
    if (fromId === toId) return 1;

    // If one of the currencies is USD, we can optimize
    if (fromId.toLowerCase() === "usd") {
      const toPrice = await this.getPrice(toId, "usd");
      return 1 / toPrice;
    }

    if (toId.toLowerCase() === "usd") {
      return await this.getPrice(fromId, "usd");
    }

    // Otherwise, get both prices in USD and calculate the ratio
    const [fromPrice, toPrice] = await Promise.all([
      this.getPrice(fromId, "usd"),
      this.getPrice(toId, "usd"),
    ]);

    if (!toPrice || toPrice === 0) {
      throw new Error(`Could not get valid price for ${toId}`);
    }

    return fromPrice / toPrice;
  }
}
