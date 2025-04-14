import { z } from 'zod';

export const FiatCurrencyScalarFieldEnumSchema = z.enum(['id','name','symbol','enabled','createdAt','updatedAt']);

export default FiatCurrencyScalarFieldEnumSchema;
