# Cyber Claw — Panduan Deployment

Arsitektur deploy:

| Bagian | Platform | Catatan |
|---|---|---|
| `client/` (React + Vite SPA) | **Vercel** | Project `cyberclaw`, Root Directory = `client` |
| `server/` (Express API) | **Vercel** (serverless) | Project `cyberclaw-api`, Root Directory = `server` |
| `supabase/` (SQL) | **Supabase SQL Editor** | Jalankan manual |
| VirusTotal API | VirusTotal | Key disimpan di server saja |

> ℹ️ **Backend kini juga di Vercel** (bukan Render), dijalankan sebagai satu
> Vercel Function lewat `server/vercel.json` + `server/api/index.js`.
>
> **Konsekuensi penting:**
> - **Batas upload file = ~4 MB** (batas body request Vercel Hobby 4,5 MB).
>   UI sudah menyesuaikan (pesan "maks 4 MB").
> - **Supabase WAJIB aktif.** Vercel serverless tidak punya memori persisten,
>   jadi semua riwayat/setting disimpan di Supabase. Tanpa migrasi, data scan
>   hilang saat function "cold start".
> - **Cron retention harian** dijalankan lewat Vercel Cron
>   (`/api/internal/retention`, dilindungi `CRON_SECRET`), bukan `node-cron`.

---

## Urutan deploy (penting!)

**Backend dulu, baru frontend**, karena frontend butuh URL backend.

```
Supabase (migrasi)  →  Vercel backend (cyberclaw-api)  →  Vercel frontend (cyberclaw)  →  Sambungkan  →  Verifikasi
```

---

## Langkah 1 — Migrasi database Supabase

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → pilih project Anda.
2. Menu kiri → **SQL Editor** → **New query**.
3. Copy-paste isi file `supabase/migrations/20240101_init.sql` → **Run**.
4. Ulangi untuk `supabase/migrations/20240102_anon_sessions.sql` → **Run**.
5. Cek menu **Table Editor** → tabel `scans`, `user_settings`, `anon_users`, dll. harus muncul.

> ⚠️ **Wajib.** Tanpa tabel ini, backend tetap bisa scan (fallback memori),
> tapi riwayat akan hilang setiap kali function restart. Verifikasi cepat:
> `GET https://<supabase>/rest/v1/anon_users?select=*&limit=1` dengan header
> `apikey` + `Authorization: Bearer <service_role>` harus **200**, bukan 404.

**Ambil kredensial** (dipakai di Langkah 2): **Settings → API**
- **Project URL** → untuk `SUPABASE_URL`
- **service_role** key (klik "Reveal") → untuk `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ini rahasia, server-only

---

## Langkah 2 — Deploy backend ke Vercel (`cyberclaw-api`)

### 2a. Deploy via CLI
```bash
cd server
vercel link --project cyberclaw-api      # buat project baru
vercel env add NODE_ENV production        # lalu masukkan: production
vercel env add CLIENT_URL production      # https://cyberclaw-cyberclaw.vercel.app,https://cyberclaw-one.vercel.app
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ENCRYPTION_KEY production  # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
vercel env add JWT_SECRET production      # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
vercel env add CRON_SECRET production     # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
vercel env add MAX_UPLOAD_MB production   # 4
# WAJIB: tanpa kunci ini pemindaian gagal dengan SCAN_NOT_CONFIGURED (tidak ada mode demo/mock)
vercel env add SYSTEM_VT_API_KEY production
vercel --prod
```

### 2b. Matikan Deployment Protection (agar bisa diakses publik)
Vercel Hobby mengaktifkan proteksi deploy secara default. Matikan lewat API:
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<projectId>?teamId=<teamId>" \
  -H "Authorization: Bearer <vercel-token>" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null,"passwordProtection":null}'
```

### 2c. Verifikasi
- `https://cyberclaw-api.vercel.app/api/health` → `{"status":"ok","timestamp":"..."}`
- Cek Cron terdaftar di Vercel → Project → **Settings → Cron Jobs**.

