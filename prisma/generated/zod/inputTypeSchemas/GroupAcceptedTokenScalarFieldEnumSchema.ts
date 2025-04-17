import { z } from 'zod';

export const GroupAcceptedTokenScalarFieldEnumSchema = z.enum(['id','groupId','tokenId','chainId','isDefault','createdAt','updatedAt']);

export default GroupAcceptedTokenScalarFieldEnumSchema;
