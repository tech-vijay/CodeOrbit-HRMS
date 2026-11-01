import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env explicitly from both backend directory and monorepo root
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().default('postgresql://postgres@127.0.0.1:5434/codeorbit_hrms?schema=public'),
  JWT_SECRET: z.string().min(16).default('codeorbit-super-secure-jwt-access-secret-key-32chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('codeorbit-super-secure-refresh-token-secret-key-32chars'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECRET: z.string().default('codeorbit-cookie-secret-key-secure-123'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
