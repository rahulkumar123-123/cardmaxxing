import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : value.toLowerCase() === 'true'));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    COOKIE_DOMAIN: z.string().optional(),
    TRUST_PROXY: booleanish.default(false),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    /** Optional. When absent the AI explanation layer is disabled and the API degrades gracefully. */
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production',
        path: ['JWT_REFRESH_SECRET'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export const env: Env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
/** The AI explanation layer is strictly optional. */
export const aiEnabled = Boolean(env.ANTHROPIC_API_KEY);
/** Comma-separated list support so one deployment can serve several front-end origins. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
