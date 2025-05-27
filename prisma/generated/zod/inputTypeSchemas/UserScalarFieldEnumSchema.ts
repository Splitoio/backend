import { z } from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','currency','analyticsEnabled','reminderPreference','stellarAccount','createdAt','updatedAt','reminderFrequency','lastReminderSentAt','timeLockInDefault']);

export default UserScalarFieldEnumSchema;
