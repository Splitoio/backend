import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.string().default("3001"),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  SOROBAN_RPC_URL: z.string(),
  SOROBAN_NETWORK_PASSPHRASE: z.string(),
  SOROBAN_CONTRACT_ID: z.string(),
  SESSION_SECRET: z.string(),
  BACKEND_URL: z.string(),
  FRONTEND_URL: z.string(),
  SECRET_KEY: z.string(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CREDENTIALS: z.string().optional(),
  GOOGLE_CLOUD_BUCKET_NAME: z.string().optional(),
});

export const env = envSchema.parse(process.env);
