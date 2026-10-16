import { ScanRecord, ScanType, ScanStats, VendorResult, Verdict, UserSettings } from '../types/index.js';
import { CANONICAL_VENDORS } from './vendors.js';

const STORAGE_SCANS_KEY = 'cyberclaw_mock_scans';

/**
 * Removes all locally-stored (mock/offline) scan history from this browser.
 * Exposed on `window` for quick maintenance via DevTools Console:
 *   window.cyberclawPurgeHistory()
 * Returns the number of user-scoped buckets that were cleared.
 */
export function purgeMockHistory(): number {
  let cleared = 0;
  try {
    localStorage.removeItem(STORAGE_SCANS_KEY);
    cleared++;
  } catch {
    // ignore (storage disabled)
  }
  // Older builds namespaced the key per user; sweep any leftovers too.
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_SCANS_KEY)) toDelete.push(key);
    }
    toDelete.forEach((k) => {
      localStorage.removeItem(k);
      cleared++;
    });
  } catch {
    // ignore
  }
  return cleared;
}

declare global {
  interface Window {
    cyberclawPurgeHistory?: () => number;
  }
}

/** Attaches the purge helper to `window` so it survives beyond React renders. */
export function installHistoryPurgeHelper(): void {
  if (typeof window !== 'undefined') {
    window.cyberclawPurgeHistory = purgeMockHistory;
  }
}

