import { supabase } from '../lib/supabase.js';

/**
 * Ensures the anonymous user row referenced by `scans` / `user_settings` /
 * `api_keys` exists before those tables are written to.
 *
 * The server talks to Supabase with the service role, so this is a best-effort
 * upsert: when Supabase is not configured (local in-memory mode) it is a no-op,
 * and any error is swallowed so a missing migration never blocks scanning.
 */
export class AnonUserService {
  static async ensure(id: string): Promise<void> {
    if (!supabase) return;
    try {
      await supabase
        .from('anon_users')
        .upsert(
          { id, last_seen_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
    } catch {
      // Ignore: table may not exist yet (migrations not applied) or transient.
    }
  }
}
