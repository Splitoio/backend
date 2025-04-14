import { z } from 'zod';

/////////////////////////////////////////
// EXCHANGE RATE SCHEMA
/////////////////////////////////////////

export const ExchangeRateSchema = z.object({
  id: z.string().cuid(),
  baseCurrencyId: z.string(),
  quoteCurrencyId: z.string(),
  rate: z.number(),
  source: z.string(),
  timestamp: z.coerce.date(),
})

export type ExchangeRate = z.infer<typeof ExchangeRateSchema>

export default ExchangeRateSchema;
