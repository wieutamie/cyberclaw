import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { Profile, UserSettings, ApiKeyRecord, ScanRecord } from '../types/index.js';

let supabaseClient: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info('Connected to Supabase with Service Role');
  } catch (err) {
    logger.warn('Failed to initialize Supabase client, falling back to local store');
  }
} else {
  logger.info('Supabase credentials not fully specified. Running with local in-memory persistence store.');
}

export const supabase = supabaseClient;

/**
 * In-memory fallback repository for local offline development & testing.
 *
 * NOTE: this store is intentionally EMPTY on boot. Cyber Claw has no user
 * accounts anymore — each visitor is an anonymous session, and their scans /
 * settings are partitioned by the server-issued anonymous id.
 */
class InMemoryStore {
  profiles = new Map<string, Profile>();
  userSettings = new Map<string, UserSettings>();
  apiKeys = new Map<string, ApiKeyRecord>();
  scans = new Map<string, ScanRecord>();
}

export const memoryStore = new InMemoryStore();

