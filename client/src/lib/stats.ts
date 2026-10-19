import { ScanStats } from '../types/index.js';

/**
 * Total number of engines a scan was evaluated against.
 *
 * IMPORTANT: this must include ALL seven canonical categories — not just the
 * four "big" ones. VirusTotal can report engines as `type-unsupported`,
 * `timeout`, or `failure`; those engines still appear as vendor cards, so
 * omitting them makes the UI show e.g. "/66 Vendor" while 71 cards render.
 * The server guarantees the seven categories sum to exactly 71 (the canonical
 * vendor count), so this helper yields the true engine total.
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
