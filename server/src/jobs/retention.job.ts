import cron from 'node-cron';
import { supabase, memoryStore } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export function startRetentionJob() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting daily history retention cleanup job...');
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
    }
  });
}
