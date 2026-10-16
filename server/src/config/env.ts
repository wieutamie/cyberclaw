import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  ENCRYPTION_KEY: z
    .string()
    .default('dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleS1leGFtcGxlIQ=='),

  // --- Anonymous session signing ---
  // Secret used to sign the anonymous session tokens that partition each
  // visitor's scan history / settings. MUST be a strong random value in
  // production. A dev default is provided so the app runs out-of-the-box, but
  // it is rejected when NODE_ENV=production.
  JWT_SECRET: z.string().optional().default(''),

  SYSTEM_VT_API_KEY: z.string().optional().default(''),
  VT_BASE_URL: z.string().default('https://www.virustotal.com/api/v3'),
  VT_RATE_LIMIT_PER_MIN: z.string().default('4').transform((val) => parseInt(val, 10)),
  MAX_UPLOAD_MB: z.string().default('32').transform((val) => parseInt(val, 10)),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

const DEV_JWT_FALLBACK = 'dev-insecure-jwt-secret-change-me';

if (!env.JWT_SECRET) {
  if (env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set when NODE_ENV=production.');
    process.exit(1);
  }
  env.JWT_SECRET = DEV_JWT_FALLBACK;
}

// Prevent the insecure dev secret from silently reaching production.
if (env.NODE_ENV === 'production' && env.JWT_SECRET === DEV_JWT_FALLBACK) {
  console.error('FATAL: refusing to start in production with the default dev JWT secret.');
  process.exit(1);
}

