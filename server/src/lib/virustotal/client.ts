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

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      await this.request<{ data: unknown }>(`/users/${apiKey}`, apiKey, {
        method: 'GET',
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof VirusTotalError && err.code === 'INVALID_API_KEY') {
        return false;
      }
      // If endpoint is restricted for non-admin accounts, try a simple get
      try {
        await this.request<{ data: unknown }>('/files/upload_url', apiKey, {
          method: 'GET',
        });
        return true;
      } catch (innerErr: unknown) {
        if (innerErr instanceof VirusTotalError && innerErr.code === 'INVALID_API_KEY') {
          return false;
        }
        throw innerErr;
      }
    }
  }

  async uploadFile(
    apiKey: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<{ id: string }> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, filename);

    const data = await this.request<{ data: { id: string } }>('/files', apiKey, {
      method: 'POST',
      body: formData,
    });
    return data.data;
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
