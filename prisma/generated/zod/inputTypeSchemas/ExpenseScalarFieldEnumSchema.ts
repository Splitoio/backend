import { z } from 'zod';

export const ExpenseScalarFieldEnumSchema = z.enum(['id','paidBy','addedBy','name','category','amount','splitType','expenseDate','createdAt','updatedAt','currency','currencyType','tokenId','chainId','acceptedTokenIds','exchangeRate','timeLockIn','fileKey','groupId','deletedAt','deletedBy','updatedBy']);

export default ExpenseScalarFieldEnumSchema;
