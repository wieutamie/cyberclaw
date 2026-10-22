import { describe, it, expect } from 'vitest';
import { assertConsistentStats } from './statsConsistency.js';
import { aggregateStats } from './virustotal/mappers.js';
import { VendorResult } from '../types/index.js';

const vendor = (category: VendorResult['category']): VendorResult => ({
  engine_name: 'x',
  category,
  result: null,
});

describe('assertConsistentStats', () => {
  it('accepts stats that were aggregated from the same vendor list', () => {
    const vendors = [
      vendor('malicious'),
      vendor('harmless'),
      vendor('undetected'),
      vendor('timeout'),
      vendor('type-unsupported'),
    ];
    expect(() => assertConsistentStats(aggregateStats(vendors), vendors)).not.toThrow();
  });

  it('rejects the real production mismatch (90 engines vs 71 cards)', () => {
    // Exactly the shape found in prod: stats derived from VT's summary object
    // (90 engines) while the card list was padded to 71 vendors.
    const vendors = Array.from({ length: 71 }, () => vendor('undetected'));
    const stats = {
      malicious: 66,
      suspicious: 0,
      harmless: 0,
      undetected: 19,
      timeout: 0,
      failure: 0,
      unsupported: 5,
    };
    expect(() => assertConsistentStats(stats, vendors)).toThrow(/90 engines vs 71/);
  });

  it('is a no-op when either side is absent', () => {
    expect(() => assertConsistentStats(undefined, [])).not.toThrow();
    expect(() => assertConsistentStats(aggregateStats([]), undefined)).not.toThrow();
  });
});
