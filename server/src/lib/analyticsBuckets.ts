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
export type DonutSliceKey = 'danger' | 'warning' | 'clean' | 'undetected';

/**
 * The four donut slices the UI mockup shows. `undetected` merges the three
 * "no verdict" buckets (notFound + pending + failed) so the legend stays short,
 * while `breakdown` keeps the individual counts for the tooltip.
 *
 * Invariant: sum(slices.value) === sum(all six buckets) === totalScans.
 */
export function toDonutSlices(counts: Record<ScanBucket, number>): Array<{
  key: DonutSliceKey;
  name: string;
  value: number;
  color: string;
  breakdown: null | { notFound: number; pending: number; failed: number };
}> {
  return [
    { key: 'danger', name: 'Danger', value: counts.danger, color: '#FF0000', breakdown: null },
    { key: 'warning', name: 'Warning', value: counts.warning, color: '#FF7300', breakdown: null },
    { key: 'clean', name: 'Clean', value: counts.clean, color: '#11FF00', breakdown: null },
    {
      key: 'undetected',
      name: 'Undetected',
      value: counts.notFound + counts.pending + counts.failed,
      color: '#64748B',
      breakdown: {
        notFound: counts.notFound,
        pending: counts.pending,
        failed: counts.failed,
      },
    },
  ];
}

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
