import { describe, it, expect } from 'vitest';
import { classifyScan, ALL_BUCKETS, toDonutSlices } from './analyticsBuckets.js';

describe('classifyScan', () => {
  it('maps each verdict to its own bucket', () => {
    expect(classifyScan({ verdict: 'danger', state: 'completed' })).toBe('danger');
    expect(classifyScan({ verdict: 'warning', state: 'completed' })).toBe('warning');
    expect(classifyScan({ verdict: 'clean', state: 'completed' })).toBe('clean');
  });

  it('prefers the verdict over the state', () => {
    // A scan can be `not_found` at state level but still carry a verdict from
    // an earlier successful analysis; the verdict is the user-facing outcome.
    expect(classifyScan({ verdict: 'danger', state: 'not_found' })).toBe('danger');
  });

  it('treats not_found as a resolved outcome, not a failure', () => {
    expect(classifyScan({ verdict: null, state: 'not_found' })).toBe('notFound');
  });

  it('buckets every terminal error state as failed', () => {
    expect(classifyScan({ verdict: null, state: 'failed' })).toBe('failed');
    expect(classifyScan({ verdict: null, state: 'timeout' })).toBe('failed');
    expect(classifyScan({ verdict: null, state: 'cancelled' })).toBe('failed');
  });

  it('buckets in-flight scans as pending', () => {
    expect(classifyScan({ verdict: null, state: 'queued' })).toBe('pending');
    expect(classifyScan({ verdict: null, state: 'in_progress' })).toBe('pending');
    expect(classifyScan({ verdict: null, state: 'uploading' })).toBe('pending');
  });

  it('never returns anything outside the declared bucket list', () => {
    const states = [
      'uploading', 'queued', 'in_progress', 'completed',
      'not_found', 'failed', 'timeout', 'cancelled', undefined,
    ];
    for (const state of states) {
      for (const verdict of [null, 'danger', 'warning', 'clean']) {
        expect(ALL_BUCKETS).toContain(classifyScan({ verdict, state }));
      }
    }
  });
});

describe('analytics totals invariant', () => {
  it('sum of buckets equals the number of scans (the bug that started this)', () => {
    // The production shape that exposed the bug: 53 completed, 8 failed,
    // 6 in_progress, 2 not_found = 69 scans, but only 53 landed in a bucket,
    // so the donut showed 53 while the KPI card showed 69.
    const scans: { verdict: string | null; state: string }[] = [
      ...Array.from({ length: 41 }, () => ({ verdict: 'clean', state: 'completed' })),
      ...Array.from({ length: 12 }, () => ({ verdict: 'danger', state: 'completed' })),
      ...Array.from({ length: 8 }, () => ({ verdict: null, state: 'failed' })),
      ...Array.from({ length: 6 }, () => ({ verdict: null, state: 'in_progress' })),
      ...Array.from({ length: 2 }, () => ({ verdict: null, state: 'not_found' })),
    ];

    const counts = Object.fromEntries(ALL_BUCKETS.map((b) => [b, 0])) as Record<string, number>;
    for (const scan of scans) counts[classifyScan(scan)]++;

    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(scans.length);
    expect(sum).toBe(69);
    expect(counts.clean).toBe(41);
    expect(counts.danger).toBe(12);
    expect(counts.failed).toBe(8);
    expect(counts.pending).toBe(6);
    expect(counts.notFound).toBe(2);
  });
});

describe('toDonutSlices', () => {
  const counts = {
    danger: 12,
    warning: 4,
    clean: 41,
    notFound: 2,
    pending: 6,
    failed: 8,
  };

  it('emits exactly the four slices the mockup legend shows', () => {
    const slices = toDonutSlices(counts);
    expect(slices.map((s) => s.key)).toEqual(['danger', 'warning', 'clean', 'undetected']);
  });

  it('keeps the invariant: slice sum === sum of all six buckets', () => {
    const slices = toDonutSlices(counts);
    const sliceSum = slices.reduce((a, s) => a + s.value, 0);
    const bucketSum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sliceSum).toBe(bucketSum);
    expect(sliceSum).toBe(73);
  });

  it('merges notFound + pending + failed into `undetected` and keeps the breakdown', () => {
    const undetected = toDonutSlices(counts).find((s) => s.key === 'undetected')!;
    expect(undetected.value).toBe(16);
    expect(undetected.breakdown).toEqual({ notFound: 2, pending: 6, failed: 8 });
  });

  it('leaves the verdict slices without a breakdown', () => {
    for (const s of toDonutSlices(counts)) {
      if (s.key !== 'undetected') expect(s.breakdown).toBeNull();
    }
  });
});
