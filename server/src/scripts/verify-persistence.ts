/**
 * Read-only persistence probe.
 *
 * Confirms — end to end — that anonymous-session data is actually persisted to
 * the SAME Supabase project configured in `server/.env`:
 *
 *   1. Calls a business endpoint on the target API (default: production) WITHOUT
 *      a token, and captures the server-issued `X-Anon-Session` header.
 *   2. Decodes the token (no secret needed) to read the anonymous id.
 *   3. Queries the `anon_users` table with the service-role key and checks that
 *      the exact id exists.
 *
 * Nothing is written to the DB and no secret is ever printed.
 *
 * Usage (from the `server/` folder):
 *   npm run verify:persistence
 *   # or point at another deployment / local server:
 *   API_BASE_URL=http://localhost:4000 npm run verify:persistence
 */
import { env } from '../config/env.js';

const API_BASE_URL = (process.env.API_BASE_URL || 'https://cyberclaw-api.vercel.app').replace(
  /\/$/,
  ''
);

function maskProject(url: string): string {
  try {
    const host = new URL(url).host; // e.g. cdxitkfjspfhcjgojbaz.supabase.co
    return host;
  } catch {
    return '(invalid URL)';
  }
}

async function main(): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak diset di server/.env — ' +
        'tidak bisa memverifikasi persistence.'
    );
    process.exitCode = 1;
    return;
  }

  console.log(`API target      : ${API_BASE_URL}`);
  console.log(`Supabase project: ${maskProject(env.SUPABASE_URL)}`);
  console.log('');

  // 1) Ask the API for an anonymous session.
  const res = await fetch(`${API_BASE_URL}/api/settings`, {
    headers: { Accept: 'application/json' },
  });
  const token = res.headers.get('x-anon-session');
  console.log(`GET /api/settings → ${res.status}`);
  if (!token) {
    console.error('✗ Server tidak mengembalikan header X-Anon-Session.');
    process.exitCode = 1;
    return;
  }

  // 2) Decode the id from the token payload (signature not needed here).
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
  ) as { sub?: string; type?: string; exp?: number };
  const anonId = payload.sub;
  console.log(`Anon id         : ${anonId}`);
  console.log(
    `Token           : type=${payload.type}, exp=${payload.exp ? new Date(payload.exp * 1000).toISOString() : '?'}`
  );
  if (!anonId) {
    console.error('✗ Token tidak memuat `sub`.');
    process.exitCode = 1;
    return;
  }

  // 3) Does that exact row exist in Supabase?
  const url =
    `${env.SUPABASE_URL}/rest/v1/anon_users` +
    `?id=eq.${encodeURIComponent(anonId)}&select=id,last_seen_at,created_at`;
  const q = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = (await q.json()) as Array<{ id: string; last_seen_at?: string }>;

  if (Array.isArray(rows) && rows.length === 1) {
    console.log('');
    console.log('✓ PERSISTENT: baris ditemukan di Supabase (anon_users).');
    console.log(`  last_seen_at = ${rows[0].last_seen_at ?? '(null)'}`);
  } else {
    console.error('');
    console.error('✗ TIDAK ditemukan di Supabase — persistence tidak aktif atau project berbeda.');
    console.error(`  respons: ${JSON.stringify(rows).slice(0, 200)}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('✗ Verifikasi gagal:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
