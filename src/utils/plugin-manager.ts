import { ChainRegistry } from "../services/chains/registry";
import { TokenRegistry } from "../services/tokens/registry";
import { createLogger } from "./logger";

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
    await plugin.initialize(this.chainRegistry, this.tokenRegistry);
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
