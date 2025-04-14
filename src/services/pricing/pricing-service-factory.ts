import { PricingService } from "./service-interface";
import { CoingeckoService } from "./coingecko-service";

/**
 * Supported pricing service providers
 */
export enum PricingServiceProvider {
  COINGECKO = "coingecko",
  // Add more providers here as they are implemented
  // PYTH = 'pyth',
  // CHAINLINK = 'chainlink',
}

/**
 * Factory for creating pricing service instances
 */
export class PricingServiceFactory {
  private static instances: Record<string, PricingService> = {};

  /**
   * Get a pricing service instance
   * @param provider The pricing service provider to use
   * @param config Configuration options for the provider
   */
  static getService(
    provider: PricingServiceProvider = PricingServiceProvider.COINGECKO,
    config?: Record<string, any>
  ): PricingService {
    // Return existing instance if available
    if (this.instances[provider]) {
      return this.instances[provider];
    }

    // Create a new instance based on the provider
    let service: PricingService;

    switch (provider) {
      case PricingServiceProvider.COINGECKO:
        service = new CoingeckoService(config?.apiKey);
        break;
      // Add cases for other providers as they are implemented
      // case PricingServiceProvider.PYTH:
      //   service = new PythService(config);
      //   break;
      default:
        throw new Error(`Unsupported pricing service provider: ${provider}`);
    }

    // Cache the instance
    this.instances[provider] = service;
    return service;
  }

  /**
   * Clear cached service instances
   */
  static clearInstances(): void {
    this.instances = {};
  }
}
