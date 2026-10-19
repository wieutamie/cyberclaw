import { describe, it, expect } from 'vitest';
import { totalEngines } from './stats.js';

describe('totalEngines', () => {
  it('sums ALL seven categories, not just the big four', () => {
    // Real EICAR scenario: 47 malicious + 19 undetected + 5 type-unsupported = 71.
    const total = totalEngines({
      malicious: 47,
      suspicious: 0,
      harmless: 0,
      undetected: 19,
      timeout: 0,
      failure: 0,
      unsupported: 5,
    });
    expect(total).toBe(71);
  });

  it('includes timeout and failure buckets', () => {
    const total = totalEngines({
      malicious: 1,
      suspicious: 1,
      harmless: 1,
      undetected: 60,
      timeout: 4,
      failure: 3,
      unsupported: 1,
    });
    expect(total).toBe(71);
  });

  it('returns 0 for missing stats', () => {
    expect(totalEngines(undefined)).toBe(0);
    expect(totalEngines(null)).toBe(0);
  });

  it('tolerates partial stats objects', () => {
    expect(totalEngines({ malicious: 5 } as any)).toBe(5);
  });
});
