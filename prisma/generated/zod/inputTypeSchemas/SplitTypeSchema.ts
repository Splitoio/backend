import { z } from 'zod';

export const SplitTypeSchema = z.enum(['EQUAL','PERCENTAGE','EXACT','SHARE','ADJUSTMENT','SETTLEMENT']);

export type SplitTypeType = `${z.infer<typeof SplitTypeSchema>}`

export default SplitTypeSchema;
