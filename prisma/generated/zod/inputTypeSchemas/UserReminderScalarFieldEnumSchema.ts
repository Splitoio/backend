import { z } from 'zod';

export const UserReminderScalarFieldEnumSchema = z.enum(['id','senderId','receiverId','reminderType','splitId','content','status','createdAt','updatedAt']);

export default UserReminderScalarFieldEnumSchema;
