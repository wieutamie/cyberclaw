# CyberClaw Backend (REST API)

Express + TypeScript API for the CyberClaw virus scanner, integrating VirusTotal
API v3.

## Anonymous sessions

CyberClaw has **no user accounts**. Every visitor gets an anonymous session that
is minted and signed **by the server**, so the anonymous id can never be spoofed
or chosen client-side. It is used purely as a partition key so each browser gets
its own scan history, analytics, and settings.

How it works:

1. The client calls any business endpoint without a token.
2. The `anonSession` middleware mints a random id, signs a JWT with `JWT_SECRET`,
   and returns it in the `X-Anon-Session` response header.
3. The client stores that token and echoes it back as
   `Authorization: Bearer <token>` on every later request, so it keeps the same
   identity (and therefore the same history).

All business endpoints (`/api/scan`, `/api/scans`, `/api/analytics`,
`/api/settings`) are served without a login. There are no `/api/auth/*` or
`/api/profile` routes anymore.

### Security guarantees

- Anonymous ids are only ever accepted from a valid, server-signed JWT — the
  client cannot dictate its own id.
- All user-scoped data is keyed by that id, and the server accesses Supabase
  with the `service_role` key; RLS is enabled on every table as
  defense-in-depth (no permissive policies = the public anon key cannot touch
  them directly).
- `JWT_SECRET` must be set in production or the process refuses to start.

## Configuration

Copy `.env.example` to `.env` and fill in values. Key variables:

| Variable        | Notes                                                          |
| --------------- | -------------------------------------------------------------- |
| `PORT`          | API port (default `4000`)                                      |
| `CLIENT_URL`    | Comma-separated allowed CORS origins                           |
| `JWT_SECRET`    | Strong random secret used to sign anonymous sessions — **required in production** |
| `ENCRYPTION_KEY`| AES-256-GCM key for encrypting stored VirusTotal API keys      |
| `SUPABASE_*`    | Optional. Enables Supabase persistence for scans/settings      |
| `SYSTEM_VT_API_KEY` | Optional shared VirusTotal key (visitors may add their own) |

## Database

Apply the SQL in `../supabase/migrations/` (init + anonymous sessions) to your
Supabase project. `20240102_anon_sessions.sql` creates the `anon_users` table,
re-points the `scans` / `user_settings` / `api_keys` foreign keys to it, drops
the legacy `profiles` table, and enables RLS.

## Scripts

```bash
npm run dev     # tsx watch
npm run build   # tsc -> dist/
npm start       # node dist/index.js
npm test        # vitest
```
