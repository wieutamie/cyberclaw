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
 * True when the backend could not be reached at all (offline / DNS failure).
 * Callers can use this to show a distinct "connection" message.
 */
export function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
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

export const api = {
  // Scans
  scanFile: async (file: File): Promise<{ scanId: string; state: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ scanId: string; state: string }>('/scan/file', {
      method: 'POST',
      body: formData,
    });
  },

  scanUrl: async (url: string): Promise<{ scanId: string; state: string }> =>
    request<{ scanId: string; state: string }>('/scan/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  scanHash: async (hash: string): Promise<{ scanId: string; state: string }> =>
    request<{ scanId: string; state: string }>('/scan/hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    }),

  getScanStatus: async (
    scanId: string
  ): Promise<{ state: string; progressLabel: string; verdict?: string | null }> =>
    request<{ state: string; progressLabel: string; verdict?: string | null }>(
      `/scans/${scanId}/status`
    ),

  getScanDetails: async (scanId: string): Promise<ScanRecord> =>
    request<ScanRecord>(`/scans/${scanId}`),

  rescan: async (scanId: string): Promise<{ scanId: string }> =>
    request<{ scanId: string }>(`/scans/${scanId}/rescan`, { method: 'POST' }),

  deleteScan: async (scanId: string): Promise<boolean> => {
    await request(`/scans/${scanId}`, { method: 'DELETE' });
    return true;
  },


  getHistory: async (params: {
    page?: number;
    pageSize?: number;
    q?: string;
    type?: ScanType;
    verdict?: Verdict;
  }): Promise<{ items: ScanRecord[]; total: number; page: number; pageSize: number }> => {
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

  clearAllHistory: async (): Promise<void> => {
    await request('/scans', { method: 'DELETE' });
  },

  // Analytics
  getAnalytics: async (range: '7d' | '30d' | '90d' = '30d'): Promise<any> =>
    request(`/analytics?range=${range}`),

  // Settings
  getSettings: async (): Promise<UserSettings> => request<UserSettings>('/settings'),

  updateSettings: async (updates: Partial<UserSettings>): Promise<UserSettings> =>
    request<UserSettings>('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),
};
