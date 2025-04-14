import { Plugin } from "../utils/plugin-manager";
import { ChainRegistry } from "../services/chains/registry";
import { TokenRegistry } from "../services/tokens/registry";
import { EthereumProvider } from "../services/chains/providers/ethereum";
import { env } from "../config/env";

export class EthereumPlugin implements Plugin {
  id = "ethereum";
  name = "Ethereum Network";

  async initialize(
    chainRegistry: ChainRegistry,
    tokenRegistry: TokenRegistry
  ): Promise<void> {
    // Register Ethereum chain
    chainRegistry.registerChain({
      id: "ethereum",
      name: "Ethereum",
      currency: "ETH",
      rpcUrl: "https://mainnet.infura.io/v3/your-api-key",
      blockExplorer: "https://etherscan.io",
      testnet: false,
      logoUrl:
        "https://ethereum.org/static/eth-diamond-purple-99866ffbd6d6d3eff2445afbc11cd825.png",
      enabled: true,
    });

    // Register Ethereum provider
    const provider = new EthereumProvider();
    chainRegistry.registerProvider("ethereum", provider);

    // Register ETH token
    tokenRegistry.registerToken({
      id: "eth",
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      type: "native",
      chainId: "ethereum",
      logoUrl:
        "https://ethereum.org/static/eth-diamond-purple-99866ffbd6d6d3eff2445afbc11cd825.png",
      enabled: true,
    });

    // Register some ERC-20 tokens
    tokenRegistry.registerToken({
      id: "usdc",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      type: "token",
      chainId: "ethereum",
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      logoUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      enabled: true,
      exchangeRateSource: "coingecko",
    });
  }
}
