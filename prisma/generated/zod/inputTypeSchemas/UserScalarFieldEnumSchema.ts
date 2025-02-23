import { z } from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','currency','stellarAccount','createdAt','updatedAt']);

export default UserScalarFieldEnumSchema;
