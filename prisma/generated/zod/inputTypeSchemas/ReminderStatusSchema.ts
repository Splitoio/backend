import { z } from 'zod';

export const ReminderStatusSchema = z.enum(['PENDING','COMPLETED','CANCELLED']);

export type ReminderStatusType = `${z.infer<typeof ReminderStatusSchema>}`

export default ReminderStatusSchema;
