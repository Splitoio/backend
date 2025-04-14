import { z } from 'zod';

/////////////////////////////////////////
// SETTLEMENT ITEM SCHEMA
/////////////////////////////////////////

export const SettlementItemSchema = z.object({
  id: z.string().cuid(),
  settlementTransactionId: z.string(),
  userId: z.string(),
  friendId: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  currency: z.string(),
  groupId: z.string().nullable(),
  afterSettlementBalance: z.number().nullable(),
})

export type SettlementItem = z.infer<typeof SettlementItemSchema>

export default SettlementItemSchema;
