import { ScanStats, VendorCategory, VendorResult } from '../../types/index.js';
import {
  CANONICAL_VENDOR_COUNT,
  CANONICAL_VENDORS,
  resolveCanonicalVendor,
} from './vendors.js';

interface RawStats {
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
  timeout?: number;
  'confirmed-timeout'?: number;
  failure?: number;
  'type-unsupported'?: number;
  [key: string]: number | undefined;
}

interface RawEngineResult {
  category?: string;
  result?: string | null;
  method?: string;
  engine_name?: string;
  engine_version?: string;
  engine_update?: string;
}

export function mapStats(rawStats?: RawStats): ScanStats {
  const s = rawStats || {};
  return {
    malicious: s.malicious || 0,
    suspicious: s.suspicious || 0,
    harmless: s.harmless || 0,
    undetected: s.undetected || 0,
    timeout: (s.timeout || 0) + (s['confirmed-timeout'] || 0),
    failure: s.failure || 0,
    unsupported: s['type-unsupported'] || 0,
  };
}

/** Kategori VT yang tidak dikenali dipetakan ke `undetected` (dinilai clean). */
function normalizeCategory(raw?: string): VendorCategory {
  const allowed: VendorCategory[] = [
    'malicious',
    'suspicious',
    'harmless',
    'undetected',
    'timeout',
    'confirmed-timeout',
    'failure',
    'type-unsupported',
  ];
  if (raw && (allowed as string[]).includes(raw)) {
    return raw as VendorCategory;
  }
  return 'undetected';
}

/**
 * Memetakan hasil mentah VT ke daftar KANON 71 vendor.
 *
 * Jaminan keluaran (untuk file, URL, maupun hash):
 * 1. Selalu TEPAT `CANONICAL_VENDOR_COUNT` (71) entri — tidak lebih, tidak kurang.
 * 2. Engine VT di luar daftar kanon DIABAIKAN.
 * 3. Engine kanon yang tidak dikembalikan VT di-pad sebagai `undetected`
 *    (dinilai CLEAN) dengan `result: null`.
 * 4. Urutan keluaran mengikuti urutan kanon (indeks stabil).
 */
export function mapVendorResults(
  resultsObj?: Record<string, RawEngineResult>
): VendorResult[] {
  // Peta nama kanon -> hasil mentah VT (hanya untuk engine kanon).
  const byCanonical = new Map<string, RawEngineResult>();

  if (resultsObj && typeof resultsObj === 'object') {
    for (const [key, item] of Object.entries(resultsObj)) {
      if (!item || typeof item !== 'object') continue;
      const rawName = item.engine_name || key;
      const canonical = resolveCanonicalVendor(rawName);
      if (!canonical) continue; // engine di luar kanon -> diabaikan
      byCanonical.set(canonical, item);
    }
  }

  const list: VendorResult[] = CANONICAL_VENDORS.map((engine_name) => {
    const raw = byCanonical.get(engine_name);
    if (!raw) {
      // Pad: engine kanon yang tidak melapor -> undetected (clean).
      return {
        engine_name,
        category: 'undetected',
        result: null,
      };
    }
    return {
      engine_name,
      category: normalizeCategory(raw.category),
      result: raw.result ?? null,
      method: raw.method,
      engine_version: raw.engine_version,
      engine_update: raw.engine_update,
    };
  });

  // Sanity check: pastikan tepat 71 entri (jaga-jaga bila daftar kanon berubah).
  if (list.length !== CANONICAL_VENDOR_COUNT) {
    return list.slice(0, CANONICAL_VENDOR_COUNT);
  }
  return list;
}

/**
 * Menyusun stats dari daftar vendor kanon sehingga konsisten dengan hasil
 * `mapVendorResults` (jumlah engine = 71). `undetected`/`harmless`/dll. sudah
 * termasuk di dalam 71 sehingga tidak akan ada engine yang "hilang".
 *
 * `malicious` dan `suspicious` diambil dari stats mentah VT bila tersedia
 * (lebih akurat, termasuk engine di luar kanon), lalu dilengkapi hasil dari
 * daftar kanon sebagai fallback.
 */
export function aggregateStats(
  vendors: VendorResult[],
  rawStats?: RawStats
): ScanStats {
  const fromVendors = vendors.reduce(
    (acc, v) => {
      if (v.category === 'malicious') acc.malicious += 1;
      else if (v.category === 'suspicious') acc.suspicious += 1;
      else if (v.category === 'harmless') acc.harmless += 1;
      else if (v.category === 'undetected') acc.undetected += 1;
      else if (v.category === 'timeout' || v.category === 'confirmed-timeout')
        acc.timeout += 1;
      else if (v.category === 'failure') acc.failure += 1;
      else if (v.category === 'type-unsupported') acc.unsupported += 1;
      return acc;
    },
    {
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
      timeout: 0,
      failure: 0,
      unsupported: 0,
    } as ScanStats
  );

  const raw = rawStats || {};
  return {
    malicious: Math.max(fromVendors.malicious, raw.malicious || 0),
    suspicious: Math.max(fromVendors.suspicious, raw.suspicious || 0),
    harmless: fromVendors.harmless,
    undetected: fromVendors.undetected,
    timeout: fromVendors.timeout,
    failure: fromVendors.failure,
    unsupported: fromVendors.unsupported,
  };
}

