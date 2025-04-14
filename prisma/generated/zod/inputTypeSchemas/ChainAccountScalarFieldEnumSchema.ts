import { z } from 'zod';

export const ChainAccountScalarFieldEnumSchema = z.enum(['id','userId','chainId','address','isDefault','createdAt','updatedAt']);

export default ChainAccountScalarFieldEnumSchema;
