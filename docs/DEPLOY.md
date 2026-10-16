# Cyber Claw — Panduan Deployment

Arsitektur deploy:

| Bagian | Platform | Catatan |
|---|---|---|
| `client/` (React + Vite SPA) | **Vercel** | Root Directory = `client` |
| `server/` (Express API) | **Render** (Blueprint) | Root Directory = `server` |
| `supabase/` (SQL) | **Supabase SQL Editor** | Jalankan manual |
| VirusTotal API | VirusTotal | Key disimpan di server saja |

> ⚠️ **Jangan deploy `server/` ke Vercel.** Server butuh proses persisten (cron harian + rate limiter in-memory). Vercel serverless tidak cocok.

---

## Urutan deploy (penting!)

**Backend dulu, baru frontend**, karena frontend butuh URL backend.

```
Supabase (migrasi)  →  Render (backend)  →  Vercel (frontend)  →  Sambungkan  →  Verifikasi
```

---

## Langkah 1 — Migrasi database Supabase

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → pilih project Anda.
2. Menu kiri → **SQL Editor** → **New query**.
3. Copy-paste isi file `supabase/migrations/20240101_init.sql` → **Run**.
4. Ulangi untuk `supabase/migrations/20240102_anon_sessions.sql` → **Run**.
5. Cek menu **Table Editor** → tabel `scans`, `user_settings`, dll. harus muncul.

**Ambil kredensial** (dipakai di Langkah 2): **Settings → API**
- **Project URL** → untuk `SUPABASE_URL`
- **service_role** key (klik "Reveal") → untuk `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ini rahasia, server-only

---

## Langkah 2 — Deploy backend ke Render

### 2a. Buat Blueprint
1. Buka [dashboard.render.com](https://dashboard.render.com) → login dengan GitHub.
2. **New** → **Blueprint**.
3. Pilih repo **`wieutamie/cyberclaw`** → Render otomatis membaca `render.yaml`.
4. Klik **Apply**.

### 2b. Isi environment variables
Render akan meminta nilai untuk variabel `sync: false`:

| Variable | Nilai | Cara dapat |
|---|---|---|
| `ENCRYPTION_KEY` | string acak | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CLIENT_URL` | `https://placeholder.vercel.app` | ganti nanti di Langkah 4 |
| `SUPABASE_URL` | Project URL | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | Supabase → Settings → API |
| `SYSTEM_VT_API_KEY` | API key VirusTotal | [virustotal.com](https://www.virustotal.com) → profil → API Key |

> `JWT_SECRET` **dibuat otomatis** oleh Render (`generateValue: true`). `NODE_ENV=production` sudah di-set.

### 2c. Deploy & catat domain
1. Tunggu build selesai (status **Live**).
2. Catat URL service, mis. `https://cyberclaw-api.onrender.com`.
3. Tes: buka `https://cyberclaw-api.onrender.com/api/health` → harus `{"status":"ok","timestamp":"..."}`.

> ⚠️ **Tier gratis tidur setelah ~15 menit idle.** Request pertama bisa lambat 30–60 detik. Buka `/api/health` dulu sebelum demo untuk "membangunkan".

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
   VITE_API_BASE_URL = https://cyberclaw-api.onrender.com/api
   ```
   ⚠️ Ganti dengan domain backend asli Anda. **Bukan** `/api`.
6. **Deploy** → catat domain, mis. `https://cyberclaw.vercel.app`.

---

## Langkah 4 — Sambungkan frontend ↔ backend

1. **Di Render:** Settings → Environment → ubah `CLIENT_URL` menjadi domain Vercel Anda:
   ```
   CLIENT_URL = https://cyberclaw.vercel.app
   ```
   (Beberapa origin dipisah koma, mis. tambah domain preview Vercel.)
2. **Redeploy Render** (Manual Deploy → Deploy latest commit) agar CORS berlaku.
3. **Di Vercel:** Deployments → **Redeploy** agar `VITE_API_BASE_URL` tertanam di bundle.

> Vite meng-*inline* env saat build. Setiap kali env Vercel berubah, **wajib redeploy**.

---

## Langkah 5 — Verifikasi

- [ ] `https://<backend>/api/health` → `{"status":"ok"}`
- [ ] Buka situs Vercel → halaman utama tampil
- [ ] Coba scan (file / URL / hash) → hasil muncul
- [ ] DevTools → Network → request `/api/...` mengarah ke domain **Render**, bukan Vercel
- [ ] Refresh langsung di `/help` → tidak 404 (SPA rewrite bekerja)
- [ ] Cek tidak ada error CORS di Console

---

## Checklist troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Vercel build gagal | Root Directory bukan `client` | Set Root Directory = `client` |
| Situs blank / API gagal | `VITE_API_BASE_URL` = `/api` | Isi URL backend lengkap |
| Error CORS | `CLIENT_URL` di backend ≠ domain Vercel | Perbarui `CLIENT_URL` + redeploy |
| Backend crash saat start | `JWT_SECRET` / `ENCRYPTION_KEY` kosong | Isi env yang wajib |
| Request pertama lambat | Render free tier cold start | Normal; buka health check dulu |
| Scan jalan tapi data hilang | Backend belum jalan → mode mock | Pastikan backend Live |

---

## Referensi cepat

| Item | Nilai |
|---|---|
| Repo | `https://github.com/wieutamie/cyberclaw` |
| Root Directory Vercel | `client` |
| Root Directory Render | `server` |
| Health check | `/api/health` |
| Build server | `npm ci && npm run build` |
| Start server | `node dist/index.js` |

> 🔒 **Jangan pernah** menaruh `JWT_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, atau `SYSTEM_VT_API_KEY` di Vercel atau di variabel `VITE_*`. Semua itu hanya untuk backend.
