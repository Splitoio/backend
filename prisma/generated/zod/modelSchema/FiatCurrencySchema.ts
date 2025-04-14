import { z } from 'zod';

/////////////////////////////////////////
// FIAT CURRENCY SCHEMA
/////////////////////////////////////////

export const FiatCurrencySchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  coinGeckoId: z.string(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FiatCurrency = z.infer<typeof FiatCurrencySchema>

export default FiatCurrencySchema;
