import { ScanStats, VendorResult } from '../types/index.js';
import { totalEngines } from './stats.js';

/**
 * Assert that the reported engine totals match the vendor list they came from.
 *
 * The report page renders `malicious / totalEngines` right next to the list of
 * vendor cards. When those two disagree the report contradicts itself on
 * screen. Three production rows did exactly that (90 engines, 71 cards) because
 * an older build derived `stats` from VirusTotal's summary object while the
 * card list was padded to a canonical 71 vendors. Both values are now always
 * derived from the same `vendor_results` array, and this guard makes a
 * regression fail loudly at write time instead of surfacing to users.
 */
export function assertConsistentStats(
  stats: Partial<ScanStats> | null | undefined,
  vendors: VendorResult[] | null | undefined
): void {
  if (!stats || !Array.isArray(vendors)) return;

  const engineTotal = totalEngines(stats);
  const vendorCount = vendors.length;
  if (engineTotal !== vendorCount) {
    throw new Error(
      `Inconsistent scan stats: ${engineTotal} engines vs ${vendorCount} vendor records`
    );
  }
}
