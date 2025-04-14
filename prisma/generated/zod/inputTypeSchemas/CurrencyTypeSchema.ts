import { z } from 'zod';

export const CurrencyTypeSchema = z.enum(['FIAT','TOKEN']);

export type CurrencyTypeType = `${z.infer<typeof CurrencyTypeSchema>}`

export default CurrencyTypeSchema;
