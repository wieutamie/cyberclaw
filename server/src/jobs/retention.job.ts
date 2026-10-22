import cron from 'node-cron';
import { supabase, memoryStore } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/**
 * Finalise scans that were abandoned mid-flight.
 *
 * The lazy reaper in `ScanService.getScanStatus` only fires when someone opens
 * the scan — a scan the user never revisits stays `in_progress` forever. Those
 * rows are the ones that used to be silently missing from the Analytics donut,
 * so they must eventually reach a terminal state even with no traffic.
 *
 * This sweep is deliberately conservative: it only touches scans that are still
 * unresolved AND whose last activity is older than `VT_SCAN_MAX_AGE_MS`.
 */
export async function runStaleScanSweep(): Promise<number> {
  const maxAgeMs = env.VT_SCAN_MAX_AGE_MS || 30 * 60 * 1000;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const UNRESOLVED = ['uploading', 'queued', 'in_progress'];

  let swept = 0;

  if (supabase) {
    try {
      // Activity is `last_polled_at` when present, otherwise `created_at`.
      // Using created_at alone would sweep a freshly rescanned OLD record
      // (rescan reuses the row), which is exactly what we must not do.
      const { data, error } = await supabase
        .from('scans')
        .update({ state: 'timeout' })
        .in('state', UNRESOLVED)
        .is('verdict', null)
        .or(
          `and(last_polled_at.is.null,created_at.lt.${cutoff}),last_polled_at.lt.${cutoff}`
        )
        .select('id');

      if (error) {
        logger.warn({ err: error }, 'Stale scan sweep failed');
      } else {
        swept = data?.length ?? 0;
      }
    } catch (err) {
      logger.warn({ err }, 'Stale scan sweep threw');
    }
  }

  // Always sweep the in-process store too; it is the only store when Supabase
  // is not configured (local dev / preview).
  for (const [scanId, scan] of memoryStore.scans.entries()) {
    const unresolved = UNRESOLVED.includes(scan.state);
    if (!unresolved || scan.verdict) continue;
    const lastActivity = Math.max(
      new Date(scan.created_at).getTime(),
      scan.last_polled_at ? new Date(scan.last_polled_at).getTime() : 0
    );
    if (Date.now() - lastActivity > maxAgeMs) {
      scan.state = 'timeout';
      memoryStore.scans.set(scanId, scan);
      swept++;
    }
  }

  if (swept > 0) {
    logger.info({ swept }, 'Finalised abandoned scans as timeout');
  }
  return swept;
}

/**
 * Runs the history-retention cleanup once: deletes scans older than each
 * user's configured `history_retention_days`.
 *
 * Extracted from the cron callback so it can ALSO be invoked on demand by the
 * Vercel Cron endpoint (`GET /api/internal/retention`) — a serverless platform
 * has no long-lived process for `node-cron` to tick in.
 */
export async function runRetentionCleanup(): Promise<void> {
  logger.info('Starting history retention cleanup job...');

  // Finalise abandoned scans first — they are still within the retention
  // window, so they would otherwise linger as permanently-pending rows.
  try {
    await runStaleScanSweep();
  } catch (err) {
    logger.warn({ err }, 'Stale scan sweep failed (continuing with retention)');
  }

  try {
    if (supabase) {
      // Query users with history_retention_days set
      const { data: settingsList } = await supabase
        .from('user_settings')
        .select('user_id, history_retention_days')
        .not('history_retention_days', 'is', null);

      if (settingsList) {
        for (const s of settingsList) {
          if (s.history_retention_days && s.history_retention_days > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - s.history_retention_days);
            await supabase
              .from('scans')
              .delete()
              .eq('user_id', s.user_id)
              .lt('created_at', cutoff.toISOString());
          }
        }
      }
    } else {
      // Memory store cleanup
      for (const [userId, s] of memoryStore.userSettings.entries()) {
        if (s.history_retention_days && s.history_retention_days > 0) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - s.history_retention_days);
          for (const [scanId, scan] of memoryStore.scans.entries()) {
            if (
              scan.user_id === userId &&
              new Date(scan.created_at) < cutoff
            ) {
              memoryStore.scans.delete(scanId);
            }
          }
        }
      }
    }
    logger.info('Retention cleanup completed successfully.');
  } catch (err) {
    logger.error({ err }, 'Retention cleanup job failed');
    throw err;
  }
}

export function startRetentionJob() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    void runRetentionCleanup();
  });
}
