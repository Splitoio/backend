import { Plugin } from "../utils/plugin-manager";
import { ChainRegistry } from "../services/chains/registry";
import { TokenRegistry } from "../services/tokens/registry";
import { StellarProvider } from "../services/chains/providers/stellar";
import { env } from "../config/env";

export class StellarPlugin implements Plugin {
  id = "stellar";
  name = "Stellar Network";

  async initialize(
    chainRegistry: ChainRegistry,
    tokenRegistry: TokenRegistry
  ): Promise<void> {
    // Register Stellar chain
    chainRegistry.registerChain({
      id: "stellar",
      name: "Stellar",
      currency: "XLM",
      rpcUrl: env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
      blockExplorer: "https://stellar.expert/explorer/testnet",
      testnet: true,
      logoUrl:
        "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
      enabled: true,
    });

    // Register Stellar provider
    const provider = new StellarProvider();
    chainRegistry.registerProvider("stellar", provider);

    // Register XLM token
    tokenRegistry.registerToken({
      id: "xlm",
      name: "Stellar Lumens",
      symbol: "XLM",
      decimals: 7,
      type: "native",
      chainId: "stellar",
      logoUrl:
        "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
      enabled: true,
      exchangeRateSource: "coingecko",
    });
  }
}
