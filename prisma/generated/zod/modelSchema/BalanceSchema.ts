import { z } from 'zod';

/////////////////////////////////////////
// BALANCE SCHEMA
/////////////////////////////////////////

export const BalanceSchema = z.object({
  userId: z.string(),
  currency: z.string(),
  friendId: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  importedFromSplitwise: z.boolean(),
})

export type Balance = z.infer<typeof BalanceSchema>

export default BalanceSchema;
