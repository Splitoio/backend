import { z } from 'zod';

export const SettlementItemScalarFieldEnumSchema = z.enum(['id','settlementTransactionId','userId','friendId','originalAmount','originalCurrency','xlmAmount']);

export default SettlementItemScalarFieldEnumSchema;
