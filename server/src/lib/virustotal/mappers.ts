import { ScanStats, VendorCategory, VendorResult } from '../../types/index.js';

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
 * Memetakan `last_analysis_results` mentah dari VirusTotal menjadi daftar
 * vendor APA ADANYA (data asli, tanpa padding dan tanpa pembuangan).
 *
 * Jaminan:
 * 1. Setiap engine yang dilaporkan VT muncul — tidak ada yang dibuang.
 * 2. Tidak ada engine fiktif/padding. Jika VT hanya melaporkan 60 engine,
 *    hasilnya 60 entri.
 * 3. `engine_name` memakai nama resmi VT (fallback ke key jika kosong).
 * 4. Urutan dipertahankan sesuai respons VT.
 *
 * Dengan begitu daftar vendor yang ditampilkan ke pengguna selalu identik
 * dengan yang benar-benar dikembalikan VirusTotal.
 */
export function mapVendorResults(
  resultsObj?: Record<string, RawEngineResult>
): VendorResult[] {
  if (!resultsObj || typeof resultsObj !== 'object') return [];

  const list: VendorResult[] = [];
  for (const [key, item] of Object.entries(resultsObj)) {
    if (!item || typeof item !== 'object') continue;
    list.push({
      engine_name: item.engine_name || key,
      category: normalizeCategory(item.category),
      result: item.result ?? null,
      method: item.method,
      engine_version: item.engine_version,
      engine_update: item.engine_update,
    });
  }
  return list;
}

/**
 * Apakah VirusTotal benar-benar melaporkan hasil engine untuk item ini?
 *
 * Ini penting karena `calculateVerdict` menganggap "tidak ada malicious dan
 * tidak ada suspicious" sebagai `clean`. Tanpa pengecekan ini, laporan yang
 * KOSONG (0 engine) akan salah ditampilkan sebagai "Clean" padahal tidak ada
 * satu pun engine yang memeriksa file/URL tersebut. Data kosong harus
 * diperlakukan sebagai "belum ada hasil", bukan "bersih".
 */
export function hasVendorData(vendors: VendorResult[]): boolean {
  return Array.isArray(vendors) && vendors.length > 0;
}

/**
 * Menyusun stats dari daftar vendor yang benar-benar dilaporkan VT, sehingga
 * angka pada kartu statistik SELALU konsisten dengan daftar vendor yang
 * ditampilkan (jumlah seluruh kategori = jumlah vendor di daftar).
 */
export function aggregateStats(vendors: VendorResult[]): ScanStats {
  return vendors.reduce(
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
}

