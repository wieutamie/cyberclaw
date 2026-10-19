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
  /**
   * Cache of anonymous ids already upserted into Supabase. Every API call goes
   * through `anonSession` → `ensure()`, and the scan page polls status every
   * ~1.5s, so without this memo the server would fire a redundant Supabase
   * round-trip on *every* poll — a big chunk of the perceived "scan is slow"
   * latency. Once an id is known to exist, later requests skip the network hop.
   */
  private static ensured = new Set<string>();
  private static readonly MAX_CACHED = 5000;

  static async ensure(id: string): Promise<void> {
    if (!supabase) return;
    if (this.ensured.has(id)) return;
    try {
      await supabase
        .from('anon_users')
        .upsert(
          { id, last_seen_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      this.ensured.add(id);
      if (this.ensured.size > this.MAX_CACHED) this.ensured.clear();
    } catch {
      // Ignore: table may not exist yet (migrations not applied) or transient.
    }
  }
}
