import { z } from 'zod';
import { ReminderTypeSchema } from '../inputTypeSchemas/ReminderTypeSchema'
import { ReminderStatusSchema } from '../inputTypeSchemas/ReminderStatusSchema'

/////////////////////////////////////////
// USER REMINDER SCHEMA
/////////////////////////////////////////

export const UserReminderSchema = z.object({
  reminderType: ReminderTypeSchema,
  status: ReminderStatusSchema,
  id: z.string().uuid(),
  senderId: z.string(),
  receiverId: z.string(),
  splitId: z.string().nullable(),
  content: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserReminder = z.infer<typeof UserReminderSchema>

export default UserReminderSchema;
