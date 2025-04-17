import { z } from 'zod';

export const UserAcceptedTokenScalarFieldEnumSchema = z.enum(['id','userId','tokenId','chainId','isDefault','createdAt','updatedAt']);

export default UserAcceptedTokenScalarFieldEnumSchema;
