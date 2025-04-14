import { z } from 'zod';

export const SettlementItemScalarFieldEnumSchema = z.enum(['id','settlementTransactionId','userId','friendId','amount','createdAt','currency','groupId','afterSettlementBalance']);

export default SettlementItemScalarFieldEnumSchema;
