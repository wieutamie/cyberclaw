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
  // `req.url` in Vercel Node functions is the relative path WITH query,
  // e.g. `/api/scan/file` — forward it untouched to the API project.
  const path = req.url || '/api';

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) headers[key] = value.join(', ');
    else if (value !== undefined) headers[key] = String(value);
  }

  // Bare Vercel Node functions do NOT parse the body (no `req.body` /
  // `req.rawBody`), so read the raw stream ourselves. Forwarding the raw
  // bytes keeps multipart boundaries intact for file uploads.
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
    if (key.toLowerCase().startsWith('access-control-')) continue;
    res.setHeader(key, value as string);
  }

  res.status(upstream.status);
  res.end(await upstream.text());
};