> Catatan `vercel.json`: `functions.maxDuration: 300` dan `crons` harian ke
> `/api/internal/retention`. Rewrite `/(.*) → /api/index` menyalurkan semua
> request ke satu Express function.

---

## Langkah 3 — Deploy frontend ke Vercel

1. Buka [vercel.com](https://vercel.com) → login dengan GitHub.
2. **Add New** → **Project** → import repo **`wieutamie/cyberclaw`**.
3. **Root Directory:** klik **Edit** → pilih **`client`** ⚠️ (wajib!)
4. Framework terdeteksi **Vite** otomatis. Pastikan:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables** → tambahkan:
   ```
   VITE_API_BASE_URL = https://cyberclaw-api.vercel.app/api
   ```
   ⚠️ Ganti dengan domain backend asli Anda. **Bukan** `/api`.
6. **Deploy** → catat domain, mis. `https://cyberclaw-cyberclaw.vercel.app`.
7. Matikan Deployment Protection (lihat 2b, ganti `projectId`).

---

## Langkah 4 — Sambungkan frontend ↔ backend

1. **Di Vercel backend:** Environment → pastikan `CLIENT_URL` berisi domain frontend:
   ```
   CLIENT_URL = https://cyberclaw-cyberclaw.vercel.app,https://cyberclaw-one.vercel.app
   ```
   (Beberapa origin dipisah koma.)
2. **Redeploy backend** (`vercel --prod`) agar CORS berlaku.
3. **Redeploy frontend** (`vercel --prod`) agar `VITE_API_BASE_URL` tertanam di bundle.

> Vite meng-*inline* env saat build. Setiap kali env Vercel berubah, **wajib redeploy**.

---

## Langkah 5 — Verifikasi

- [ ] `https://cyberclaw-api.vercel.app/api/health` → `{"status":"ok"}`
- [ ] Buka situs frontend → halaman utama tampil
- [ ] Coba scan (file ≤ 4 MB / URL / hash) → hasil muncul
- [ ] DevTools → Network → request `/api/...` mengarah ke **cyberclaw-api.vercel.app**, bukan `/api` relatif
- [ ] Refresh langsung di `/help` → tidak 404 (SPA rewrite bekerja)
- [ ] Cek tidak ada error CORS di Console
- [ ] Cek Supabase → tabel `scans` terisi setelah scan

---

## Checklist troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Vercel build gagal | Root Directory bukan `client` | Set Root Directory = `client` |
| Situs blank / API gagal | `VITE_API_BASE_URL` = `/api` | Isi URL backend lengkap + redeploy |
| Error CORS | `CLIENT_URL` di backend ≠ domain Vercel | Perbarui `CLIENT_URL` + redeploy |
| Backend crash saat start | `JWT_SECRET` / `ENCRYPTION_KEY` kosong | Isi env yang wajib |
| Scan file gagal | File > 4 MB | Batas Vercel; gunakan file lebih kecil |
| Riwayat hilang setelah beberapa saat | Migrasi Supabase belum jalan | Jalankan Langkah 1 |
| `FUNCTION_PAYLOAD_TOO_LARGE` | Body > 4,5 MB | Perkecil file |
| Halaman minta login Vercel | Deployment Protection aktif | Matikan (lihat 2b) |

---

## Referensi cepat

| Item | Nilai |
|---|---|
| Repo | `https://github.com/wieutamie/cyberclaw` |
| Root Directory Vercel (frontend) | `client` |
| Root Directory Vercel (backend) | `server` |
| Domain frontend | `https://cyberclaw-cyberclaw.vercel.app` |
| Domain backend | `https://cyberclaw-api.vercel.app` |
| Health check | `/api/health` |
| Build server | `npm run build` (tsc) |
| Entry serverless | `server/api/index.js` → `dist/app.js` |

> 🔒 **Jangan pernah** menaruh `JWT_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, atau `SYSTEM_VT_API_KEY` di variabel `VITE_*` (frontend). Semua itu hanya untuk backend.
