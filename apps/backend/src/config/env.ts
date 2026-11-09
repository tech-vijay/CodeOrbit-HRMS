import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env explicitly from both backend directory and monorepo root
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_SECRET: z.string().optional(),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().url().optional(),
    COOKIE_SECRET: z.string().optional(),
  })
  .superRefine((config, context) => {
    if (config.NODE_ENV !== 'production') return;

    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET'] as const) {
      if (
        !config[key] ||
        config[key]!.length < 32 ||
        config[key]!.startsWith('replace-with-') ||
        config[key]!.startsWith('development-only-')
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Must be configured with at least 32 characters in production',
        });
      }
    }

    for (const key of ['DATABASE_URL', 'CORS_ORIGIN'] as const) {
      if (!config[key]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Must be explicitly configured in production',
        });
      }
    }

    const secrets = [
      config.JWT_SECRET,
      config.REFRESH_TOKEN_SECRET,
      config.COOKIE_SECRET,
    ].filter((secret): secret is string => Boolean(secret));
    if (new Set(secrets).size !== secrets.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REFRESH_TOKEN_SECRET'],
        message: 'Production secrets must be different values',
      });
    }
  });

export const parseEnv = (source: NodeJS.ProcessEnv) => {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  return {
    ...parsed.data,
    DATABASE_URL:
      parsed.data.DATABASE_URL ??
      'postgresql://postgres@127.0.0.1:5434/codeorbit_hrms?schema=public',
    JWT_SECRET: parsed.data.JWT_SECRET ?? 'development-only-jwt-secret-change-before-production',
    REFRESH_TOKEN_SECRET:
      parsed.data.REFRESH_TOKEN_SECRET ?? 'development-only-refresh-secret-change-before-production',
    CORS_ORIGIN: parsed.data.CORS_ORIGIN ?? 'http://localhost:5173',
    COOKIE_SECRET: parsed.data.COOKIE_SECRET ?? 'development-only-cookie-secret-change-before-production',
  };
};

export const env = parseEnv(process.env);
