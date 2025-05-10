import { z } from 'zod';

/////////////////////////////////////////
// SETTLEMENT TRANSACTION SCHEMA
/////////////////////////////////////////

export const SettlementTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  groupId: z.string(),
  serializedTx: z.string(),
  settleWithId: z.string().nullable(),
  status: z.string(),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  transactionHash: z.string().nullable(),
  chainId: z.string(),
  tokenId: z.string().nullable(),
})

export type SettlementTransaction = z.infer<typeof SettlementTransactionSchema>

export default SettlementTransactionSchema;
