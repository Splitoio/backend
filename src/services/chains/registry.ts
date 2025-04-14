import { ChainConfig, ChainProvider } from "../../types/chains";

export class ChainRegistry {
  private chains: Map<string, ChainConfig> = new Map();
  private providers: Map<string, ChainProvider> = new Map();

  registerChain(config: ChainConfig): void {
    this.chains.set(config.id, config);
  }

  registerProvider(chainId: string, provider: ChainProvider): void {
    this.providers.set(chainId, provider);
  }

  getChain(chainId: string): ChainConfig | undefined {
    return this.chains.get(chainId);
  }

  getProvider(chainId: string): ChainProvider | undefined {
    return this.providers.get(chainId);
  }

  getSupportedChains(): ChainConfig[] {
    return Array.from(this.chains.values()).filter((chain) => chain.enabled);
  }
}
