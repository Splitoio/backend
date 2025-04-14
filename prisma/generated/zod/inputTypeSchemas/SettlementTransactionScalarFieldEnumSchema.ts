import { z } from 'zod';

export const SettlementTransactionScalarFieldEnumSchema = z.enum(['id','userId','groupId','serializedTx','settleWithId','status','createdAt','completedAt','transactionHash','chainId','tokenId']);

export default SettlementTransactionScalarFieldEnumSchema;
