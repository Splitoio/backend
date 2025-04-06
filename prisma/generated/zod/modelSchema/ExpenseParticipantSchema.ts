import { z } from 'zod';

/////////////////////////////////////////
// EXPENSE PARTICIPANT SCHEMA
/////////////////////////////////////////

export const ExpenseParticipantSchema = z.object({
  expenseId: z.string(),
  userId: z.string(),
  amount: z.number(),
})

export type ExpenseParticipant = z.infer<typeof ExpenseParticipantSchema>

export default ExpenseParticipantSchema;
