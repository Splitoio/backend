import { z } from 'zod';

/////////////////////////////////////////
// USER ACCEPTED TOKEN SCHEMA
/////////////////////////////////////////

export const UserAcceptedTokenSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  tokenId: z.string(),
  chainId: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserAcceptedToken = z.infer<typeof UserAcceptedTokenSchema>

export default UserAcceptedTokenSchema;
