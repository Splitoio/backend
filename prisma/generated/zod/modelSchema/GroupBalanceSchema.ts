import { z } from 'zod';

/////////////////////////////////////////
// GROUP BALANCE SCHEMA
/////////////////////////////////////////

export const GroupBalanceSchema = z.object({
  groupId: z.string(),
  currency: z.string(),
  userId: z.string(),
  firendId: z.string(),
  amount: z.number().int(),
  updatedAt: z.coerce.date(),
})

export type GroupBalance = z.infer<typeof GroupBalanceSchema>

export default GroupBalanceSchema;
