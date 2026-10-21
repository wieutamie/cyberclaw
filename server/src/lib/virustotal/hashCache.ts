import { ScanRecord, ScanStats, Verdict, VendorResult } from '../../types/index.js';
import { calculateVerdict } from './verdict.js';
import { aggregateStats } from './mappers.js';

/**
 * In-memory cache for VirusTotal scan results keyed by SHA-256 hash.
 *
 * When the same file (same SHA-256) is scanned again within TTL, the backend
 * returns the cached result immediately without calling VirusTotal — saving
 * precious API quota on the free tier (4 req/min).
 *
 * TTL is set via VT_HASH_CACHE_TTL_HOURS env var (default 24).
 */
interface CacheEntry {
  record: ScanRecord;
  expiresAt: number;
}

class VTHashCache {
  private store = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs =
      (parseInt(process.env.VT_HASH_CACHE_TTL_HOURS ?? '24', 10) || 24) * 60 * 60 * 1000
  ) {}

  get(hash: string): ScanRecord | null {
    const entry = this.store.get(hash);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(hash);
      return null;
    }
    return entry.record;
  }

  set(hash: string, record: ScanRecord): void {
    this.store.set(hash, {
      record,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

/** Shared singleton instance. */
export const vtHashCache = new VTHashCache();

/** Build a completed scan record from raw VirusTotal attrs. */
export function buildScanRecord(
  scanId: string,
  userId: string,
  type: 'file' | 'url' | 'hash',
  itemLabel: string,
  attrs: any,
  extraMeta?: Record<string, unknown>
): ScanRecord {
  const vendor_results = attrs?.last_analysis_results
    ? Object.entries(attrs.last_analysis_results).map(([engine, data]: [string, any]) => ({
        engine_name: engine,
        category: (data?.category as any) ?? 'undetected',
        result: (data?.result as string) ?? null,
        method: (data?.method as string) ?? undefined,
        engine_version: (data?.engine_version as string) ?? undefined,
        engine_update: (data?.engine_update as string) ?? undefined,
      }))
    : [];

  const stats = aggregateStats(vendor_results);
  const verdict = calculateVerdict(stats, 3); // danger_threshold=3 default

  return {
    id: scanId,
    user_id: userId,
    type,
    item_label: itemLabel,
    item_sha256: attrs?.sha256 ?? null,
    state: 'completed' as const,
    verdict,
    stats,
    vendor_results: vendor_results.length ? vendor_results : null,
    item_meta: {
      size: attrs?.size,
      type_description: attrs?.type_description,
      names: attrs?.names,
      md5: attrs?.md5,
      sha1: attrs?.sha1,
      sha256: attrs?.sha256,
      first_submission_date: attrs?.first_submission_date,
      last_analysis_date: attrs?.last_analysis_date,
      ...extraMeta,
    },
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
}
