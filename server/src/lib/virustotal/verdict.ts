import { ScanStats, Verdict, VendorCategory } from '../../types/index.js';

/**
 * Menghitung verdict keamanan berdasarkan stats dan danger threshold T.
 *
 * Aturan (sesuai PRD, dengan penegasanundetected = clean):
 * - Danger  : malicious >= T (T default 3)
 * - Warning : (1 <= malicious < T) ATAU suspicious >= 1
 * - Clean   : malicious === 0 DAN suspicious === 0
 *
 * `undetected`, `harmless`, `timeout`, `failure`, dan `type-unsupported`
 * SEMUANYA dianggap CLEAN — hanya `malicious` dan `suspicious` yang dapat
 * memicu verdict non-clean. Dengan kata lain, engine yang tidak dapat
 * menentukan status (undetected) tidak akan pernah menjadikan item danger
 * atau warning; nilainya termasuk clean.
 */
export function calculateVerdict(stats: ScanStats, threshold = 3): Verdict {
  const { malicious = 0, suspicious = 0 } = stats;

  if (malicious >= threshold) {
    return 'danger';
  }
  if (malicious >= 1 || suspicious >= 1) {
    return 'warning';
  }
  return 'clean';
}

/**
 * Menentukan apakah sebuah kategori vendor termasuk CLEAN.
 * `undetected` termasuk clean.
 */
export function isCleanCategory(category: VendorCategory): boolean {
  return category !== 'malicious' && category !== 'suspicious';
}

