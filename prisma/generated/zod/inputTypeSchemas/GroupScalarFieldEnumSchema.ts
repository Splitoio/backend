import { z } from 'zod';

export const GroupScalarFieldEnumSchema = z.enum(['id','name','userId','description','image','defaultCurrency','createdAt','updatedAt']);

export default GroupScalarFieldEnumSchema;
