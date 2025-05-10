import { z } from 'zod';

/////////////////////////////////////////
// SETTLEMENT ITEM SCHEMA
/////////////////////////////////////////

export const SettlementItemSchema = z.object({
  id: z.string().cuid(),
  settlementTransactionId: z.string(),
  userId: z.string(),
  friendId: z.string(),
  originalAmount: z.number(),
  originalCurrency: z.string(),
  xlmAmount: z.number(),
})

export type SettlementItem = z.infer<typeof SettlementItemSchema>

export default SettlementItemSchema;
