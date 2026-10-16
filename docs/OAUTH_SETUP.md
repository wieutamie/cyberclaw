# Panduan Mengaktifkan Login Google & GitHub

Tombol **Google** dan **GitHub** di halaman Sign In / Sign Up memakai **Supabase
OAuth**. Supaya tombol ini benar-benar membuka layar pilih akun Google/GitHub,
kamu perlu menyiapkan kredensial di Supabase dan **Google Cloud Console** /
**GitHub Developer Settings**.

> Ringkasan alur: Browser → tombol Google/GitHub → Supabase → layar akun Google/GitHub →
> kembali ke `/auth/callback` → server CyberClaw menukar sesi Supabase menjadi sesi
> miliknya sendiri (JWT HS256) → masuk dashboard.

Ada **3 bagian**: (A) buat project Supabase, (B) aktifkan provider, (C) isi env di
client & server. Bagian B punya dua sub-bagian karena Google dan GitHub perlu
kredensial OAuth masing-masing.

---

## A. Buat project Supabase

1. Buka https://supabase.com → **New project**. Catat **Project URL** dan
   **anon public key** (Settings → API).
2. Buat tabel `profiles` (hanya perlu sekali). Di **SQL Editor** jalankan:

   ```sql
   create table if not exists public.profiles (
     id uuid primary key,
     full_name text,
     username text unique,
     created_at timestamptz default now()
   );
   ```

3. Di **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` (dev) atau domain produksi.
   - **Redirect URLs** (tambahkan semuanya):
     - `http://localhost:5173/auth/callback`
     - `http://localhost:5173/reset-password`
     - `https://<domain-produksi>/auth/callback`
     - `https://<domain-produksi>/reset-password`

---

## B. Aktifkan provider OAuth

### B1. Google

1. Buka **Google Cloud Console** → https://console.cloud.google.com
2. Buat/ pilih project → **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - Isi App name, User support email, Developer contact. Simpan.
   - (Dev) Di **Test users**, tambahkan email Google yang akan dipakai tes.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: salin dari Supabase: **Authentication →
     Providers → Google**, di situ tertulis
     `https://<project-ref>.supabase.co/auth/v1/callback`. Tempel persis ke sini.
   - Klik Create → salin **Client ID** dan **Client Secret**.
4. Di **Supabase → Authentication → Providers → Google**:
   - Toggle **Enable**.
   - Tempel **Client ID** dan **Client Secret**.
   - Save.

### B2. GitHub

1. Buka **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:
   https://github.com/settings/developers
2. Isi:
   - **Application name**: CyberClaw (bebas).
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (sama seperti Supabase callback URL).
   - Register application.
3. Klik **Generate a new client secret** → salin **Client ID** dan **Client Secret**.
4. Di **Supabase → Authentication → Providers → GitHub**:
   - Toggle **Enable**, tempel Client ID + Secret, Save.

---

## C. Isi variabel environment

### Client — `client/.env`

```env
VITE_API_BASE_URL=/api
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key dari Settings → API>
```

> Tanpa dua nilai `VITE_SUPABASE_*` ini, tombol Google/GitHub akan menampilkan
> pesan “Login sosial belum dikonfigurasi” (tidak error mentah).

### Server — `server/.env`

Server memakai **service role key** untuk memverifikasi token sosial dan
meng-upsert profil:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key dari Settings → API>
SUPABASE_ANON_KEY=<anon public key>
```

Setelah mengubah `.env`, **restart** kedua dev server (`npm run dev` di `server`
dan `client`).

---

## D. Uji coba

1. `server`: `npm run dev` (port 4000).
2. `client`: `npm run dev` (port 5173).
3. Buka `http://localhost:5173/signin`.
4. Klik **Google** → harus muncul layar **“Pilih akun”** Google. Pilih akun →
   kembali ke `/auth/callback` → masuk **dashboard**.
5. Klik **GitHub** → muncul layar **Authorize/Masuk** GitHub → kembali ke
   dashboard.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| Muncul pesan “Login sosial belum dikonfigurasi” | `VITE_SUPABASE_URL`/`ANON_KEY` masih kosong di `client/.env`. Isi lalu restart Vite. |
| Google: `redirect_uri_mismatch` | Authorized redirect URI di Google Console belum sama dengan `https://<ref>.supabase.co/auth/v1/callback`. |
| Setelah redirect balik, tetap di `/signin` dengan error | Server menolak token: cek `SUPABASE_SERVICE_ROLE_KEY` di `server/.env`, dan pastikan provider **Enabled** di Supabase. |
| `email not confirmed` / akun duplikat | Buat akun lewat Google dengan email yang berbeda, atau hapus user di Supabase → Authentication → Users. |
| Tombol GitHub meminta “Authorize” berulang | Normal pada akses pertama untuk tiap akun; OAuth app GitHub juga bisa di-revoke dari Settings akun. |

> Catatan: login email/password **tidak** butuh Supabase. Fitur ini hanya untuk
> tombol sosial dan reset password via email.
