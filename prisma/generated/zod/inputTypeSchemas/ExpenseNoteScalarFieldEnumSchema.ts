import { z } from 'zod';

export const ExpenseNoteScalarFieldEnumSchema = z.enum(['id','expenseId','note','createdById','createdAt']);

export default ExpenseNoteScalarFieldEnumSchema;
