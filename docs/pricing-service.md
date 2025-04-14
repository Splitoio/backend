# Pricing Service

The pricing service is a modular component designed to provide cryptocurrency and fiat currency price data for Splito. It supports various pricing providers with a common interface, allowing the application to switch between providers easily.

## Architecture

The pricing service follows a modular design with the following components:

1. **Service Interface**: Defines common methods for all pricing providers
2. **Base Service**: Implements shared functionality for all providers
3. **Provider Implementations**: Concrete implementations for different data sources
4. **Factory**: Creates and manages provider instances

## Supported Providers

Currently, the following pricing providers are supported:

- **Coingecko**: Uses the Coingecko API to fetch cryptocurrency and fiat currency pricing data

Future providers that can be added:

- **Pyth Network**: On-chain oracle solution with real-time price feeds
- **Chainlink**: Decentralized oracle network
- **CryptoCompare**: Alternative API-based pricing source

## Features

The pricing service offers the following features:

- **Current Prices**: Get the current price of tokens/currencies
- **Multiple Prices**: Fetch prices for multiple tokens/currencies in a single call
- **Historical Prices**: Get prices at a specific point in time
- **Exchange Rates**: Calculate exchange rates between any two tokens/currencies
- **Caching**: Efficient caching to reduce API calls and improve performance

## API Endpoints

The following API endpoints are available for testing and using the pricing service:

- `GET /api/pricing/price?id=<token_id>&baseCurrency=<base>` - Get current price
- `GET /api/pricing/prices?ids=<token_ids>&baseCurrency=<base>` - Get multiple prices
- `GET /api/pricing/historical?id=<token_id>&date=<date>&baseCurrency=<base>` - Get historical price
- `GET /api/pricing/exchange-rate?fromId=<from_id>&toId=<to_id>` - Get exchange rate

## Configuration

The pricing service can be configured via environment variables:

```
# Pricing Service Configuration
PRICING_SERVICE_PROVIDER=coingecko
COINGECKO_API_KEY=your_coingecko_api_key
```

## Usage Examples

### Getting Price Data in Code

```typescript
import { getPricingService } from "../services/pricing";

// Get the default pricing service
const pricingService = getPricingService();

// Get the current price of Bitcoin in USD
const btcPrice = await pricingService.getPrice("btc", "usd");

// Get prices for multiple cryptocurrencies
const prices = await pricingService.getPrices(["btc", "eth", "xlm"], "usd");

// Get historical price
const historicalPrice = await pricingService.getHistoricalPrice(
  "btc",
  "usd",
  new Date("2023-01-01")
);

// Get exchange rate between two currencies
const ethToXlmRate = await pricingService.getExchangeRate("eth", "xlm");
```

### API Request Examples

```bash
# Get Bitcoin price in USD
curl "http://localhost:4000/api/pricing/price?id=btc&baseCurrency=usd"

# Get prices for multiple cryptocurrencies
curl "http://localhost:4000/api/pricing/prices?ids=btc,eth,xlm&baseCurrency=usd"

# Get historical price
curl "http://localhost:4000/api/pricing/historical?id=btc&date=2023-01-01&baseCurrency=usd"

# Get exchange rate between Ethereum and Stellar
curl "http://localhost:4000/api/pricing/exchange-rate?fromId=eth&toId=xlm"
```

## Adding a New Provider

To add a new pricing provider:

1. Create a new class that extends `BasePricingService`
2. Implement the required methods
3. Add the provider to the `PricingServiceProvider` enum
4. Update the factory to create instances of the new provider

Example:

```typescript
export class PythPricingService extends BasePricingService {
  // Implement required methods
}

// Add to enum
export enum PricingServiceProvider {
  COINGECKO = "coingecko",
  PYTH = "pyth",
}

// Update factory
switch (provider) {
  case PricingServiceProvider.COINGECKO:
    service = new CoingeckoService(config?.apiKey);
    break;
  case PricingServiceProvider.PYTH:
    service = new PythPricingService(config);
    break;
}
```
