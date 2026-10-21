import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { RateLimiter } from './rateLimiter.js';

export interface VtErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export class VirusTotalError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'VirusTotalError';
  }
}

/** Known file-extension → MIME-type map for the `file_type` upload field. */
const MIME_BY_EXT: Record<string, string> = {
  exe: 'application/x-msdownload',
  dll: 'application/x-msdownload',
  com: 'application/x-msdownload',
  scr: 'application/x-msdownload',
  msi: 'application/x-msdownload',
  bat: 'application/x-bat',
  cmd: 'application/x-bat',
  ps1: 'application/x-powershell',
  sh: 'application/x-sh',
  js: 'text/javascript',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  apk: 'application/vnd.android.package-archive',
  iso: 'application/x-iso9660-image',
  dmg: 'application/x-apple-diskimage',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
};

/** Guesses the MIME type of an uploaded file from its extension. */
function mimeForFile(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export class VirusTotalClient {
  private baseUrl = env.VT_BASE_URL;

  private async request<T>(
    endpoint: string,
    apiKey: string,
    options: RequestInit = {}
  ): Promise<T> {
    const rateCheck = RateLimiter.tryConsume(apiKey);
    if (!rateCheck.success) {
      throw new VirusTotalError(
        'RATE_LIMITED',
        `Rate limit reached. Please retry after ${rateCheck.retryAfter}s.`,
        429
      );
    }

    const headers: Record<string, string> = {
      'x-apikey': apiKey,
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const url = `${this.baseUrl}${endpoint}`;
    let res: Response;

    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: unknown) {
      logger.error({ err, endpoint }, 'VirusTotal network request failed');
      throw new VirusTotalError(
        'UPSTREAM_ERROR',
        'VirusTotal is temporarily unreachable. Please try again.',
        502
      );
    }

    if (!res.ok) {
      let errBody: VtErrorResponse | null = null;
      try {
        errBody = (await res.json()) as VtErrorResponse;
      } catch {
        // non-json response
      }

      const vtCode = errBody?.error?.code;
      const vtMsg = errBody?.error?.message || res.statusText;

      if (res.status === 401 || vtCode === 'WrongCredentialsError') {
        throw new VirusTotalError('INVALID_API_KEY', 'API Key is invalid.', 401);
      }
      if (res.status === 403 || vtCode === 'ForbiddenError') {
        throw new VirusTotalError(
          'FORBIDDEN',
          'API Key does not have permission for this action.',
          403
        );
      }
      if (res.status === 404 || vtCode === 'NotFoundError') {
        throw new VirusTotalError('NOT_FOUND', 'Item not found in VirusTotal.', 404);
      }
      if (res.status === 429 || vtCode === 'QuotaExceededError') {
        throw new VirusTotalError(
          'QUOTA_EXCEEDED',
          'VirusTotal API key quota exceeded.',
          429
        );
      }
      if (vtCode === 'TooManyRequestsError') {
        throw new VirusTotalError(
          'RATE_LIMITED',
          'Too many requests. Please slow down.',
          429
        );
      }
      if (res.status >= 500) {
        throw new VirusTotalError(
          'UPSTREAM_ERROR',
          'VirusTotal server error occurred.',
          502
        );
      }

      throw new VirusTotalError(
        vtCode || 'BAD_REQUEST',
        vtMsg || 'Request failed.',
        res.status
      );
    }

    return (await res.json()) as T;
  }

  /**
   * Validates a VirusTotal API key.
   *
   * `GET /users` returns the account info bound to the key itself — the
   * canonical key-check endpoint, available to public (free) keys.
   * Invalid keys produce a 401 `WrongCredentialsError` from VT.
   *
   * If `/users` fails for reasons other than a bad key (e.g. 403 for some
   * restricted key types, rate limit, network error), we fall back to
   * `GET /files/upload_url`: a *valid* key yields 200, while an *invalid* key
   * still yields 401. A 429 on either endpoint means the key authenticated
   * successfully, so it is valid too.
   *
   * Note: the fallback must be **GET**. `POST /files/upload_url` is not a
   * public endpoint and answers `405 Method Not Allowed`, which would make
   * every valid key look broken.
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      await this.request<{ data: unknown }>('/users', apiKey, {
        method: 'GET',
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof VirusTotalError && err.code === 'INVALID_API_KEY') {
        return false;
      }
      try {
        await this.request('/files/upload_url', apiKey, {
          method: 'GET',
        });
        return true;
      } catch (innerErr: unknown) {
        if (innerErr instanceof VirusTotalError) {
          if (innerErr.code === 'INVALID_API_KEY') return false;
          // A 405 means we called the endpoint with the wrong method — that is
          // a bug on our side, never proof that the key is valid.
          if (innerErr.statusCode === 405) throw innerErr;
          // Any other sub-500 non-403 (404, 429 rate/quota) proves the key
          // authenticated → valid.
          if (innerErr.statusCode < 500 && innerErr.statusCode !== 403) return true;
          throw innerErr;
        }
        throw innerErr;
      }
    }
  }

  /**
   * Uploads a file to VirusTotal through the **public** API.
   *
   * `POST /files` takes `multipart/form-data` with a `file` field and works
   * with free (public) API keys for files up to 32 MB. It answers with the id
   * of the freshly created *analysis*, which is exactly what
   * `GET /analyses/{id}` polls.
   *
   * Files above 32 MB must instead be sent to the one-shot signed URL returned
   * by `GET /files/upload_url` (note: **GET**, not POST — the POST variant only
   * exists on the premium endpoint and answers `405 Method Not Allowed` for
   * public keys, which used to surface to users as a bogus 405 on file scans).
   */
  async uploadFile(
    apiKey: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<{ id: string }> {
    const DIRECT_UPLOAD_LIMIT = 32 * 1024 * 1024;

    if (fileBuffer.length > DIRECT_UPLOAD_LIMIT) {
      return this.uploadLargeFile(apiKey, fileBuffer, filename);
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(fileBuffer)], { type: mimeForFile(filename) }),
      filename
    );

    const data = await this.request<{ data: { id: string } }>('/files', apiKey, {
      method: 'POST',
      body: form,
    });

    const analysisId = data?.data?.id;
    if (!analysisId) {
      throw new VirusTotalError(
        'UPSTREAM_ERROR',
        'VirusTotal did not return an analysis id.',
        502
      );
    }

    return { id: analysisId };
  }

  /**
   * Two-step upload for files larger than the 32 MB direct-upload limit:
   *
   * 1. `GET /files/upload_url` → a one-shot signed URL.
   * 2. `POST` the same multipart body used by `POST /files` to that URL.
   */
  private async uploadLargeFile(
    apiKey: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<{ id: string }> {
    const task = await this.request<{ data: string }>('/files/upload_url', apiKey, {
      method: 'GET',
    });

    const uploadUrl = typeof task?.data === 'string' ? task.data : '';
    if (!uploadUrl) {
      throw new VirusTotalError(
        'UPSTREAM_ERROR',
        'VirusTotal did not return an upload URL.',
        502
      );
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(fileBuffer)], { type: mimeForFile(filename) }),
      filename
    );

    let res: globalThis.Response;
    try {
      res = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        headers: { 'x-apikey': apiKey, Accept: 'application/json' },
      });
    } catch (err: unknown) {
      logger.error({ err }, 'VirusTotal signed upload failed');
      throw new VirusTotalError(
        'UPSTREAM_ERROR',
        'VirusTotal is temporarily unreachable. Please try again.',
        502
      );
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new VirusTotalError(
          'FORBIDDEN',
          'API Key does not have permission for this action.',
          403
        );
      }
      if (res.status === 429) {
        throw new VirusTotalError(
          'QUOTA_EXCEEDED',
          'VirusTotal API key quota exceeded.',
          429
        );
      }
      if (res.status >= 500) {
        throw new VirusTotalError(
          'UPSTREAM_ERROR',
          'VirusTotal server error occurred.',
          502
        );
      }
      throw new VirusTotalError(
        'UPLOAD_FAILED',
        `File upload failed (HTTP ${res.status}).`,
        res.status
      );
    }

    const body = (await res.json().catch(() => null)) as
      | { data?: { id?: string } }
      | null;
    const analysisId = body?.data?.id;
    if (!analysisId) {
      throw new VirusTotalError(
        'UPSTREAM_ERROR',
        'VirusTotal did not return an analysis id.',
        502
      );
    }

    return { id: analysisId };
  }

  async submitUrl(apiKey: string, urlToScan: string): Promise<{ id: string }> {
    const params = new URLSearchParams();
    params.append('url', urlToScan);

    const data = await this.request<{ data: { id: string } }>('/urls', apiKey, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return data.data;
  }

  async getAnalysis(apiKey: string, analysisId: string): Promise<any> {
    return await this.request<any>(`/analyses/${analysisId}`, apiKey, {
      method: 'GET',
    });
  }

  async getFileReport(apiKey: string, hash: string): Promise<any> {
    return await this.request<any>(`/files/${hash}`, apiKey, {
      method: 'GET',
    });
  }

  async getUrlReport(apiKey: string, urlId: string): Promise<any> {
    return await this.request<any>(`/urls/${urlId}`, apiKey, {
      method: 'GET',
    });
  }

  async rescanFile(apiKey: string, hash: string): Promise<{ id: string }> {
    const data = await this.request<{ data: { id: string } }>(
      `/files/${hash}/analyse`,
      apiKey,
      {
        method: 'POST',
      }
    );
    return data.data;
  }

  async rescanUrl(apiKey: string, urlId: string): Promise<{ id: string }> {
    const data = await this.request<{ data: { id: string } }>(
      `/urls/${urlId}/analyse`,
      apiKey,
      {
        method: 'POST',
      }
    );
    return data.data;
  }
}

export const vtClient = new VirusTotalClient();
