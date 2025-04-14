export interface TokenConfig {
  id: string; // Unique token identifier
  name: string; // Token name
  symbol: string; // Token symbol
  decimals: number; // Token decimals
  type: "native" | "token"; // Native or token
  chainId: string; // Chain ID this token belongs to
  contractAddress?: string; // Token contract address (if type is "token")
  logoUrl?: string; // Token logo URL
  enabled: boolean; // Whether token is enabled
  exchangeRateSource?: string; // Source for exchange rate data
}

export interface ExchangeRate {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  lastUpdated: Date;
}
