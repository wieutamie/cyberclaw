/**
 * One-off maintenance script: delete ALL scan-history rows.
 *
 * Only touches the `scans` table — accounts, settings, and API keys are left
 * untouched. Works against Supabase when configured; otherwise it just clears
 * the in-memory store (which is empty on boot anyway).
 *
 * Usage (from the `server/` folder):
 *   npx tsx src/scripts/clear-history.ts
 */
import { supabase, memoryStore } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

async function main(): Promise<void> {
  if (supabase) {
    // `.neq('id', ...)` makes the delete match every row (a bare `.delete()`
    // with no filter is rejected by PostgREST as a safety guard).
    const { error } = await supabase
      .from('scans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      // PGRST205 = table not found in schema cache → migrations were never run,
      // so there is nothing in Supabase to clear. Treat as a soft success.
      if (error.code === 'PGRST205') {
        logger.warn(
          'Table "public.scans" does not exist in Supabase (migrations not applied). ' +
            'Skipping Supabase clear — history lives in the browser localStorage instead.'
        );
      } else {
        logger.error({ err: error }, 'Failed to clear scan history from Supabase');
        process.exitCode = 1;
        return;
      }
    } else {
      logger.info('Scan history cleared from Supabase (all rows in "scans").');
    }
  } else {
    const count = memoryStore.scans.size;
    memoryStore.scans.clear();
    logger.info({ count }, 'Supabase not configured — cleared in-memory scan store.');
  }

  // Local mock/offline records live in the browser; remind the caller too.
  logger.info('Reminder: browser mock history (localStorage key "cyberclaw_mock_scans") is client-side.');
}

main().catch((err) => {
  logger.error({ err }, 'Unexpected failure while clearing scan history');
  process.exitCode = 1;
});
