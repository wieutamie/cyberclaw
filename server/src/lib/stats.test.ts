import { describe, it, expect } from 'vitest';
import { totalEngines } from './stats.js';

describe('totalEngines', () => {
  it('sums ALL seven categories, not just the big four', () => {
    // Real-world shape: VT reported 71 vendors for this file, but only 60
    // were in the four big buckets. The old four-category sum silently
    // under-reported the total (60 instead of 71) in the CSV export.
    const stats = {
      malicious: 1,
      suspicious: 2,
      harmless: 50,
      undetected: 7,
      timeout: 6,
      failure: 4,
      unsupported: 1,
    };
    expect(totalEngines(stats)).toBe(71);
  });

  it('returns 0 for missing stats', () => {
    expect(totalEngines(null)).toBe(0);
    expect(totalEngines(undefined)).toBe(0);
  });
});
