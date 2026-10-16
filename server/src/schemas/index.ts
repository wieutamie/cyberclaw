import { z } from 'zod';

export const SUPPORTED_LANGUAGES = [
  'en',
  'id',
  'ms',
  'es',
  'pt',
  'fr',
  'de',
  'it',
  'nl',
  'ru',
  'tr',
  'ar',
  'hi',
  'th',
  'vi',
  'zh',
  'ja',
  'ko',
] as const;

export const updateSettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
  time_format: z.enum(['12h', '24h']).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  default_tab: z.enum(['file', 'url', 'hash', 'history']).optional(),
  danger_threshold: z.number().int().min(1).max(10).optional(),
  show_upload_warning: z.boolean().optional(),
  auto_open_report: z.boolean().optional(),
  history_retention_days: z.number().int().min(1).max(3650).nullable().optional(),
});

export const apiKeySchema = z.object({
  // VirusTotal API keys are 64-char hex. Accept an optional body during test.
  apiKey: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, 'API Key harus 64 karakter heksadesimal')
    .optional(),
});

export const scanUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Format URL tidak valid')
    .max(2048, 'URL terlalu panjang'),
});

export const scanHashSchema = z.object({
  hash: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/, 'Hash harus MD5 (32), SHA1 (40), atau SHA256 (64)'),
});

export const scanIdParamSchema = z.object({
  scanId: z.string().uuid('Scan ID tidak valid'),
});
