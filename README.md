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
├── src/
│   ├── client/                 # SPA React
│   │   ├── components/ui/      # Komponen shadcn/ui (dikelola via CLI shadcn)
│   │   ├── lib/                # utils (cn), api client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 + token tema shadcn
│   ├── worker/                 # API Hono (Cloudflare Worker)
│   │   ├── routes/             # Satu file per grup endpoint
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

Prasyarat: Node.js 22+ (diuji dengan Node 24) dan npm.

```bash
npm install
npm run db:migrate:local   # membuat tabel & data awal di D1 lokal (.wrangler/state)
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
| `npm run db:migrations:new`  | Buat file migrasi baru, contoh: `npm run db:migrations:new -- create_users`  |

## Database D1

- Binding `DB` didefinisikan di [wrangler.toml](wrangler.toml) dan diakses dari Hono melalui `c.env.DB`.
- Pengembangan lokal **tidak** memerlukan akun Cloudflare. Data disimpan di `.wrangler/state` dan dipakai bersama oleh `npm run dev`, `npm run preview`, dan perintah `wrangler d1 … --local`.
- Melihat isi database lokal:
  ```bash
  npx wrangler d1 execute DB --local --command "SELECT * FROM rayons"
  ```

### Menyiapkan database di Cloudflare (sebelum deploy pertama)

```bash
npx wrangler login
npx wrangler d1 create gmit-lahairoi-db
```

Salin `database_id` dari output ke blok `[[d1_databases]]` di `wrangler.toml`, lalu jalankan `npm run cf-typegen`, `npm run db:migrate:remote`, dan `npm run deploy`.

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
