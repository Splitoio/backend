import { z } from 'zod';

/////////////////////////////////////////
// REMINDER SCHEMA
/////////////////////////////////////////

export const ReminderSchema = z.object({
  id: z.string().cuid(),
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number(),
  currency: z.string(),
  message: z.string(),
  type: z.string(),
  status: z.string(),
  expenseId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Reminder = z.infer<typeof ReminderSchema>

export default ReminderSchema;
