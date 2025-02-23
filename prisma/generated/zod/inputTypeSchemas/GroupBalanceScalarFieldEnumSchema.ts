import { z } from 'zod';

export const GroupBalanceScalarFieldEnumSchema = z.enum(['groupId','currency','userId','firendId','amount','updatedAt']);

export default GroupBalanceScalarFieldEnumSchema;
