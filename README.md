# Sistem Informasi GMIT Lahairoi Tuak Sabu Lasiana

Platform manajemen gereja dan portal informasi publik untuk GMIT Jemaat Lahairoi Tuak Sabu Lasiana. Spesifikasi produk lengkap ada di [docs/prd.md](docs/prd.md).

## Stack

| Lapisan    | Teknologi                                                        |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + shadcn/ui     |
| Backend    | Hono di Cloudflare Workers                                       |
| Database   | Cloudflare D1 (binding `DB`)                                     |
| Deployment | Cloudflare Workers (API + aset statis SPA dalam satu Worker)     |

Proyek ini berbentuk **full-stack dalam satu paket**. `@cloudflare/vite-plugin` menjalankan Worker Hono di runtime `workerd` di dalam dev server Vite, jadi frontend dan API berbagi origin yang sama, baik saat pengembangan maupun di produksi. Dengan begitu tidak perlu proxy maupun CORS, dan cookie sesi login (Fase 1) bekerja tanpa konfigurasi lintas domain.

## Struktur folder

```
.
├── docs/prd.md                 # Product Requirements Document
├── migrations/                 # Migrasi SQL Cloudflare D1 (urut bernomor)
├── public/                     # Aset statis (favicon, dll.)
├── scripts/                    # Skrip Node: seed dan reset database lokal
├── src/
│   ├── client/                 # SPA React
│   │   ├── components/ui/      # Komponen shadcn/ui (dikelola via CLI shadcn)
│   │   ├── lib/                # utils (cn), api client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 + token tema shadcn
│   ├── worker/                 # API Hono (Cloudflare Worker)
│   │   ├── routes/             # Satu file per grup endpoint
│   │   ├── lib/                # Utilitas server (hash kata sandi, dll.)
│   │   ├── types.ts            # Tipe env Hono (Bindings)
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
npm run db:migrate:local   # membuat 15 tabel + 5 rayon di D1 lokal (.wrangler/state)
npm run db:seed:local      # akun Admin awal + contoh Pos Kas
npm run dev                # http://localhost:5173
```

Halaman awal menampilkan status API Hono, status koneksi D1, dan daftar 5 rayon bawaan yang dibaca dari database.

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

Komponen akan ditulis ke `src/client/components/ui/`. Preset yang dipakai: `radix-nova` (Radix UI, ikon Lucide, font Geist).

## Endpoint yang tersedia saat ini

| Method | Path          | Keterangan                                       |
| ------ | ------------- | ------------------------------------------------ |
| GET    | `/api/health` | Status API dan koneksi D1 (`503` jika D1 gagal)  |
| GET    | `/api/rayons` | Daftar rayon pelayanan                           |
