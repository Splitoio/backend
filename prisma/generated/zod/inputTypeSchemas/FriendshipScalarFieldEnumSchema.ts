import { z } from 'zod';

export const FriendshipScalarFieldEnumSchema = z.enum(['userId','friendId','createdAt']);

export default FriendshipScalarFieldEnumSchema;
