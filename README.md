# Sistem Informasi GMIT Lahairoi Tuak Sabu Lasiana

Platform manajemen gereja dan portal informasi publik untuk GMIT Jemaat Lahairoi Tuak Sabu Lasiana. Spesifikasi produk lengkap ada di [docs/prd.md](docs/prd.md).

## Stack

| Lapisan    | Teknologi                                                        |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + shadcn/ui     |
| Backend    | Hono di Cloudflare Workers                                       |
| Routing    | React Router 8 (rute dashboard dimuat terpisah / lazy)           |
| Database   | Cloudflare D1 (binding `DB`)                                     |
| Berkas     | Cloudflare R2 (binding `FILES`)                                  |
| Deployment | Cloudflare Workers (API + aset statis SPA dalam satu Worker)     |

Proyek ini berbentuk **full-stack dalam satu paket**. `@cloudflare/vite-plugin` menjalankan Worker Hono di runtime `workerd` di dalam dev server Vite, jadi frontend dan API berbagi origin yang sama, baik saat pengembangan maupun di produksi. Dengan begitu tidak perlu proxy maupun CORS, dan cookie sesi login (Fase 1) bekerja tanpa konfigurasi lintas domain.

## Struktur folder

```
.
├── .taste-skill/               # Arah desain hasil skill design-taste-frontend (portal & app)
├── docs/prd.md                 # Product Requirements Document
├── migrations/                 # Migrasi SQL Cloudflare D1 (urut bernomor)
├── public/                     # Aset statis (favicon, font Roundo)
├── scripts/                    # Skrip Node: seed dan reset database lokal
├── src/
│   ├── client/                 # SPA React
│   │   ├── components/
│   │   │   ├── ui/             # Komponen shadcn/ui (dikelola via CLI shadcn)
│   │   │   ├── brand/          # Motif cincin sumur Lahai-roi & wordmark
│   │   │   ├── portal/         # Navbar dan footer Portal Publik
│   │   │   ├── dashboard/      # Sidebar per peran dan menu profil
│   │   │   └── session-provider.tsx
│   │   ├── layouts/            # RootLayout, PublicLayout, DashboardLayout
│   │   ├── pages/              # public/, dashboard/, LoginPage, RouteErrorPage
│   │   ├── lib/                # api (fetch wrapper), upload, session, navigation
│   │   ├── router.tsx          # Definisi semua rute
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 + token tema portal & dashboard
│   ├── worker/                 # API Hono (Cloudflare Worker)
│   │   ├── routes/             # Satu file per grup endpoint
│   │   ├── middleware/         # requireAuth, requireRole (RBAC)
│   │   ├── lib/                # Hash kata sandi, sesi, log aktivitas
│   │   ├── types.ts            # Tipe env Hono (Bindings, Variables)
│   │   └── index.ts            # Entry Worker, basePath /api
│   └── shared/                 # Tipe yang dipakai bersama client & worker
├── components.json             # Konfigurasi shadcn/ui
├── vite.config.ts
├── wrangler.toml               # Konfigurasi Worker + binding D1
├── worker-configuration.d.ts   # Hasil `npm run cf-typegen` (jangan diedit manual)
├── tsconfig.app.json           # TS untuk src/client (DOM)
├── tsconfig.worker.json        # TS untuk src/worker (runtime Workers)
└── tsconfig.node.json          # TS untuk vite.config.ts
```

Alias impor: `@/…` mengarah ke `src/client/…` dan `@shared/…` ke `src/shared/…` (khusus frontend). Kode Worker memakai impor relatif.

## Memulai

Prasyarat: Node.js 22.18+ (diuji dengan Node 24) dan npm. Skrip di `scripts/*.ts` dijalankan langsung oleh Node tanpa langkah build.

```bash
npm install
npm run db:migrate:local   # membuat tabel + 5 rayon di D1 lokal (.wrangler/state)
npm run db:seed:local      # akun Admin awal + contoh Pos Kas
npm run dev                # http://localhost:5173
```

Buka `/` untuk Portal Publik dan `/dashboard` untuk dashboard pengurus.

## Rute dan layout

