import { ScanStats } from '../types/index.js';

/**
 * Total number of engines a scan was evaluated against.
 *
 * Sums every category that VirusTotal actually reported. This MUST stay in
 * sync with `client/src/lib/stats.ts` — the two are the same rule, and the
 * previous duplicated four-category sum in `history.service.ts` silently
 * under-reported totals (it dropped `timeout`, `failure`, `unsupported`).
 *
 * Keep the seven buckets here and nowhere else.
 */
export function totalEngines(stats?: Partial<ScanStats> | null): number {
  if (!stats) return 0;
  return (
    (stats.malicious || 0) +
    (stats.suspicious || 0) +
    (stats.harmless || 0) +
    (stats.undetected || 0) +
    (stats.timeout || 0) +
    (stats.failure || 0) +
    (stats.unsupported || 0)
  );
}
