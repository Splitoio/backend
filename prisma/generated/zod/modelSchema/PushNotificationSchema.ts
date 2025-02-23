import { z } from 'zod';

/////////////////////////////////////////
// PUSH NOTIFICATION SCHEMA
/////////////////////////////////////////

export const PushNotificationSchema = z.object({
  userId: z.string(),
  subscription: z.string(),
})

export type PushNotification = z.infer<typeof PushNotificationSchema>

export default PushNotificationSchema;
