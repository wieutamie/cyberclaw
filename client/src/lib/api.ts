import { mockBackend } from './mockApi.js';
import { ScanRecord, UserSettings, ScanType, Verdict } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** localStorage key holding the server-signed anonymous session token. */
const ANON_TOKEN_KEY = 'cyberclaw_anon_token';

/** Error type carrying the HTTP status + server error code. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'REQUEST_FAILED', status = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Reads the persisted anonymous session token, if any. */
function getAnonToken(): string | null {
  return localStorage.getItem(ANON_TOKEN_KEY);
}

/** Persists the server-issued anonymous session token. */
function storeAnonToken(token: string): void {
  localStorage.setItem(ANON_TOKEN_KEY, token);
}

/**
 * Shared bootstrap that mints the anonymous session ONCE before any other
 * request fires. Without this, the parallel requests a page makes on first load
 * would each be handed a different id, splitting one visitor's data across
 * several anonymous sessions.
 */
let bootstrapPromise: Promise<void> | null = null;

function ensureAnonToken(): Promise<void> {
  if (getAnonToken()) return Promise.resolve();
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          headers: { Accept: 'application/json' },
        });
        const issued = res.headers.get('X-Anon-Session');
        if (issued) storeAnonToken(issued);
      } catch {
        // Offline / unreachable — leave the token unset; per-call fallbacks
        // handle the offline path.
      } finally {
        bootstrapPromise = null;
      }
    })();
  }
  return bootstrapPromise;
}

/**
 * Decodes the anonymous session id (`sub`) from the JWT so the offline mock
 * store can be scoped per-visitor. This is a partition key only, never trusted
 * for security, which is why reading it client-side is fine.
 */
function getCurrentUserId(): string | null {
  const token = getAnonToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json);
    return typeof parsed?.sub === 'string' ? parsed.sub : null;
  } catch {
    return null;
  }
}

/** True for errors that indicate the backend is unreachable (offline mode). */
function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

/**
 * True when the backend responded but failed on its own side (5xx) â€” e.g. the
 * server is up but VirusTotal is unreachable, the API key is missing, or the
 * database is not configured. In these cases the local mock engine is a safe
 * fallback so scanning still works in demo/offline setups. Validation (400) and
 * auth (401/403) errors are NOT masked â€” those reflect real user problems.
 */
function isServerFailure(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status >= 500 || err.status === 429)
  );
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  await ensureAnonToken();
  const token = getAnonToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    // Network failure (server offline / DNS). Surface as status 0 so callers
    // can decide whether a local fallback is acceptable.
    throw new ApiError('Cannot connect to the server.', 'NETWORK_ERROR', 0);
  }

  // Capture the server-issued anonymous session token on first contact so every
  // later request reuses the same identity (and therefore the same history).
  const issuedToken = res.headers.get('X-Anon-Session');
  if (issuedToken) {
    storeAnonToken(issuedToken);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.ok) {
    throw new ApiError(
      data?.error?.message || 'Request failed.',
      data?.error?.code || 'REQUEST_FAILED',
      res.status
    );
  }

  return data.data as T;
}

/**
 * Runs a request with an optional offline fallback (local mock engine).
 *
 * - Default: fallback only when the backend is unreachable (network) or errored
 *   on its own side (5xx / 429) â€” auth (401/403) and validation (400) errors are
 *   surfaced so real user problems are not masked.
 * - `catchAll: true`: fallback on ANY failure except 401 (expired session, which
 *   must force a re-login). Used for the scan/history endpoints so the demo flow
 *   never dead-ends when the backend is misconfigured or a record is missing.
 */
async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: () => Promise<T> | T,
  catchAll = false
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const canFallback =
      isNetworkError(err) ||
      isServerFailure(err) ||
      (catchAll && !(err instanceof ApiError && err.status === 401));
    if (canFallback) {
      console.warn('Backend unavailable or errored, using local offline engine.', err);
      return await fallback();
    }
    throw err;
  }
}


