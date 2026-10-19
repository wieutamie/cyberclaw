import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

/**
 * Liveness + configuration probe.
 *
 * `persistence` menandakan backend penyimpanan yang AKTIF:
 *   - 'supabase' → data anonim (scans/settings) benar-benar persisten di DB.
 *   - 'memory'   → fallback in-memory (data HILANG saat instance restart).
 *
 * Hanya mengungkap nilai non-sensitif (enum & boolean); URL/secret tidak pernah
 * dikembalikan di sini.
 */
healthRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    persistence: supabase ? 'supabase' : 'memory',
    vtConfigured: Boolean(env.SYSTEM_VT_API_KEY),
  });
});

