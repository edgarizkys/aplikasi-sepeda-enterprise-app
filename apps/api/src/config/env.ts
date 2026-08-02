// apps/server/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('Aplikasi Sepeda Enterprise'),
  APP_PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().default(10),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Pagination
  DEFAULT_PAGE_SIZE: z.coerce.number().default(20),
  MAX_PAGE_SIZE: z.coerce.number().default(100),

  // File Upload
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),

  // Email (optional)
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // API Keys
  API_KEY_HEADER: z.string().default('x-api-key'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten());
    process.exit(1);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = getEnv();