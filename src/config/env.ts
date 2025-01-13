import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.string().default('3001'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  JWT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);