| Rute                 | Layout            | Isi                                                               |
| -------------------- | ----------------- | ----------------------------------------------------------------- |
| `/`                  | `PublicLayout`    | Beranda portal                                                    |
| `/jadwal`, `/warta`, `/renungan`, `/persembahan`, `/tentang` | `PublicLayout` | Kerangka halaman portal (diisi modul Portal Publik) |
| `/login`             | berdiri sendiri   | Masuk pengurus                                                    |
| `/dashboard`         | `DashboardLayout` | Ringkasan: modul per peran, rayon, status sistem                  |
| `/dashboard/*`       | `DashboardLayout` | Halaman modul; ditolak bila peran tidak berhak                    |

- **PublicLayout**: navbar (wordmark, 4 tautan, tombol Persembahan); di bawah 1024px menjadi tombol "Menu" yang membuka menu layar penuh. Footer membawa tanda Lahairoi, tautan, dan alamat.
- **DashboardLayout**: sidebar yang bisa dibuka-tutup (tombol di header, `Ctrl/⌘+B`, atau rail di tepi sidebar) menjadi rail ikon 48px; di bawah 1024px menjadi sheet. Header berisi breadcrumb dan menu profil (nama, peran, keluar).
- Menu sidebar dan hak akses halaman diatur di [src/client/lib/navigation.ts](src/client/lib/navigation.ts) sesuai PRD. Ini hanya mengatur tampilan; pembatasan sebenarnya harus ditegakkan API.

