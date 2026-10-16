import { supabase, memoryStore } from '../lib/supabase.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { env } from '../config/env.js';
import { vtClient } from '../lib/virustotal/client.js';
import { ApiKeyRecord } from '../types/index.js';

export class ApiKeyService {
  static async getUserApiKey(userId: string): Promise<string | null> {
    // 1. Check user key
    if (supabase) {
      const { data, error } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.encrypted_key) {
        try {
          return decrypt(data.encrypted_key);
        } catch {
          // decryption failed
        }
      }
    } else {
      const record = memoryStore.apiKeys.get(userId);
      if (record?.encrypted_key) {
        try {
          return decrypt(record.encrypted_key);
        } catch {
          // decryption failed
        }
      }
    }

    // 2. Fallback to system key if provided
    if (env.SYSTEM_VT_API_KEY) {
      return env.SYSTEM_VT_API_KEY;
    }

    return null;
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
