export * from "./service-interface";
export * from "./coingecko-service";
export * from "./pricing-service-factory";

import {
  PricingServiceFactory,
  PricingServiceProvider,
} from "./pricing-service-factory";
import { PricingService } from "./service-interface";
import { env } from "../../config/env";

/**
 * Get the default pricing service based on environment configuration
 */
export function getPricingService(): PricingService {
  // You can read the pricing service configuration from environment variables
  const provider =
    (env.PRICING_SERVICE_PROVIDER as PricingServiceProvider) ||
    PricingServiceProvider.COINGECKO;

  const config = {
    apiKey: env.COINGECKO_API_KEY,
  };

  return PricingServiceFactory.getService(provider, config);
}
