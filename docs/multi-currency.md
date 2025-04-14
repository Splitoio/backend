# Multi-Currency and Time Lock-In Features

Splito now supports expenses in multiple currencies, including both fiat currencies (USD, EUR, INR, etc.) and blockchain tokens. This document explains how these features work and how to use them.

## Supported Currencies

### Fiat Currencies

Splito supports the following fiat currencies:

- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- INR (Indian Rupee)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)

### Blockchain Tokens

In addition to fiat currencies, Splito also supports expenses using blockchain tokens from various chains:

- Stellar (XLM)
- Ethereum (ETH)
- Ethereum tokens (USDC, etc.)
- Additional chains and tokens can be added through the plugin system

## Time Lock-In Feature

The time lock-in feature allows users to choose whether an expense should be fixed at the current exchange rate or use the current rate at the time of settling.

### How It Works

1. When creating an expense, you can enable the time lock-in feature by setting `timeLockIn: true`.
2. If time lock-in is enabled, the current exchange rate is stored with the expense.
3. When viewing or settling expenses:
   - If time lock-in is enabled, the stored exchange rate is used
   - If time lock-in is disabled, the current exchange rate is used

### Use Cases

- **Time Lock-In Enabled**: The value of the split is fixed in the reference currency (e.g., USD). This is useful for budgeting purposes and when you want to ensure the split amount doesn't change due to market fluctuations.
- **Time Lock-In Disabled**: The value of the split follows the market. This is useful when you want to settle in the exact same amount of tokens regardless of price changes.

## API Endpoints

### Currency Endpoints

- `GET /api/currencies/fiat` - Get all supported fiat currencies
- `GET /api/currencies/all` - Get all supported currencies (fiat and tokens)
- `GET /api/currencies/rate` - Get exchange rate between two currencies
- `GET /api/currencies/convert` - Convert amount between currencies

### Enhanced Expense Endpoints

- `POST /api/enhanced-expenses` - Create a new expense with support for multiple currencies and time lock-in
- `GET /api/enhanced-expenses/:groupId` - Get expenses for a group with converted values

## Example Usage

### Creating an Expense with Token and Time Lock-In

```json
POST /api/enhanced-expenses
{
  "groupId": "123",
  "paidBy": "user1",
  "name": "Dinner",
  "category": "Food",
  "amount": 1,
  "currency": "SOL",
  "currencyType": "TOKEN",
  "chainId": "solana",
  "tokenId": "sol",
  "timeLockIn": true,
  "participants": [
    {
      "userId": "user1",
      "amount": 0.5
    },
    {
      "userId": "user2",
      "amount": 0.5
    }
  ]
}
```

### Creating an Expense with Fiat Currency

```json
POST /api/enhanced-expenses
{
  "groupId": "123",
  "paidBy": "user1",
  "name": "Groceries",
  "category": "Food",
  "amount": 100,
  "currency": "INR",
  "currencyType": "FIAT",
  "participants": [
    {
      "userId": "user1",
      "amount": 50
    },
    {
      "userId": "user2",
      "amount": 50
    }
  ]
}
```

## Implementation Details

- Exchange rates are fetched from external APIs and cached for 24 hours.
- For fiat currencies, we use the Exchange Rates API.
- For tokens, we use price data from token registries.
- Time lock-in stores the exchange rate to USD at the time of expense creation.
- When viewing expenses, they can be converted to any target currency for display purposes.
