import { describe, it, expect, beforeEach } from 'vitest';
import { VTHashCache } from './hashCache.js';
import { ScanRecord } from '../../types/index.js';

const record = (over: Partial<ScanRecord> = {}): ScanRecord => ({
  id: 'original-id',
  user_id: 'original-user',
  type: 'hash',
  item_label: 'abc',
  item_sha256: 'abc',
  state: 'completed',
  verdict: 'danger',
  stats: {
    malicious: 1,
    suspicious: 0,
    harmless: 0,
    undetected: 0,
    timeout: 0,
    failure: 0,
    unsupported: 0,
  },
  vendor_results: [{ engine_name: 'A', category: 'malicious', result: 'EICAR' }],
  created_at: '2020-01-01T00:00:00.000Z',
  completed_at: '2020-01-01T00:00:00.000Z',
  ...over,
});

describe('VTHashCache', () => {
  let cache: VTHashCache;

  beforeEach(() => {
    cache = new VTHashCache(60_000);
  });

  it('returns the record it stored', () => {
    cache.set('abc', record());
    expect(cache.get('abc')?.verdict).toBe('danger');
  });

  it('returns null for unknown or expired entries', () => {
    expect(cache.get('missing')).toBeNull();
    const expired = new VTHashCache(-1);
    expired.set('abc', record());
    expect(expired.get('abc')).toBeNull();
  });

  it('hands back a record that still carries the ORIGINAL owner', () => {
    // Documents the trap callers must handle: a cached record is owned by
    // whoever scanned it first. createHashScan must clone it onto the current
    // user and scan id — returning it verbatim made the new scan 404 for its
    // own creator and left a `queued` row that never completed.
    cache.set('abc', record());
    const hit = cache.get('abc')!;
    expect(hit.user_id).toBe('original-user');
    expect(hit.id).toBe('original-id');
  });
});
