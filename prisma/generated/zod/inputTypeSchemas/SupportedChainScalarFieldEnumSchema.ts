import { z } from 'zod';

export const SupportedChainScalarFieldEnumSchema = z.enum(['id','name','currency','rpcUrl','blockExplorer','testnet','logoUrl','enabled','createdAt','updatedAt']);

export default SupportedChainScalarFieldEnumSchema;
