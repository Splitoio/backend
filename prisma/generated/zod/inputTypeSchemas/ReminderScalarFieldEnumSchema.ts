import { z } from 'zod';

export const ReminderScalarFieldEnumSchema = z.enum(['id','fromUserId','toUserId','amount','currency','message','type','status','expenseId','createdAt','updatedAt']);

export default ReminderScalarFieldEnumSchema;
