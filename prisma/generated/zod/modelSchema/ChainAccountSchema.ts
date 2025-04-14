import { z } from 'zod';

/////////////////////////////////////////
// CHAIN ACCOUNT SCHEMA
/////////////////////////////////////////

export const ChainAccountSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  chainId: z.string(),
  address: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ChainAccount = z.infer<typeof ChainAccountSchema>

export default ChainAccountSchema;
