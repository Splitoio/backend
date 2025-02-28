import { z } from 'zod';

/////////////////////////////////////////
// GROUP SCHEMA
/////////////////////////////////////////

export const GroupSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  userId: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  defaultCurrency: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  contractGroupId: z.number().int(),
})

export type Group = z.infer<typeof GroupSchema>

export default GroupSchema;
