export type ScanBucket = 'danger' | 'warning' | 'clean' | 'notFound' | 'failed' | 'pending';

export const ALL_BUCKETS: readonly ScanBucket[] = [
  'danger',
  'warning',
  'clean',
  'notFound',
  'failed',
  'pending',
] as const;

/**
 * Map a single scan to exactly one analytics bucket.
 *
 * The critical property is *totality*: every scan lands in one bucket, so the
 * sum of the donut slices always equals Total Scans. The previous version
 * chained `else if` on verdict only, so `failed` / `in_progress` / `queued`
 * scans were counted in the total but appeared in no slice — the donut then
 * recomputed its own smaller total and disagreed with the KPI card.
 *
 * Precedence: a verdict wins over state (a `completed` scan always has one),
 * then `not_found` (a resolved "VT has nothing" outcome), then the terminal
 * error states, and everything else is still in flight.
 */
export function classifyScan(scan: {
  verdict?: string | null;
  state?: string | null;
}): ScanBucket {
  if (scan.verdict === 'danger') return 'danger';
  if (scan.verdict === 'warning') return 'warning';
  if (scan.verdict === 'clean') return 'clean';
  if (scan.state === 'not_found') return 'notFound';
  if (
    scan.state === 'failed' ||
    scan.state === 'timeout' ||
    scan.state === 'cancelled'
  ) {
    return 'failed';
  }
  return 'pending';
}
