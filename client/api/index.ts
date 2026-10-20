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
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_ORIGIN = 'https://cyberclaw-api.vercel.app';

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

export default async (req: VercelRequest, res: VercelResponse) => {
  const path = (req.originalUrl || req.url || '/').replace(/^\/api/, '');

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) headers[key] = value.join(', ');
    else if (value !== undefined) headers[key] = String(value);
  }

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (headers['content-type']?.includes('application/json')) {
      body = JSON.stringify(req.body ?? {});
      delete headers['content-length'];
    } else if (req.rawBody && req.rawBody.length > 0) {
      // multipart/form-data (file upload) or any other raw payload
      body = req.rawBody;
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