export const api = {
  // Scans
  scanFile: async (file: File): Promise<{ scanId: string; state: string }> =>
    withFallback(
      () => {
        const formData = new FormData();
        formData.append('file', file);
        return request<{ scanId: string; state: string }>('/scan/file', {
          method: 'POST',
          body: formData,
        });
      },
      async () => {
        const res = await mockBackend.createFileScan(file, getCurrentUserId() || 'offline-user');
        return { scanId: res.id, state: res.state };
      },
      true
    ),

  scanUrl: async (url: string): Promise<{ scanId: string; state: string }> =>
    withFallback(
      () =>
        request<{ scanId: string; state: string }>('/scan/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }),
      async () => {
        const res = await mockBackend.createUrlScan(url, getCurrentUserId() || 'offline-user');
        return { scanId: res.id, state: res.state };
      },
      true
    ),

  scanHash: async (hash: string): Promise<{ scanId: string; state: string }> =>
    withFallback(
      () =>
        request<{ scanId: string; state: string }>('/scan/hash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash }),
        }),
      async () => {
        const res = await mockBackend.createHashScan(hash, getCurrentUserId() || 'offline-user');
        return { scanId: res.id, state: res.state };
      },
      true
    ),

  getScanStatus: async (
    scanId: string
  ): Promise<{ state: string; progressLabel: string; verdict?: string | null }> =>
    withFallback(
      () =>
        request<{ state: string; progressLabel: string; verdict?: string | null }>(
          `/scans/${scanId}/status`
        ),
      () => {
        const scan = mockBackend.getScan(scanId);
        if (!scan) return { state: 'not_found', progressLabel: 'Not found' };
        return {
          state: scan.state,
          progressLabel: scan.state === 'completed' ? 'Analysis Complete' : 'Analyzing...',
          verdict: scan.verdict,
        };
      },
      true
    ),

  getScanDetails: async (scanId: string): Promise<ScanRecord> =>
    withFallback(
      () => request<ScanRecord>(`/scans/${scanId}`),
      () => {
        const scan = mockBackend.getScan(scanId);
        if (!scan) throw new ApiError('Scan record not found', 'NOT_FOUND', 404);
        return scan;
      },
      true
    ),

  rescan: async (scanId: string): Promise<{ scanId: string }> =>
    withFallback(
      () => request<{ scanId: string }>(`/scans/${scanId}/rescan`, { method: 'POST' }),
      () => ({ scanId })
    ),

  deleteScan: async (scanId: string): Promise<boolean> =>
    withFallback(
      async () => {
        await request(`/scans/${scanId}`, { method: 'DELETE' });
        return true;
      },
      () => {
        mockBackend.deleteScan(scanId);
        return true;
      }
    ),


  getHistory: async (params: {
    page?: number;
    pageSize?: number;
    q?: string;
    type?: ScanType;
    verdict?: Verdict;
  }): Promise<{ items: ScanRecord[]; total: number; page: number; pageSize: number }> =>
    withFallback(
      () => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.pageSize) query.set('pageSize', String(params.pageSize));
        if (params.q) query.set('q', params.q);
        if (params.type) query.set('type', params.type);
        if (params.verdict) query.set('verdict', params.verdict);
        return request<{ items: ScanRecord[]; total: number; page: number; pageSize: number }>(
          `/scans?${query.toString()}`
        );
      },
      () => mockBackend.getHistory({ ...params, userId: getCurrentUserId() || undefined })
    ),

  exportCsv: async (): Promise<string> => {
    await ensureAnonToken();
    const token = getAnonToken();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/scans/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError('Cannot connect to the server.', 'NETWORK_ERROR', 0);
    }
    const issuedToken = res.headers.get('X-Anon-Session');
    if (issuedToken) storeAnonToken(issuedToken);
    if (!res.ok) throw new ApiError('Failed to export CSV.', 'EXPORT_FAILED', res.status);
    return await res.text();
  },

  clearAllHistory: async (): Promise<void> =>
    withFallback(
      async () => {
        await request('/scans', { method: 'DELETE' });
      },
      () => mockBackend.clearHistory(getCurrentUserId() || undefined)
    ),

  // Analytics
  getAnalytics: async (range: '7d' | '30d' | '90d' = '30d'): Promise<any> =>
    withFallback(
      () => request(`/analytics?range=${range}`),
      () => {
        // Offline fallback: derive everything from THIS user's real local
        // history only. No seeded/sample rows â€” a brand-new user sees zeros.
        const history = mockBackend
          .getHistory({ pageSize: 100, userId: getCurrentUserId() || undefined })
          .items;
        const danger = history.filter((h) => h.verdict === 'danger').length;
        const warning = history.filter((h) => h.verdict === 'warning').length;
        const clean = history.filter((h) => h.verdict === 'clean').length;

        // Bucket the real scans by calendar day (YYYY-MM-DD), newest last.
        const byDay = new Map<string, { total: number; danger: number; warning: number; clean: number }>();
        for (const h of history) {
          const day = (h.created_at || '').slice(0, 10);
          if (!day) continue;
          const bucket = byDay.get(day) || { total: 0, danger: 0, warning: 0, clean: 0 };
          bucket.total += 1;
          if (h.verdict === 'danger') bucket.danger += 1;
          else if (h.verdict === 'warning') bucket.warning += 1;
          else if (h.verdict === 'clean') bucket.clean += 1;
          byDay.set(day, bucket);
        }
        const daily = Array.from(byDay.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, v]) => ({ date, ...v }));

        return {
          kpi: {
            totalScans: history.length,
            danger,
            warning,
            clean,
          },
          donut: [
            { name: 'Danger', value: danger, color: '#FF0000' },
            { name: 'Warning', value: warning, color: '#FF7300' },
            { name: 'Clean', value: clean, color: '#11FF00' },
            { name: 'Not Found', value: 0, color: '#64748B' },
          ],
          daily,
          recent: history.slice(0, 10),
        };
      }
    ),


  // Settings
  getSettings: async (): Promise<UserSettings> =>
    withFallback(
      () => request<UserSettings>('/settings'),
      () => {
        const raw = localStorage.getItem('cyberclaw_settings');
        if (raw) return JSON.parse(raw);
        return {
          user_id: 'offline-user',
          timezone: 'Asia/Jakarta',
          date_format: 'DD/MM/YYYY',
          time_format: '24h',
          language: 'id',
          default_tab: 'file',
          danger_threshold: 3,
          show_upload_warning: true,
          auto_open_report: false,
          history_retention_days: 90,
          updated_at: new Date().toISOString(),
        };
      }
    ),

  updateSettings: async (updates: Partial<UserSettings>): Promise<UserSettings> =>
    withFallback(
      () =>
        request<UserSettings>('/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
      async () => {
        const current = await api.getSettings();
        const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('cyberclaw_settings', JSON.stringify(merged));
        return merged;
      }
    ),

  getApiKeyMeta: async (): Promise<{ hasKey: boolean; last4: string | null }> =>
    withFallback(
      () => request<{ hasKey: boolean; last4: string | null }>('/settings/api-key'),
      () => mockBackend.getApiKeyMeta()
    ),

  saveApiKey: async (apiKey: string): Promise<void> =>
    withFallback(
      async () => {
        await request('/settings/api-key', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        });
      },
      () => mockBackend.saveApiKey(apiKey)
    ),

  removeApiKey: async (): Promise<void> =>
    withFallback(
      async () => {
        await request('/settings/api-key', { method: 'DELETE' });
      },
      () => mockBackend.removeApiKey()
    ),

  // NOTE: no silent "true" fallback. If we cannot reach VirusTotal (or the
  // backend), we report the key as unverified rather than pretending it works.
  testApiKey: async (apiKey?: string): Promise<boolean> => {
    try {
      const res = await request<{ valid: boolean }>('/settings/api-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKey ? { apiKey } : {}),
      });
      return res.valid;
    } catch (err) {
      if (isNetworkError(err)) return false;
      throw err;
    }
  },
};
