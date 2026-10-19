import { supabase, memoryStore } from '../lib/supabase.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { env } from '../config/env.js';
import { vtClient } from '../lib/virustotal/client.js';
import { ApiKeyRecord } from '../types/index.js';

export class ApiKeyService {
  /**
   * Short-lived cache of resolved keys.
   *
   * The scan page polls `/scans/:id/status` every ~1.2s, and each poll resolves
   * the key — which without this cache meant a Supabase round-trip per poll on
   * top of the actual VirusTotal call. A 60s TTL keeps that off the hot path
   * while still picking up a newly-saved key almost immediately.
   */
  private static keyCache = new Map<string, { key: string | null; at: number }>();
  private static readonly KEY_CACHE_TTL_MS = 60_000;

  private static cacheKey(userId: string, key: string | null): string | null {
    this.keyCache.set(userId, { key, at: Date.now() });
    return key;
  }

  static async getUserApiKey(userId: string): Promise<string | null> {
    const cached = this.keyCache.get(userId);
    if (cached && Date.now() - cached.at < this.KEY_CACHE_TTL_MS) {
      return cached.key;
    }

    // 1. Check user key
    if (supabase) {
      const { data, error } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.encrypted_key) {
        try {
          return this.cacheKey(userId, decrypt(data.encrypted_key));
        } catch {
          // decryption failed
        }
      }
    } else {
      const record = memoryStore.apiKeys.get(userId);
      if (record?.encrypted_key) {
        try {
          return this.cacheKey(userId, decrypt(record.encrypted_key));
        } catch {
          // decryption failed
        }
      }
    }

    // 2. Fallback to system key if provided
    if (env.SYSTEM_VT_API_KEY) {
      return this.cacheKey(userId, env.SYSTEM_VT_API_KEY);
    }

    return this.cacheKey(userId, null);
  }

  static async getKeyMetadata(
    userId: string
  ): Promise<{ hasKey: boolean; last4: string | null }> {
    if (supabase) {
      const { data } = await supabase
        .from('api_keys')
        .select('last4')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        return { hasKey: true, last4: data.last4 };
      }
    } else {
      const record = memoryStore.apiKeys.get(userId);
      if (record) {
        return { hasKey: true, last4: record.last4 };
      }
    }

    if (env.SYSTEM_VT_API_KEY) {
      const last4 = env.SYSTEM_VT_API_KEY.slice(-4);
      return { hasKey: true, last4: `(Sys) ${last4}` };
    }

    return { hasKey: false, last4: null };
  }

  static async saveApiKey(userId: string, rawKey: string): Promise<void> {
    const encrypted = encrypt(rawKey);
    const last4 = rawKey.slice(-4);
    const now = new Date().toISOString();
    this.keyCache.delete(userId);

    if (supabase) {
      const { error } = await supabase.from('api_keys').upsert({
        user_id: userId,
        provider: 'virustotal',
        encrypted_key: encrypted,
        last4,
        last_verified_at: now,
        created_at: now,
      });

      if (error) {
        throw new Error(`Failed to save API key: ${error.message}`);
      }
    } else {
      const record: ApiKeyRecord = {
        user_id: userId,
        provider: 'virustotal',
        encrypted_key: encrypted,
        last4,
        last_verified_at: now,
        created_at: now,
      };
      memoryStore.apiKeys.set(userId, record);
    }
  }

  static async removeApiKey(userId: string): Promise<void> {
    this.keyCache.delete(userId);
    if (supabase) {
      await supabase.from('api_keys').delete().eq('user_id', userId);
    } else {
      memoryStore.apiKeys.delete(userId);
    }
  }

  static async testApiKey(key: string): Promise<boolean> {
    // Local dev convenience: the all-zero key is a documented placeholder and is
    // never accepted in production.
    if (key === '0'.repeat(64)) {
      return env.NODE_ENV !== 'production';
    }
    return await vtClient.testApiKey(key);
  }
}
