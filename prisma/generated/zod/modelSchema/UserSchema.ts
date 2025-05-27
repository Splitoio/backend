import { z } from 'zod';

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  currency: z.string(),
  analyticsEnabled: z.boolean(),
  reminderPreference: z.string().nullable(),
  stellarAccount: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  reminderFrequency: z.string().nullable(),
  lastReminderSentAt: z.coerce.date().nullable(),
  timeLockInDefault: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

export default UserSchema;
