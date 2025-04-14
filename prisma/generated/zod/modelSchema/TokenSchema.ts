import { z } from 'zod';

/////////////////////////////////////////
// TOKEN SCHEMA
/////////////////////////////////////////

export const TokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int(),
  type: z.string(),
  chainId: z.string(),
  contractAddress: z.string().nullable(),
  logoUrl: z.string().nullable(),
  enabled: z.boolean(),
  exchangeRateSource: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Token = z.infer<typeof TokenSchema>

export default TokenSchema;
