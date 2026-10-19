import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScanRecord } from '../types/index.js';

// In-memory store shared with the mocked supabase module.
const { scans } = vi.hoisted(() => ({ scans: new Map<string, ScanRecord>() }));

vi.mock('../lib/supabase.js', () => ({
  supabase: null,
  memoryStore: {
    profiles: new Map(),
    userSettings: new Map(),
    apiKeys: new Map(),
    scans,
  },
}));

import { HistoryService } from './history.service.js';

const USER = 'user-1';

function makeScan(id: string, userId = USER): ScanRecord {
  return {
    id,
    user_id: userId,
    type: 'file',
    item_label: `scan-${id}`,
    state: 'completed',
    verdict: 'clean',
    stats: {
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 71,
      timeout: 0,
      failure: 0,
      unsupported: 0,
    },
    vendor_results: [],
    sha256: null,
    created_at: new Date().toISOString(),
  } as unknown as ScanRecord;
}

beforeEach(() => {
  scans.clear();
});

describe('HistoryService.deleteScan', () => {
  it('removes the scan so it no longer appears in getHistory', async () => {
    scans.set('s1', makeScan('s1'));
    scans.set('s2', makeScan('s2'));

    const ok = await HistoryService.deleteScan(USER, 's1');
    expect(ok).toBe(true);

    const { items, total } = await HistoryService.getHistory(USER, { page: 1, pageSize: 10 });
    expect(total).toBe(1);
    expect(items.map((s) => s.id)).toEqual(['s2']);
  });

  it('does not delete another user\'s scan', async () => {
    scans.set('s1', makeScan('s1', 'other-user'));
    const ok = await HistoryService.deleteScan(USER, 's1');
    expect(ok).toBe(false);
    expect(scans.has('s1')).toBe(true);
  });
});

describe('HistoryService.clearAllHistory', () => {
  it('clears only the given user\'s scans', async () => {
    scans.set('a', makeScan('a', USER));
    scans.set('b', makeScan('b', USER));
    scans.set('c', makeScan('c', 'other-user'));

    await HistoryService.clearAllHistory(USER);

    const { total } = await HistoryService.getHistory(USER, { page: 1, pageSize: 10 });
    expect(total).toBe(0);
    expect(scans.has('c')).toBe(true);
  });
});

describe('HistoryService.getHistory', () => {
  it('returns an empty result (no stale resurrection) after deletion', async () => {
    scans.set('s1', makeScan('s1'));
    await HistoryService.deleteScan(USER, 's1');
    const { items, total } = await HistoryService.getHistory(USER, { page: 1, pageSize: 10 });
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });
});
