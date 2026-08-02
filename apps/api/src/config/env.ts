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
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Pagination
  DEFAULT_PAGE: z.coerce.number().default(1),
  DEFAULT_LIMIT: z.coerce.number().default(20),
  MAX_LIMIT: z.coerce.number().default(100),

  // Multi-tenancy
  ENABLE_MULTI_TENANCY: z.coerce.boolean().default(true),
});

type Environment = z.infer<typeof envSchema>;

const parseEnv = (): Environment => {
  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    console.error('❌ Environment validation failed:');
    console.error(env.error.flatten().fieldErrors);
    process.exit(1);
  }

  return env.data;
};

export const config = parseEnv();

export type { Environment };