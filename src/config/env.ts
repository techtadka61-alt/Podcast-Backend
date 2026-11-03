import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Browser origins allowed to send cookie-authenticated writes (comma separated). Used for CSRF checks.
  APP_ORIGINS: z.string().min(1).default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1),
  // The URI may not name a database (Atlas often doesn't), so it is set explicitly.
  MONGODB_DB: z.string().min(1).default('article_portal'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().min(1).default('article-portal'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  // Set to true when served over HTTPS.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  UPLOAD_DIR: z.string().min(1).default('./storage/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(20),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a misconfigured instance must never start serving traffic.
  console.error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && /change-?me/i.test(env.JWT_ACCESS_SECRET)) {
  console.error('Refusing to start: JWT_ACCESS_SECRET still uses the example placeholder.');
  process.exit(1);
}

export const isProduction = env.NODE_ENV === 'production';

export const allowedOrigins: readonly string[] = env.APP_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
