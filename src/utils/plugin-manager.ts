import { ChainRegistry } from "../services/chains/registry";
import { TokenRegistry } from "../services/tokens/registry";
import { createLogger } from "./logger";
import {
  syncChainToDatabase,
  syncTokenToDatabase,
} from "../services/currency.service";

const logger = createLogger("plugin-manager");

export interface Plugin {
  id: string;
  name: string;
  initialize(
    chainRegistry: ChainRegistry,
    tokenRegistry: TokenRegistry
  ): Promise<void>;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private chainRegistry: ChainRegistry;
  private tokenRegistry: TokenRegistry;

  constructor(chainRegistry: ChainRegistry, tokenRegistry: TokenRegistry) {
    this.chainRegistry = chainRegistry;
    this.tokenRegistry = tokenRegistry;
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    this.plugins.set(plugin.id, plugin);

    // Initialize the plugin, which will register chains and tokens in memory
    await plugin.initialize(this.chainRegistry, this.tokenRegistry);

    // After initialization, get all chains and tokens from the plugin to sync to database
    // This isn't perfect as we don't know which chains/tokens were added by this plugin
    // A better approach would be to enhance the Plugin interface to return what it registered
    const chains = this.chainRegistry.getSupportedChains();
    for (const chain of chains) {
      if (chain.id.startsWith(plugin.id)) {
        // Only sync chains that match the plugin id prefix (e.g., 'ethereum-' would match the ethereum plugin)
        // This is a heuristic and may need adjustment based on your chain ID naming convention
        await syncChainToDatabase(chain.id);
      }
    }

    // Get all tokens for chains that might have been registered by this plugin
    for (const chain of chains) {
      if (chain.id.startsWith(plugin.id)) {
        const tokens = this.tokenRegistry.getTokensByChain(chain.id);
        for (const token of tokens) {
          await syncTokenToDatabase(chain.id, token.id);
        }
      }
    }

    logger.info(
      { pluginId: plugin.id, pluginName: plugin.name },
      `Plugin ${plugin.name} registered and initialized`
    );
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
