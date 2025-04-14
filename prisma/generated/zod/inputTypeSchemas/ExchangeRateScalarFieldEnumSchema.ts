import { z } from 'zod';

export const ExchangeRateScalarFieldEnumSchema = z.enum(['id','baseCurrencyId','quoteCurrencyId','rate','source','timestamp']);

export default ExchangeRateScalarFieldEnumSchema;
