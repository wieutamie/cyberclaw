/**
 * Same-origin /api/* proxy for the Vercel frontend project.
 *
 * The primary API base is `VITE_API_BASE_URL` (cross-origin, used by every
 * build shipped in the last few days). This proxy exists as a safety net for
 * browsers that still run an OLDER cached bundle, whose API base is the
 * same-origin `/api`: those requests would otherwise hit Vercel's static
 * host and die with `405 Method Not Allowed`.
 *
 * The rewrite in vercel.json (`/api/(.*)` → `/api`) routes these requests
 * here; everything is forwarded transparently to the API project.
 */

// Kept dependency-free on purpose: plain types avoid needing the `@vercel/node`
// package in the client workspace (tsc would flag the missing module at build).

const API_ORIGIN = 'https://cyberclaw-api.vercel.app';

type Req = {
  url?: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  /** Bare Vercel Node functions expose the raw body as an async stream. */
  [Symbol.asyncIterator](): AsyncIterator<Buffer>;
};

type Res = {
  status(code: number): Res;
  setHeader(name: string, value: string | string[]): void;
  json(obj: unknown): void;
  end(body?: string): void;
};

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'cfd-original-host',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-vercel-ip',
]);

const SKIP_RESPONSE_HEADERS = new Set([
  'content-length',
  'transfer-encoding',
  'server',
  'date',
  'x-vercel-cache',
  'x-vercel-id',
  'x-vercel-served-region',
]);

export default async (req: Req, res: Res) => {
  const path = req.url || '/api';

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) headers[key] = value.join(', ');
    else if (value !== undefined) headers[key] = String(value);
  }

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    if (raw.length > 0) {
      body = raw as unknown as BodyInit;
      delete headers['content-length'];
    }
  }

  // Handle OPTIONS preflight ourselves so the browser sees valid CORS headers
  // instead of getting a bare 204 from Vercel's static host.
  if (req.method === 'OPTIONS') {
    const origin = headers['origin'];
    if (!origin) {
      // No Origin header — not a browser preflight, just proxy it through.
      const upstream = await fetch(`${API_ORIGIN}${path}`, { method: 'OPTIONS', headers });
      res.status(upstream.status);
      res.end(await upstream.text());
      return;
    }
    // Mirror the backend's allowed-origin logic. The backend rejects origins not
    // in CLIENT_URL with 403, so we do the same here (without CORS headers).
    // Allowed origins get a full preflight response.
    try {
      const upstream = await fetch(`${API_ORIGIN}${path}`, { method: 'OPTIONS', headers });
      const data = await upstream.text();
      if (upstream.status === 403) {
        res.status(403).end(data);
        return;
      }
      // Build a preflight response matching the backend's CORS policy.
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-Anon-Session');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(204).end();
    } catch {
      res.status(502).json({ ok: false, error: { message: 'API proxy unavailable.', code: 'PROXY_ERROR' } });
    }
    return;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_ORIGIN}${path}`, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch {
    res.status(502).json({ ok: false, error: { message: 'API proxy unavailable.', code: 'PROXY_ERROR' } });
    return;
  }

  for (const [key, value] of Object.entries(upstream.headers)) {
    if (SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    res.setHeader(key, value as string);
  }

  res.status(upstream.status);
  res.end(await upstream.text());
};
