import { z } from 'zod';

export const TokenScalarFieldEnumSchema = z.enum(['id','name','symbol','decimals','type','chainId','contractAddress','logoUrl','enabled','exchangeRateSource','createdAt','updatedAt']);

export default TokenScalarFieldEnumSchema;
