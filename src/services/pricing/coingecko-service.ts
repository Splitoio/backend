import axios from "axios";
import { BasePricingService } from "./service-interface";
import { logger } from "../../utils/logger";

// In-memory cache to avoid excessive API calls
type CacheEntry = {
  timestamp: number;
  value: any;
};

export class CoingeckoService extends BasePricingService {
  private readonly API_BASE_URL = "https://api.coingecko.com/api/v3";
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly TOKEN_ID_MAP: Record<string, string> = {
    eth: "ethereum",
    xlm: "stellar",
    sol: "solana",
    usdc: "usd-coin",
    usdt: "tether",
    apt: "aptos",
  };
  private cache: Record<string, CacheEntry> = {};

  constructor(private apiKey?: string) {
    super();
  }

  /**
   * Convert common token symbol to Coingecko ID
   */
  private getCoingeckoId(id: string): string {
    // If it's a fiat currency, format it for Coingecko
    if (
      ["usd", "eur", "jpy", "gbp", "aud", "cad", "chf", "cny", "inr"].includes(
        id.toLowerCase()
      )
    ) {
      return id.toLowerCase();
    }

    // Check if we have a mapping for this symbol
    const tokenId = this.TOKEN_ID_MAP[id.toLowerCase()];
    return tokenId || id.toLowerCase();
  }

  /**
   * Get data from cache or fetch from API
   */
  private async cachedFetch(
    url: string,
    params?: Record<string, any>
  ): Promise<any> {
    const cacheKey = url + (params ? JSON.stringify(params) : "");
    const cached = this.cache[cacheKey];

    // Return cached value if it's still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    // Add API key if available
    const requestParams = { ...params };
    if (this.apiKey) {
      requestParams.x_cg_demo_api_key = this.apiKey;
    }

    // Fetch fresh data
    try {
      const response = await axios.get(url, { params: requestParams });
      const data = response.data;

      // Cache the result
      this.cache[cacheKey] = {
        timestamp: Date.now(),
        value: data,
      };

      return data;
    } catch (error: any) {
      console.error("Coingecko API error:", error?.response?.data);
      throw new Error("Failed to fetch data from Coingecko");
    }
  }

  /**
   * Get the current price of a token/currency
   */
  async getPrice(id: string, baseCurrency: string = "usd"): Promise<number> {
    const coingeckoId = this.getCoingeckoId(id);
    const baseId = baseCurrency.toLowerCase();

    try {
      const data = await this.cachedFetch(`${this.API_BASE_URL}/simple/price`, {
        ids: coingeckoId,
        vs_currencies: baseId,
      });

      if (data && data[coingeckoId] && data[coingeckoId][baseId]) {
        return data[coingeckoId][baseId];
      }

      throw new Error(`Price not available for ${id} in ${baseCurrency}`);
    } catch (error: any) {
      logger.error(`Failed to get price for ${id}:`, error.message);
      console.log(error?.response, error);
      throw error;
    }
  }

  /**
   * Get prices for multiple tokens/currencies
   */
  async getPrices(
    ids: string[],
    baseCurrency: string = "usd"
  ): Promise<Record<string, number>> {
    const coingeckoIds = ids.map((id) => this.getCoingeckoId(id));
    const baseId = baseCurrency.toLowerCase();

    try {
      const data = await this.cachedFetch(`${this.API_BASE_URL}/simple/price`, {
        ids: coingeckoIds.join(","),
        vs_currencies: baseId,
      });

      // Map the results back to the original ids
      const result: Record<string, number> = {};
      ids.forEach((originalId, index) => {
        const coingeckoId = coingeckoIds[index];
        if (data && data[coingeckoId] && data[coingeckoId][baseId]) {
          result[originalId] = data[coingeckoId][baseId];
        }
      });

      return result;
    } catch (error) {
      console.error(`Failed to get prices:`, error);
      throw error;
    }
  }

  /**
   * Get historical price at a specific date
   */
  async getHistoricalPrice(
    id: string,
    baseCurrency: string = "usd",
    date: Date
  ): Promise<number> {
    const coingeckoId = this.getCoingeckoId(id);

    // Format the date as DD-MM-YYYY for Coingecko API
    const formattedDate = date.toISOString().split("T")[0];

    try {
      const data = await this.cachedFetch(
        `${this.API_BASE_URL}/coins/${coingeckoId}/history`,
        {
          date: formattedDate,
          localization: false,
        }
      );

      if (
        data &&
        data.market_data &&
        data.market_data.current_price &&
        data.market_data.current_price[baseCurrency.toLowerCase()]
      ) {
        return data.market_data.current_price[baseCurrency.toLowerCase()];
      }

      throw new Error(
        `Historical price not available for ${id} on ${formattedDate}`
      );
    } catch (error) {
      console.error(`Failed to get historical price for ${id}:`, error);
      throw error;
    }
  }
}