Dashboard hanya bisa dibuka setelah masuk di `/login` (lihat [Autentikasi & hak akses](#autentikasi--hak-akses)). Halaman yang dibuka sebelum masuk diingat, lalu dibuka kembali setelah login berhasil.

## Desain

Desain dibuat dengan skill `design-taste-frontend` dan `ui-ux-pro-max` di `.claude/skills/`. Arah desain tersimpan di `.taste-skill/` dan dipakai lagi untuk halaman berikutnya.

- **Portal Publik**, arah *one motif* (seed 1525544793): satu-satunya motif adalah **sumur Lahai-roi** (Kejadian 16:13–14) dilihat dari atas, yaitu sebuah cincin. Cincin itu muncul sebagai tanda merek, penanda tautan aktif, bentuk raksasa di hero, dan bibir sumur dari sepuluh batu di footer. Palet hitam & crimson diambil dari warna tenun ikat Sabu. Huruf: Roundo (di-host sendiri di `public/fonts`).
- **Dashboard**, gaya *achromatic ledger* (seed 442642274): chrome tanpa warna, dasar batu karang `#f4f3f1`, tombol utama hampir hitam, dan crimson hanya untuk elemen data utama.
- Token warna ada di [src/client/index.css](src/client/index.css): `:root` untuk dashboard, `.theme-portal` untuk portal. Pakai token (`bg-background`, `text-muted-foreground`, `text-brand`, …), bukan kode warna langsung.

Periksa tampilan dengan inspector skill (butuh Chrome atau Edge):

```bash
node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:5173/
```

Untuk dashboard tambahkan `--app` dan buka `/dashboard`. Jika Chrome gagal diluncurkan di Windows, set `CHROME_PATH` ke `msedge.exe`.

## Memanggil API dari frontend

Semua panggilan memakai [src/client/lib/api.ts](src/client/lib/api.ts):

```ts
import { api, ApiError } from '@/lib/api'

const { data } = await api.get<ApiList<Rayon>>('/rayons', { query: { aktif: 1 } })
await api.post('/members', { full_name: 'Maria Ndun' })

try {
  await api.delete(`/members/${id}`)
} catch (err) {
  if (err instanceof ApiError) toast(err.message) // pesan sudah berbahasa Indonesia
}
```

- Objek dikirim sebagai JSON; `FormData` dikirim apa adanya. Timeout bawaan 30 detik, bisa dibatalkan dengan `signal`.
- `ApiError` berisi `status` (0 bila jaringan putus atau timeout), `message`, dan `details` (error per field dari validasi server).
- Header `Authorization: Bearer <token>` ditambahkan otomatis bila `configureApi({ getToken })` mengembalikan token. Respons `401` memanggil `onUnauthorized`, yang mengosongkan sesi lalu mengarahkan ke `/login`. Gunakan `{ auth: false }` untuk endpoint seperti login.

## Autentikasi & hak akses

Pengurus (Admin, Bendahara, Pendeta, Majelis) masuk di `/login` dengan **email atau username** dan kata sandi. Warga jemaat tidak memerlukan akun.

**Sesi.** Login yang berhasil membuat sesi di tabel `sessions` dan mengirim cookie `gmit_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`). Di HTTPS nama cookie memakai prefiks `__Host-` dan atribut `Secure`.
- Token sesi tidak pernah dikirim di body respons; database hanya menyimpan hash SHA-256-nya.
- Sesi berlaku 12 jam sejak aktivitas terakhir, dan diperpanjang otomatis bila sisanya di bawah 6 jam.
- Klien non-browser bisa memakai header `Authorization: Bearer <token>`.

Sesi opaque di D1 dipilih ketimbang JWT supaya **logout dan penonaktifan akun berlaku seketika**.

**Akun nonaktif** (`is_active = 0`):
- ditolak saat login (`403`), tetapi hanya setelah kata sandinya benar, sehingga status akun tidak bocor ke penebak;
- semua sesinya langsung dihapus oleh trigger `trg_users_deactivated`;
- middleware tetap menolak akun nonaktif sebagai pengaman kedua.

**Perlindungan lain:**
- Pesan login salah sama untuk akun yang ada maupun tidak, dan lama responsnya dibuat sama.
- Setelah **5 kali gagal dalam 15 menit**, login untuk email/username itu dikunci sementara (`429`).
- Kiriman form dari situs lain ditolak oleh middleware `csrf()` Hono (`403`).
- Setiap `LOGIN`, `LOGIN_FAILED`, `LOGIN_REJECTED_INACTIVE`, dan `LOGOUT` dicatat di `audit_logs`.

**Melindungi endpoint** ([src/worker/middleware/auth.ts](src/worker/middleware/auth.ts)):

```ts
import { requireAuth, requireRole } from '../middleware/auth'

members.get('/', requireRole('ADMIN', 'PASTOR', 'ELDER'), handler)  // 401 tanpa sesi, 403 bila peran tidak sesuai
transactions.post('/', requireRole('TREASURER'), handler)
profile.get('/', requireAuth, (c) => c.json(c.get('user')))       // semua pengurus yang sudah masuk
```

`requireRole` sudah mencakup autentikasi, dan pengguna yang masuk tersedia di `c.get('user')`. Menu di [src/client/lib/navigation.ts](src/client/lib/navigation.ts) hanya mengatur apa yang terlihat; pembatasan sebenarnya selalu ditegakkan dengan middleware ini di API.

**Mencoba di lokal:**

```bash
npm run db:migrate:local
npm run db:seed:local -- --sample-users
npm run dev
```

Lalu masuk di `http://localhost:5173/login` memakai akun yang dicetak oleh seed.

> **Catatan biaya CPU:** verifikasi kata sandi (PBKDF2-SHA256, 100.000 iterasi) memakan ±50 ms CPU per login. Batas Workers Free adalah 10 ms CPU per request, jadi login berisiko gagal di paket gratis. Gunakan Workers Paid, atau turunkan `ITERATIONS` di [src/worker/lib/password.ts](src/worker/lib/password.ts); hash lama tetap valid karena jumlah iterasi tersimpan di dalam hash.

## Unggah berkas

Berkas (PDF warta, kuitansi, foto, berkas sakramen) disimpan di **Cloudflare R2**, bukan sebagai base64 di D1, karena baris D1 terlalu kecil untuk PDF.

```ts
import { uploadFile, UPLOAD_ACCEPT } from '@/lib/upload'

const berkas = await uploadFile(file, { folder: 'kuitansi', onProgress: setPersen })
// berkas.url → "/api/files/kuitansi/2026/10/<uuid>.pdf", simpan ke kolom receipt_url
```

- Jenis yang diterima: JPG, PNG, WebP, dan PDF, maksimal 10 MB. Folder yang tersedia didefinisikan di [src/shared/uploads.ts](src/shared/uploads.ts).
- Server memeriksa jenis berkas dari **isinya** (magic bytes), bukan dari nama atau `Content-Type` kiriman browser.
- Lokal, R2 disimulasikan di `.wrangler/state`. Sebelum deploy pertama, buat bucket-nya:

  ```bash
  npx wrangler r2 bucket create gmit-lahairoi-files
  ```

- Mengunggah wajib login, dan tiap folder punya peran yang boleh mengisinya: `kuitansi` untuk Bendahara; `warta`, `media`, `surat` untuk Admin; `konten`, `liturgi`, `sakramen` untuk Admin dan Pendeta (`UPLOAD_FOLDER_ROLES`).
- Berkas di folder portal (`warta`, `konten`, `media`, `liturgi`) bisa diunduh siapa saja. Berkas `kuitansi`, `sakramen`, dan `surat` hanya untuk pengurus yang sudah masuk.

## Skrip

| Skrip                        | Fungsi                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                | Dev server Vite + Worker Hono (workerd) + D1 lokal, dengan HMR               |
| `npm run build`              | Typecheck lalu build client (`dist/client`) dan Worker (`dist/gmit_…`)        |
| `npm run preview`            | Build lalu jalankan hasil build di `vite preview` (runtime workerd)          |
| `npm run preview:worker`     | Build lalu jalankan Worker hasil build dengan `wrangler dev` (port 8787)     |
| `npm run deploy`             | Build lalu `wrangler deploy` ke Cloudflare                                   |
| `npm run typecheck`          | `tsc -b` untuk client, worker, dan config                                    |
| `npm run lint`               | Oxlint                                                                       |
| `npm run cf-typegen`         | Regenerasi `worker-configuration.d.ts` setelah mengubah `wrangler.toml`      |
| `npm run db:migrate:local`   | Terapkan migrasi D1 ke database lokal                                        |
| `npm run db:migrate:remote`  | Terapkan migrasi D1 ke database Cloudflare                                   |
| `npm run db:migrations:new`  | Buat file migrasi baru, contoh: `npm run db:migrations:new -- add_x`         |
| `npm run db:seed:local`      | Seed Admin awal + contoh Pos Kas ke D1 lokal (aman diulang)                  |
| `npm run db:seed:remote`     | Seed yang sama ke database Cloudflare                                        |
| `npm run db:reset:local`     | Hapus D1 lokal, lalu migrasi dan seed ulang (hentikan dev server dulu)       |

## Database D1

- Binding `DB` didefinisikan di [wrangler.toml](wrangler.toml) dan diakses dari Hono melalui `c.env.DB`.
- Pengembangan lokal **tidak** memerlukan akun Cloudflare. Data disimpan di `.wrangler/state` dan dipakai bersama oleh `npm run dev`, `npm run preview`, dan perintah `wrangler d1 … --local`.
- Melihat isi database lokal:
  ```bash
  npx wrangler d1 execute DB --local --command "SELECT * FROM rayons"
  ```

### Skema

| Migrasi | Tabel                                                            | Modul PRD                     |
| ------- | ---------------------------------------------------------------- | ----------------------------- |
| 0001    | `rayons` (+ 5 rayon bawaan)                                      | Database Jemaat               |
| 0002    | `users`, `audit_logs`                                            | Autentikasi & Hak Akses       |
| 0003    | `families`, `members`                                            | Database Jemaat & KK          |
| 0004    | `finance_funds`, `finance_budgets`, `finance_transactions`       | Keuangan Multi-Pos & RAPBJ    |
| 0005    | `public_contents`                                                | Portal Publik & Warta         |
| 0006    | `worship_schedules`, `worship_servants`                          | Ibadah, Pelayan & Kehadiran   |
| 0007    | `sacrament_applications`, `mail_archives`                        | Sakramen & Persuratan         |
| 0008    | `assets`, `asset_loans`                                          | Aset & Inventaris             |
| 0009    | `sessions` (+ trigger penghapus sesi akun nonaktif)               | Autentikasi & Hak Akses       |

Konvensi yang dipakai di semua tabel:

- **Nominal uang** adalah bilangan bulat Rupiah (`INTEGER`, tanpa desimal); nilai desimal ditolak oleh CHECK.
- **Tanggal** berformat `YYYY-MM-DD`, **jam** `HH:MM`, **timestamp** `YYYY-MM-DD HH:MM:SS` (UTC, dari `datetime('now')`). Format lain (misalnya `12/04/2010` dari Excel) ditolak database, jadi impor harus menormalkan tanggal lebih dulu. CHECK tanggal ditulis `date(x) IS x` (bukan `=`) karena di SQLite CHECK yang bernilai NULL dianggap lolos.
- **Boolean** adalah `INTEGER` 0/1. **Enum** disimpan sebagai teks huruf besar sesuai PRD (mis. `ADMIN`, `KAUM_IBU`) dan dijaga CHECK.
- Email, username, kode Pos Kas, kode mata anggaran, dan kode aset unik **tanpa membedakan huruf besar/kecil** (`COLLATE NOCASE`).
- Kolom `updated_at` diisi oleh aplikasi saat mengubah data.
- **Akun pengguna tidak dihapus**, melainkan dinonaktifkan (`is_active = 0`); database menolak penghapusan user yang sudah punya riwayat.
- Kolom turunan dihitung database:
  - `finance_funds.current_balance` diperbarui otomatis oleh trigger setiap transaksi ditambah, diubah, atau dihapus. **Jangan mengubah kolom ini dari aplikasi.**
  - `members.is_deceased` diturunkan dari `status = 'DECEASED'`.
  - `worship_schedules.attendance_total` adalah jumlah kehadiran pria + wanita + anak/pemuda.

Perubahan skema berikutnya selalu ditambahkan sebagai file migrasi baru (`npm run db:migrations:new -- <nama>`); migrasi yang sudah diterapkan ke database Cloudflare jangan diedit.

### Seed data awal

`npm run db:seed:local` (atau `db:seed:remote`) menjalankan [scripts/seed.ts](scripts/seed.ts):

- 5 rayon bawaan, hanya jika tabel `rayons` kosong (normalnya sudah dibuat oleh migrasi 0001).
- 4 contoh Pos Kas: `UMUM` (Kas Umum / Sinode), `PEMBANGUNAN`, `DIAKONIA`, dan `KATEGORIAL`. Semuanya bisa diubah atau dinonaktifkan Bendahara.
- 1 akun Admin aktif.
- Dengan `npm run db:seed:local -- --sample-users` (khusus lokal): akun contoh `bendahara`, `pendeta`, dan `majelis.golgota` untuk mencoba hak akses per peran. Kata sandinya acak dan tampil sekali.

Seed aman dijalankan berulang kali: data yang sudah ada tidak diubah, termasuk kata sandi Admin. Data Admin bisa diatur lewat variabel lingkungan:

| Variabel              | Bawaan                       |
| --------------------- | ---------------------------- |
| `SEED_ADMIN_NAME`     | `Administrator`              |
| `SEED_ADMIN_EMAIL`    | `admin@gmit-lahairoi.local`  |
| `SEED_ADMIN_USERNAME` | `admin`                      |
| `SEED_ADMIN_PASSWORD` | acak, minimal 12 karakter    |

Jika `SEED_ADMIN_PASSWORD` tidak diisi, kata sandi acak dibuat dan **ditampilkan satu kali** di terminal. Kata sandi disimpan sebagai hash PBKDF2-SHA256 ([src/worker/lib/password.ts](src/worker/lib/password.ts)), tidak pernah sebagai teks biasa.

### Menyiapkan database di Cloudflare (sebelum deploy pertama)

```bash
npx wrangler login
npx wrangler d1 create gmit-lahairoi-db
```

Salin `database_id` dari output ke blok `[[d1_databases]]` di `wrangler.toml`, lalu jalankan `npm run cf-typegen`, `npm run db:migrate:remote`, `npm run db:seed:remote`, dan `npm run deploy`.

## Menambah komponen shadcn/ui

```bash
npx shadcn@latest add dialog table select
```

Komponen akan ditulis ke `src/client/components/ui/`. Preset yang dipakai: `radix-nova` (Radix UI, ikon Lucide); font diganti Roundo lewat token. Beberapa komponen sudah disesuaikan untuk proyek ini dan perlu dicek ulang bila ditimpa CLI: breakpoint sidebar di `lg` (1024px), overlay sheet tanpa blur, dan teks aksesibilitas berbahasa Indonesia.

## Endpoint yang tersedia saat ini

| Method | Path               | Akses       | Keterangan                                           |
| ------ | ------------------ | ----------- | ---------------------------------------------------- |
| GET    | `/api/health`      | Publik      | Status API dan koneksi D1 (`503` jika D1 gagal)      |
| GET    | `/api/rayons`      | Publik      | Daftar rayon pelayanan                               |
| POST   | `/api/auth/login`  | Publik      | Masuk; mengirim cookie sesi dan profil pengguna      |
| POST   | `/api/auth/logout` | Publik      | Keluar; menghapus sesi dan cookie                    |
| GET    | `/api/auth/me`     | Login       | Profil pengguna yang sedang masuk                    |
| GET    | `/api/users`       | Admin       | Daftar akun pengurus                                 |
| POST   | `/api/uploads`     | Login + peran folder | Unggah berkas ke R2 (`multipart`: `file`, `folder`) |
| GET    | `/api/files/*`     | Publik / Login | Ambil berkas dari R2 (mendukung ETag / `304`)     |
