import { z } from 'zod';

/////////////////////////////////////////
// EXPENSE NOTE SCHEMA
/////////////////////////////////////////

export const ExpenseNoteSchema = z.object({
  id: z.string().cuid(),
  expenseId: z.string(),
  note: z.string(),
  createdById: z.string(),
  createdAt: z.coerce.date(),
})

export type ExpenseNote = z.infer<typeof ExpenseNoteSchema>

export default ExpenseNoteSchema;