export async function computeSha256(file: File): Promise<string> {
  try {
    // crypto.subtle is only available in a secure context (HTTPS / localhost).
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // jatuh ke fallback di bawah
  }

  // Fallback: hash non-kriptografis dari metadata file, tetap deterministik
  // untuk keperluan mode offline/demo (bukan untuk keamanan nyata).
  const seed = `${file.name}:${file.size}:${file.lastModified}`;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  let h2 = 0x9e3779b9;
  const head = await file.slice(0, 4096).arrayBuffer();
  const bytes = new Uint8Array(head);
  for (let i = 0; i < bytes.length; i++) {
    h2 ^= bytes[i];
    h2 = Math.imul(h2, 0x01000193);
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (part(h1) + part(h2) + part(h1 ^ h2) + part(h1 + h2) + part(h1) + part(h2) + part(h1 ^ h2) + part(h1 + h2)).slice(0, 64);
}

function getStoredScans(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCANS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredScans(scans: ScanRecord[]): void {
  localStorage.setItem(STORAGE_SCANS_KEY, JSON.stringify(scans));
}

// Generate realistic mock vendor results — using the CANONICAL list of 71 vendors
// so even offline/mock mode shows 71 vendors. Engines that do not
// "detect" anything get the `undetected` status (rated CLEAN).
export function generateMockVendors(isMalicious: boolean, customCategory?: string): { stats: ScanStats; vendor_results: VendorResult[] } {
  const vendorNames = CANONICAL_VENDORS;

  const vendor_results: VendorResult[] = vendorNames.map((name, i) => {
    if (isMalicious && (i === 0 || i === 1 || i === 3 || i === 7 || i === 9)) {
      return {
        engine_name: name,
        category: 'malicious',
        result: `Trojan.Win32.${name}.Gen`,
        method: 'blacklist',
        engine_version: '24.2.1',
        engine_update: '20261001',
      };
    }
    if (!isMalicious && customCategory === 'warning' && i === 2) {
      return {
        engine_name: name,
        category: 'suspicious',
        result: 'PUA.Suspicious.Heuristic',
        method: 'heuristic',
        engine_version: '24.2.1',
        engine_update: '20261001',
      };
    }
    if (i === 4 || i === 6) {
      return {
        engine_name: name,
        category: 'harmless',
        result: null,
        method: 'whitelist',
        engine_version: '24.2.1',
        engine_update: '20261001',
      };
    }
    return {
      engine_name: name,
      category: 'undetected',
      result: null,
      method: 'blacklist',
      engine_version: '24.2.1',
      engine_update: '20261001',
    };
  });

  const malCount = isMalicious ? 5 : 0;
  const suspCount = !isMalicious && customCategory === 'warning' ? 1 : 0;
  const harmlessCount = 2;

  const stats: ScanStats = {
    malicious: malCount,
    suspicious: suspCount,
    harmless: harmlessCount,
    undetected: vendorNames.length - malCount - suspCount - harmlessCount,
    timeout: 0,
    failure: 0,
    unsupported: 0,
  };

  return { stats, vendor_results };
}

export const mockBackend = {
  createFileScan: async (file: File, userId: string, threshold = 3): Promise<ScanRecord> => {
    const sha256 = await computeSha256(file);
    const scanId = crypto.randomUUID();
    const isEicar = file.name.toLowerCase().includes('eicar') || (await file.text()).includes('EICAR');

    const newScan: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'file',
      item_label: file.name,
      item_sha256: sha256,
      state: 'queued',
      created_at: new Date().toISOString(),
      item_meta: {
        size: file.size,
        type_description: file.type || 'Binary File',
        sha256,
        md5: sha256.slice(0, 32),
        sha1: sha256.slice(0, 40),
        names: [file.name],
        first_submission_date: Math.floor(Date.now() / 1000) - 86400,
        last_analysis_date: Math.floor(Date.now() / 1000),
      },
    };

    const scans = getStoredScans();
    scans.unshift(newScan);
    saveStoredScans(scans);

    // Simulate asynchronous analysis progression
    setTimeout(() => {
      const all = getStoredScans();
      const current = all.find((s) => s.id === scanId);
      if (current) {
        const { stats, vendor_results } = generateMockVendors(isEicar);
        let verdict: Verdict = 'clean';
        if (stats.malicious >= threshold) verdict = 'danger';
        else if (stats.malicious >= 1 || stats.suspicious >= 1) verdict = 'warning';

        current.state = 'completed';
        current.verdict = verdict;
        current.stats = stats;
        current.vendor_results = vendor_results;
        current.completed_at = new Date().toISOString();
        saveStoredScans(all);
      }
    }, 3500);

    return newScan;
  },

  createUrlScan: async (url: string, userId: string, threshold = 3): Promise<ScanRecord> => {
    const scanId = crypto.randomUUID();
    const isDanger = url.includes('malware') || url.includes('phishing') || url.includes('danger');
    const isWarning = url.includes('suspicious') || url.includes('test-warn');

    const newScan: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'url',
      item_label: url,
      state: 'queued',
      created_at: new Date().toISOString(),
      item_meta: {
        url,
        final_url: url,
        domain: new URL(url).hostname,
        http_response_code: 200,
        title: 'Target Web Page',
      },
    };

    const scans = getStoredScans();
    scans.unshift(newScan);
    saveStoredScans(scans);

    setTimeout(() => {
      const all = getStoredScans();
      const current = all.find((s) => s.id === scanId);
      if (current) {
        const { stats, vendor_results } = generateMockVendors(isDanger, isWarning ? 'warning' : undefined);
        let verdict: Verdict = 'clean';
        if (stats.malicious >= threshold) verdict = 'danger';
        else if (stats.malicious >= 1 || stats.suspicious >= 1) verdict = 'warning';

        current.state = 'completed';
        current.verdict = verdict;
        current.stats = stats;
        current.vendor_results = vendor_results;
        current.completed_at = new Date().toISOString();
        saveStoredScans(all);
      }
    }, 3000);

    return newScan;
  },

  createHashScan: async (hash: string, userId: string, threshold = 3): Promise<ScanRecord> => {
    const cleanHash = hash.trim().toLowerCase();
    const scanId = crypto.randomUUID();

    // Check for Not Found scenario (if hash contains all 0s or ends with 9999)
    if (cleanHash.startsWith('00000000') || cleanHash.endsWith('9999')) {
      const notFoundScan: ScanRecord = {
        id: scanId,
        user_id: userId,
        type: 'hash',
        item_label: cleanHash,
        state: 'not_found',
        created_at: new Date().toISOString(),
      };
      const scans = getStoredScans();
      scans.unshift(notFoundScan);
      saveStoredScans(scans);
      return notFoundScan;
    }

    const isMalicious = cleanHash.includes('eicar') || cleanHash.startsWith('275a') || cleanHash.includes('bad');
    const { stats, vendor_results } = generateMockVendors(isMalicious);
    let verdict: Verdict = 'clean';
    if (stats.malicious >= threshold) verdict = 'danger';
    else if (stats.malicious >= 1 || stats.suspicious >= 1) verdict = 'warning';

    const completedScan: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'hash',
      item_label: cleanHash,
      item_sha256: cleanHash.length === 64 ? cleanHash : null,
      state: 'completed',
      verdict,
      stats,
      vendor_results,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      item_meta: {
        sha256: cleanHash.length === 64 ? cleanHash : '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
        md5: cleanHash.length === 32 ? cleanHash : '44d88612fea8a8f36de82e1278abb02f',
        sha1: cleanHash.length === 40 ? cleanHash : '3395856ce81f2b7382dee72602f798b642f14140',
        type_description: 'Win32 EXE Executable',
        size: 68400,
        names: ['suspicious_artifact.exe'],
        first_submission_date: Math.floor(Date.now() / 1000) - 360000,
        last_analysis_date: Math.floor(Date.now() / 1000),
      },
    };

    const scans = getStoredScans();
    scans.unshift(completedScan);
    saveStoredScans(scans);
    return completedScan;
  },

  getScan: (scanId: string): ScanRecord | null => {
    const scans = getStoredScans();
    return scans.find((s) => s.id === scanId) || null;
  },

  /**
   * Offline history. When `userId` is supplied the result is scoped to that
   * user only, mirroring the server's per-user ownership check. Pass it
   * whenever a caller knows who is signed in so two accounts sharing one
   * browser never see each other's scans.
   */
  getHistory: (params: {
    userId?: string;
    page?: number;
    pageSize?: number;
    q?: string;
    type?: ScanType;
    verdict?: Verdict;
  }) => {
    let list = getStoredScans();
    if (params.userId) list = list.filter((s) => s.user_id === params.userId);
    if (params.type) list = list.filter((s) => s.type === params.type);
    if (params.verdict) list = list.filter((s) => s.verdict === params.verdict);
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter((s) => s.item_label.toLowerCase().includes(q));
    }
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const offset = (page - 1) * pageSize;
    return {
      items: list.slice(offset, offset + pageSize),
      total: list.length,
      page,
      pageSize,
    };
  },

  deleteScan: (scanId: string) => {
    let list = getStoredScans();
    list = list.filter((s) => s.id !== scanId);
    saveStoredScans(list);
  },

  /**
   * Clear history. Scoped to `userId` when given so signing out and back in
   * as another account never wipes someone else's offline records.
   */
  clearHistory: (userId?: string) => {
    if (userId) {
      const remaining = getStoredScans().filter((s) => s.user_id !== userId);
      saveStoredScans(remaining);
      return;
    }
    saveStoredScans([]);
  },

  /** Removes every offline record for all users. Used to purge stale demo data. */
  clearAllMockData: () => {
    saveStoredScans([]);
  },
};
