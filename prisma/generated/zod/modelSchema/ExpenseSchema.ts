import { z } from 'zod';
import { SplitTypeSchema } from '../inputTypeSchemas/SplitTypeSchema'

/////////////////////////////////////////
// EXPENSE SCHEMA
/////////////////////////////////////////

export const ExpenseSchema = z.object({
  splitType: SplitTypeSchema,
  id: z.string().cuid(),
  paidBy: z.string(),
  addedBy: z.string(),
  name: z.string(),
  category: z.string(),
  amount: z.number().int(),
  expenseDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  currency: z.string(),
  fileKey: z.string().nullable(),
  groupId: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  deletedBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
})

export type Expense = z.infer<typeof ExpenseSchema>

export default ExpenseSchema;
