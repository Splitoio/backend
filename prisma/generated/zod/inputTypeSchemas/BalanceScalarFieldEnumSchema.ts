import { z } from 'zod';

export const BalanceScalarFieldEnumSchema = z.enum(['userId','currency','friendId','amount','createdAt','updatedAt','importedFromSplitwise']);

export default BalanceScalarFieldEnumSchema;
