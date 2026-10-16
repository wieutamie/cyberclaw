import { describe, it, expect } from 'vitest';
import { mapVendorResults, aggregateStats } from './mappers.js';
import { CANONICAL_VENDORS, CANONICAL_VENDOR_COUNT, resolveCanonicalVendor } from './vendors.js';
import { calculateVerdict, isCleanCategory } from './verdict.js';

describe('canonical vendors', () => {
  it('has exactly 71 vendors', () => {
    expect(CANONICAL_VENDOR_COUNT).toBe(71);
  });

  it('has no duplicates', () => {
    const unique = new Set(CANONICAL_VENDORS.map((v) => v.toLowerCase()));
    expect(unique.size).toBe(71);
  });

  it('resolves engine names case/dash-insensitively', () => {
    expect(resolveCanonicalVendor('kaspersky')).toBe('Kaspersky');
    expect(resolveCanonicalVendor('ESET-NOD32')).toBe('ESET-NOD32');
    expect(resolveCanonicalVendor('esetnod32')).toBe('ESET-NOD32');
    expect(resolveCanonicalVendor('Not A Real Engine')).toBeNull();
  });
});

describe('mapVendorResults — selalu tepat 71 vendor', () => {
  it('returns 71 undetected vendors when no VT results', () => {
    const vendors = mapVendorResults(undefined);
    expect(vendors).toHaveLength(71);
    expect(vendors.every((v) => v.category === 'undetected')).toBe(true);
  });

  it('pads missing engines as undetected and drops non-canonical engines', () => {
    const vendors = mapVendorResults({
      kaspersky: { engine_name: 'Kaspersky', category: 'malicious', result: 'Trojan.X' },
      totally_made_up: { engine_name: 'BogusEngine', category: 'malicious', result: 'Nope' },
    });
    expect(vendors).toHaveLength(71);
    const kav = vendors.find((v) => v.engine_name === 'Kaspersky');
    expect(kav?.category).toBe('malicious');
    // Non-canonical engine must be dropped.
    expect(vendors.find((v) => v.engine_name === 'BogusEngine')).toBeUndefined();
    // All other engines padded undetected (clean).
    expect(vendors.filter((v) => v.category === 'undetected')).toHaveLength(70);
  });
});

describe('undetected dihitung CLEAN', () => {
  it('all-undetected -> clean verdict', () => {
    const vendors = mapVendorResults(undefined);
    const stats = aggregateStats(vendors);
    expect(calculateVerdict(stats, 3)).toBe('clean');
  });

  it('isCleanCategory treats undetected/harmless/timeout as clean', () => {
    expect(isCleanCategory('undetected')).toBe(true);
    expect(isCleanCategory('harmless')).toBe(true);
    expect(isCleanCategory('timeout')).toBe(true);
    expect(isCleanCategory('failure')).toBe(true);
    expect(isCleanCategory('type-unsupported')).toBe(true);
    expect(isCleanCategory('suspicious')).toBe(false);
    expect(isCleanCategory('malicious')).toBe(false);
  });

  it('aggregateStats counts canonical categories consistently', () => {
    const vendors = mapVendorResults({
      kaspersky: { engine_name: 'Kaspersky', category: 'malicious', result: 'X' },
      avast: { engine_name: 'Avast', category: 'suspicious', result: 'Y' },
      clamav: { engine_name: 'ClamAV', category: 'harmless', result: null },
    });
    const stats = aggregateStats(vendors);
    expect(stats.malicious).toBe(1);
    expect(stats.suspicious).toBe(1);
    expect(stats.harmless).toBe(1);
    expect(stats.undetected).toBe(68);
    expect(stats.malicious + stats.suspicious + stats.harmless + stats.undetected).toBe(71);
  });
});
