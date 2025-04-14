import { z } from 'zod';

/////////////////////////////////////////
// SUPPORTED CHAIN SCHEMA
/////////////////////////////////////////

export const SupportedChainSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  rpcUrl: z.string(),
  blockExplorer: z.string(),
  testnet: z.boolean(),
  logoUrl: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SupportedChain = z.infer<typeof SupportedChainSchema>

export default SupportedChainSchema;
