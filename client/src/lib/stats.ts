import { ScanStats } from '../types/index.js';

/**
 * Total number of engines a scan was evaluated against.
 *
 * Sums every category that VirusTotal actually reported for this scan. The
 * server builds `stats` directly from the vendor list returned by VT, so this
 * total always equals the number of vendor cards rendered.
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
