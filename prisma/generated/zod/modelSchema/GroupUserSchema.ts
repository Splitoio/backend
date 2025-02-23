import { z } from 'zod';

/////////////////////////////////////////
// GROUP USER SCHEMA
/////////////////////////////////////////

export const GroupUserSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
})

export type GroupUser = z.infer<typeof GroupUserSchema>

export default GroupUserSchema;
