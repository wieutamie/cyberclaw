import { Router } from 'express';
import { runRetentionCleanup } from '../jobs/retention.job.js';
import { env } from '../config/env.js';

export const internalRouter = Router();

/**
 * Retention cleanup trigger for serverless deployments.
 *
 * On a persistent host the daily `node-cron` job (startRetentionJob) handles
 * this. On Vercel there is no long-lived process, so `vercel.json` schedules a
 * Cron Job that calls this endpoint instead. It is protected by a shared secret
 * so it cannot be triggered by the public.
 */
internalRouter.get('/retention', async (req, res) => {
  const secret = env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  if (!secret || provided !== secret) {
    return res.status(401).json({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret.' },
    });
  }

  try {
    await runRetentionCleanup();
    return res.status(200).json({ ok: true, data: { ran: true } });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: { code: 'RETENTION_FAILED', message: 'Retention cleanup failed.' },
    });
  }
});
