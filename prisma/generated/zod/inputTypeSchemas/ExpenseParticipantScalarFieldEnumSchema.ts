import { z } from 'zod';

export const ExpenseParticipantScalarFieldEnumSchema = z.enum(['expenseId','userId','amount']);

export default ExpenseParticipantScalarFieldEnumSchema;
