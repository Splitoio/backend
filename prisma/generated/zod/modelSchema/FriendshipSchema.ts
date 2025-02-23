import { z } from 'zod';

/////////////////////////////////////////
// FRIENDSHIP SCHEMA
/////////////////////////////////////////

export const FriendshipSchema = z.object({
  userId: z.string(),
  friendId: z.string(),
  createdAt: z.coerce.date(),
})

export type Friendship = z.infer<typeof FriendshipSchema>

export default FriendshipSchema;
