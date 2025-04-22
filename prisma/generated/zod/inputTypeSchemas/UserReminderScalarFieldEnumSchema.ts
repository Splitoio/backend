import { z } from 'zod';

export const UserReminderScalarFieldEnumSchema = z.enum(['id','senderId','receiverId','reminderType','splitId','message','status','createdAt','updatedAt']);

export default UserReminderScalarFieldEnumSchema;
