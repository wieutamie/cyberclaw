import { describe, it, expect } from 'vitest';
import { mapVendorResults, aggregateStats, hasVendorData } from './mappers.js';
import { calculateVerdict, isCleanCategory } from './verdict.js';

describe('mapVendorResults — data asli VirusTotal', () => {
  it('returns an empty list when VT reported nothing', () => {
    expect(mapVendorResults(undefined)).toHaveLength(0);
  });

  it('reports hasVendorData=false when VT reported nothing', () => {
    expect(hasVendorData(mapVendorResults(undefined))).toBe(false);
    expect(hasVendorData(mapVendorResults({}))).toBe(false);
    expect(hasVendorData([])).toBe(false);
  });

  it('reports hasVendorData=true as soon as one engine is reported', () => {
    expect(
      hasVendorData(mapVendorResults({ a: { engine_name: 'A', category: 'undetected' } }))
    ).toBe(true);
  });

  it('an empty VT result set is NOT clean', () => {
    // Regresi: laporan kosong menghasilkan stats 0/0, dan calculateVerdict
    // menganggap 0 malicious + 0 suspicious = 'clean'. Itu menyesatkan: tidak
    // ada satu pun engine yang memeriksa file. hasVendorData() harus mencegah
    // pemanggil menyimpan verdict 'clean' untuk data kosong.
    const vendors = mapVendorResults({});
    const stats = aggregateStats(vendors);
    expect(hasVendorData(vendors)).toBe(false);
    // calculateVerdict sendiri tetap 'clean' untuk 0/0 — karena itu guard-nya
    // ada di pemanggil (scan.service), bukan di calculateVerdict.
    expect(calculateVerdict(stats, 3)).toBe('clean');
    expect(hasVendorData(vendors)).toBe(false);
  });

  it('keeps every engine VT reported, without padding', () => {
    const vendors = mapVendorResults({
      kaspersky: { engine_name: 'Kaspersky', category: 'malicious', result: 'Trojan.X' },
      avast: { engine_name: 'Avast', category: 'undetected', result: null },
      some_new_engine: { engine_name: 'Brand New Engine', category: 'harmless', result: null },
    });
    // No invented engines, no dropped engines: exactly the 3 VT returned.
    expect(vendors).toHaveLength(3);
    expect(vendors.find((v) => v.engine_name === 'Brand New Engine')?.category).toBe('harmless');
    expect(vendors.find((v) => v.engine_name === 'Kaspersky')?.category).toBe('malicious');
  });

  it('falls back to the result key when engine_name is missing', () => {
    const vendors = mapVendorResults({
      weird_engine: { category: 'malicious', result: 'X' },
    });
    expect(vendors[0].engine_name).toBe('weird_engine');
  });
});

describe('undetected dihitung CLEAN', () => {
  it('all-undetected -> clean verdict', () => {
    const vendors = mapVendorResults({
      a: { engine_name: 'A', category: 'undetected', result: null },
      b: { engine_name: 'B', category: 'undetected', result: null },
    });
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

  it('aggregateStats counts every reported engine exactly once', () => {
    const vendors = mapVendorResults({
      kaspersky: { engine_name: 'Kaspersky', category: 'malicious', result: 'X' },
      avast: { engine_name: 'Avast', category: 'suspicious', result: 'Y' },
      clamav: { engine_name: 'ClamAV', category: 'harmless', result: null },
      eset: { engine_name: 'ESET-NOD32', category: 'undetected', result: null },
    });
    const stats = aggregateStats(vendors);
    expect(stats.malicious).toBe(1);
    expect(stats.suspicious).toBe(1);
    expect(stats.harmless).toBe(1);
    expect(stats.undetected).toBe(1);
    const total =
      stats.malicious + stats.suspicious + stats.harmless + stats.undetected +
      stats.timeout + stats.failure + stats.unsupported;
    expect(total).toBe(vendors.length);
  });

  it('stats total matches the vendor list length (no inflation)', () => {
    // VT reports 60 engines for this file; stats must total 60, not 71.
    const raw: Record<string, { engine_name: string; category: string }> = {};
    for (let i = 0; i < 60; i++) {
      raw[`engine_${i}`] = {
        engine_name: `Engine ${i}`,
        category: i < 40 ? 'malicious' : i < 45 ? 'type-unsupported' : 'undetected',
      };
    }
    const vendors = mapVendorResults(raw as any);
    const stats = aggregateStats(vendors);

    expect(vendors).toHaveLength(60);
    expect(stats.malicious).toBe(40);
    const total =
      stats.malicious + stats.suspicious + stats.harmless + stats.undetected +
      stats.timeout + stats.failure + stats.unsupported;
    expect(total).toBe(60);
  });
});
