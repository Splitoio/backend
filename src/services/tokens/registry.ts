import { TokenConfig, ExchangeRate } from "../../types/tokens";

export class TokenRegistry {
  private tokens: Map<string, TokenConfig> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();

  registerToken(config: TokenConfig): void {
    const tokenKey = `${config.chainId}:${config.id}`;
    this.tokens.set(tokenKey, config);
  }

  getToken(chainId: string, tokenId: string): TokenConfig | undefined {
    return this.tokens.get(`${chainId}:${tokenId}`);
  }

  getTokensByChain(chainId: string): TokenConfig[] {
    return Array.from(this.tokens.values()).filter(
      (token) => token.chainId === chainId && token.enabled
    );
  }

  updateExchangeRate(rate: ExchangeRate): void {
    const key = `${rate.baseCurrency}:${rate.quoteCurrency}`;
    this.exchangeRates.set(key, rate);
  }

  getExchangeRate(from: string, to: string): number {
    const key = `${from}:${to}`;
    const rate = this.exchangeRates.get(key);
    return rate?.rate || 0;
  }
}
