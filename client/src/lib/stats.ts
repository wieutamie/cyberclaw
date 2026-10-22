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

/**
 * Engines that actually returned a verdict for this item.
 *
 * Excludes `timeout`, `failure` and `unsupported`, because those engines never
 * answered: they did not clear the file, they simply had no opinion. They still
 * belong in `totalEngines` (that is how many engines the scan covered), but
 * they must NOT sit in the denominator of a detection percentage — otherwise a
 * scan where VT is slow or rate-limited silently deflates the score. Example:
 * 3 flags out of 70 engines where 30 timed out is 3/40 = 7.5% of the engines
 * that answered, not 3/70 = 4%.
 *
 * `undetected` IS counted: that engine ran and found nothing, which is a real
 * "no threat" answer, not a missing one.
 */
export function respondedEngines(stats?: Partial<ScanStats> | null): number {
  if (!stats) return 0;
  return (
    (stats.malicious || 0) +
    (stats.suspicious || 0) +
    (stats.harmless || 0) +
    (stats.undetected || 0)
  );
}

/** Engines that flagged the item as a threat (`malicious` + `suspicious`). */
export function flaggedEngines(stats?: Partial<ScanStats> | null): number {
  if (!stats) return 0;
  return (stats.malicious || 0) + (stats.suspicious || 0);
}

/**
 * Detection percentage shown in the donut: flagged engines over the engines
 * that actually answered.
 *
 * This is the single source of truth for that number so the scan result card
 * and the report sidebar can never drift apart. Returns a raw 0–100 float;
 * callers round for display.
 */
export function detectionPercent(stats?: Partial<ScanStats> | null): number {
  const responded = respondedEngines(stats);
  if (responded <= 0) return 0;
  return (flaggedEngines(stats) / responded) * 100;
}
