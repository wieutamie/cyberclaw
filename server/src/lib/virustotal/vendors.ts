import { VendorCategory } from '../../types/index.js';

/**
 * Daftar KANON 71 vendor/engine yang menjadi definisi resmi Cyber Claw.
 *
 * Aturan:
 * - Hanya engine yang ada di daftar ini yang ditampilkan ke pengguna.
 * - Engine VT di luar daftar ini diabaikan.
 * - Engine dalam daftar ini yang tidak muncul di response VT di-pad sebagai
 *   `undetected` (dinilai CLEAN).
 *
 * Urutan di sini adalah urutan tampilan default (indeks stabil untuk padding).
 */
export const CANONICAL_VENDORS: readonly string[] = [
  'Acronis (Static ML)',
  'AhnLab-V3',
  'ALYac',
  'Antiy-AVL',
  'Arcabit',
  'Avast',
  'Avast-Mobile',
  'AVG',
  'Avira (no cloud)',
  'Baidu',
  'BitDefender',
  'BitDefenderFalx',
  'BitDefenderTheta',
  'Bkav Pro',
  'ClamAV',
  'CMC',
  'Comodo',
  'CrowdStrike Falcon',
  'Cybereason',
  'Cynet',
  'DeepInstinct',
  'DrWeb',
  'Elastic',
  'Emsisoft',
  'ESET-NOD32',
  'F-Secure',
  'FireEye',
  'Fortinet',
  'GData',
  'Google',
  'Gridinsoft',
  'Ikarus',
  'Jiangmin',
  'K7AntiVirus',
  'K7GW',
  'Kaspersky',
  'Kingsoft',
  'Lionic',
  'Malwarebytes',
  'MAX',
  'MaxSecure',
  'McAfee',
  'McAfee-GW-Edition',
  'Microsoft Defender Antivirus',
  'NANO-Antivirus',
  'Palo Alto Networks',
  'Panda',
  'QuickHeal',
  'Rising',
  'Sangfor Engine Zero',
  'SentinelOne (Static ML)',
  'Skyhigh Security',
  'Sophos',
  'SUPERAntiSpyware',
  'Symantec',
  'Symantec Mobile Insight',
  'TACHYON',
  'TEHTRIS',
  'Tencent',
  'Trapmine',
  'Trellix',
  'TrendMicro',
  'TrendMicro-HouseCall',
  'Trustlook',
  'Varist',
  'VBA32',
  'VIPRE',
  'ViRobot',
  'VirIT',
  'Webroot',
  'Yandex',
];

/** Jumlah kanon vendor — harus 71. */
export const CANONICAL_VENDOR_COUNT = CANONICAL_VENDORS.length;

/**
 * Normalisasi nama engine agar pencocokan antara nama dari VT dan nama kanon
 * tetap stabil (mengabaikan huruf besar/kecil, spasi, tanda hubung/underscore,
 * dan tanda kurung tambahan).
 */
export function normalizeEngineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Peta normalisasi -> nama kanon untuk pencarian O(1). */
export const CANONICAL_BY_NORMALIZED: ReadonlyMap<string, string> = new Map(
  CANONICAL_VENDORS.map((name) => [normalizeEngineName(name), name])
);

export function resolveCanonicalVendor(rawName: string): string | null {
  if (!rawName) return null;
  return CANONICAL_BY_NORMALIZED.get(normalizeEngineName(rawName)) ?? null;
}

/**
 * Kategori yang dianggap CLEAN. `undetected`, `harmless`, `timeout`,
 * `failure`, dan `type-unsupported` tidak menandakan ancaman, sehingga
 * dilebur ke CLEAN. Digunakan untuk agregasi statistik & penilaian.
 */
export const CLEAN_CATEGORIES: ReadonlySet<VendorCategory> = new Set<VendorCategory>([
  'undetected',
  'harmless',
  'timeout',
  'confirmed-timeout',
  'failure',
  'type-unsupported',
]);

export function isCleanVendorCategory(category: VendorCategory): boolean {
  return CLEAN_CATEGORIES.has(category);
}
