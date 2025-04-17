import { z } from 'zod';

/////////////////////////////////////////
// GROUP ACCEPTED TOKEN SCHEMA
/////////////////////////////////////////

export const GroupAcceptedTokenSchema = z.object({
  id: z.string().cuid(),
  groupId: z.string(),
  tokenId: z.string(),
  chainId: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GroupAcceptedToken = z.infer<typeof GroupAcceptedTokenSchema>

export default GroupAcceptedTokenSchema;
