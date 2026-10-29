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
├── public/                     # Aset statis (favicon, foto gereja)
├── scripts/                    # Skrip Node: seed dan reset database lokal
├── src/
│   ├── client/                 # SPA React
│   │   ├── components/
│   │   │   ├── ui/             # Komponen shadcn/ui (dikelola via CLI shadcn)
│   │   │   ├── brand/          # Motif cincin sumur Lahai-roi & wordmark
│   │   │   ├── portal/         # Header, footer, navigasi, tombol tema, dan komponen kage/ Portal Publik
│   │   │   ├── dashboard/      # Sidebar per peran dan menu profil
│   │   │   ├── users/          # Dialog form akun dan kata sandi sementara
│   │   │   ├── congregation/   # Form KK, profil anggota, rayon; panel profil; pemilih KK
│   │   │   ├── finance/        # Form Pos Kas, mata anggaran, transaksi; kuitansi; panel rincian
│   │   │   ├── form-parts.tsx  # Pesan error, petunjuk, dan bagian form dashboard
│   │   │   ├── upload-field.tsx # Field unggah berkas (PDF warta, gambar, QRIS, kuitansi) ke R2
│   │   │   └── session-provider.tsx
│   │   ├── layouts/            # RootLayout, PublicLayout, DashboardLayout
│   │   ├── pages/              # public/, dashboard/, LoginPage, RouteErrorPage
│   │   ├── lib/                # api, use-api-query, use-url-filters, upload, session, navigation, format WITA, audit-format, congregation, finance, contents, portal, use-live-reload, read-spreadsheet, member-files
│   │   ├── router.tsx          # Definisi semua rute
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 + token tema portal & dashboard
│   ├── worker/                 # API Hono (Cloudflare Worker)
│   │   ├── routes/             # Satu file per grup endpoint
│   │   ├── middleware/         # requireAuth, requireRole (RBAC)
│   │   ├── lib/                # Hash kata sandi, sesi, log aktivitas, pembaca request, data jemaat, keuangan, konten portal
│   │   ├── types.ts            # Tipe env Hono (Bindings, Variables)
│   │   └── index.ts            # Entry Worker, basePath /api
│   └── shared/                 # Tipe, aturan validasi, format impor/ekspor & penulis CSV/XLSX (client & worker)
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
| `/`                  | `PublicLayout`    | Beranda: pengumuman terkini, hero, jadwal ibadah terdekat, renungan hari ini, unduh warta PDF, berita |
| `/profil`            | `PublicLayout`    | Profil & Sejarah: sejarah, visi misi, 5 rayon pelayanan, Pendeta & Majelis (`/tentang` dialihkan ke sini) |
| `/persembahan`       | `PublicLayout`    | Persembahan: gambar QRIS dan rekening per pos kas dengan tombol salin |
| `/jadwal`            | `PublicLayout`    | Papan Jadwal Ibadah dengan saringan jenis ibadah (`?jenis=`) dan rayon (`?rayon=`) |
| `/warta`             | `PublicLayout`    | Warta Jemaat: warta terbaru dengan pratinjau PDF, arsip yang bisa dicari, tombol unduh |
| `/renungan`, `/renungan/:slug` | `PublicLayout` | Daftar Renungan Rohani dan halaman baca satu renungan |
| `/berita`, `/berita/:slug` | `PublicLayout` | Daftar Berita & Pengumuman dan halaman baca satu berita |
| `/media`             | `PublicLayout`    | Galeri Kegiatan: foto dan video dokumentasi, dibuka dalam jendela galeri |
| `/layanan-sakramen`  | `PublicLayout`    | Layanan Sakramen: Cek Status dengan kode registrasi, formulir Baptisan/Sidi/Nikah bertab (`?layanan=baptis\|sidi\|nikah`) dengan unggah berkas syarat |
| `/login`             | berdiri sendiri   | Masuk pengurus                                                    |
| `/dashboard`         | `DashboardLayout` | Ringkasan (Dashboard Eksekutif): 4 metrik utama, demografi per rayon & kategorial, ulang tahun minggu/bulan ini, arus kas & saldo Pos Kas, tren kehadiran; filter tahun & bulan (`?year=&month_from=&month_to=&ibadah=`); aktivitas terbaru (Admin) |
| `/dashboard/members` | `DashboardLayout` | Anggota Jemaat (Admin, Pendeta, Majelis): cari, filter kombinasi di URL, profil lengkap, ekspor |
| `/dashboard/members/import` | `DashboardLayout` | Impor data jemaat dari Excel/CSV dengan pratinjau validasi (Admin) |
| `/dashboard/families` | `DashboardLayout` | Kartu Keluarga per rayon; KK baru langsung dibuka untuk diisi anggotanya |
| `/dashboard/families/:id` | `DashboardLayout` | Rincian KK: seluruh anggota, data KK, tambah Kepala Keluarga/anggota |
| `/dashboard/rayons`  | `DashboardLayout` | Rayon (Admin): koordinator, keterangan, jumlah KK dan jiwa |
| `/dashboard/finance/transactions` | `DashboardLayout` | Transaksi Kas: kas masuk/keluar per bulan, total, bukti kuitansi (Bendahara dan Admin mencatat; Pendeta dan Majelis membaca) |
| `/dashboard/finance/budgets` | `DashboardLayout` | Pos Kas & RAPBJ: saldo Pos Kas, target dan realisasi tiap mata anggaran per tahun |
| `/dashboard/finance/reports` | `DashboardLayout` | Laporan Keuangan mingguan/bulanan/tahunan per Pos Kas, siap cetak untuk Warta Jemaat (keempat peran) |
| `/dashboard/contents` | `DashboardLayout` | Warta & Konten (Admin): warta PDF, renungan, berita, galeri, profil, rekening & QRIS; tambah di `/new?category=…`, ubah di `/:id` |
| `/dashboard/renungan` | `DashboardLayout` | Renungan Saya (Pendeta): halaman yang sama, hanya renungan miliknya |
| `/dashboard/worships` | `DashboardLayout` | Jadwal Ibadah (Admin, Pendeta, Majelis): jadwal mendatang dengan tanda bentrok petugas, ibadah yang sudah berlangsung dengan absensi; tambah di `/new`, ubah jadwal & petugas di `/:id` (Admin dan Pendeta) |
| `/dashboard/sacraments` | `DashboardLayout` | Layanan Sakramen (Admin, Pendeta): antrean verifikasi dan Buku Induk per jenis; rincian & verifikasi di `/:id`, cetak sertifikat 2 mode di `/:id/cetak` |
| `/dashboard/mails`   | `DashboardLayout` | Buku Agenda Surat (Admin): surat masuk/keluar dengan filter arah, tahun, kategori, pencarian; catat dan unggah salinan, buka/unduh, hapus |
| `/dashboard/assets`  | `DashboardLayout` | Inventaris (Admin, Majelis): tab Katalog Inventaris dengan filter kategori, lokasi, kondisi; tab Peminjaman Barang dengan tanda terlambat; catat peminjaman dan konfirmasi pengembalian |
| `/dashboard/users`   | `DashboardLayout` | Akun Pengurus (Admin): tambah, ubah peran/rayon, atur ulang kata sandi, nonaktifkan |
| `/dashboard/audit-logs` | `DashboardLayout` | Log Aktivitas (Admin): riwayat per hari, filter tanggal/aksi/data/pengguna di URL |
| `/dashboard/*`       | `DashboardLayout` | Halaman modul lain (kerangka); ditolak bila peran tidak berhak    |

- **PublicLayout**: navbar (wordmark, 4 tautan, tombol Persembahan); di bawah 1024px menjadi tombol "Menu" yang membuka menu layar penuh. Footer membawa tanda Lahairoi, tautan, dan alamat.
- **DashboardLayout**: sidebar yang bisa dibuka-tutup (tombol di header, `Ctrl/⌘+B`, atau rail di tepi sidebar) menjadi rail ikon 48px; di bawah 1024px menjadi sheet. Header berisi breadcrumb dan menu profil (nama, peran, keluar).
- Menu sidebar dan hak akses halaman diatur di [src/client/lib/navigation.ts](src/client/lib/navigation.ts) sesuai PRD. Ini hanya mengatur tampilan; pembatasan sebenarnya harus ditegakkan API.
- Halaman modul yang sudah dibangun didaftarkan di `modulePages` pada [src/client/router.tsx](src/client/router.tsx); modul lain memakai kerangka `ModulePage`.

**Guard di React** ([src/client/components/session-provider.tsx](src/client/components/session-provider.tsx)):

- `RequireAuth` membungkus seluruh dashboard. Tanpa sesi, pengguna diarahkan ke `/login`, lalu setelah masuk dikembalikan ke halaman semula (termasuk query-nya).
- `RequireRole` membungkus setiap halaman modul di router. Untuk peran lain, halaman itu tidak dirender sama sekali (datanya juga tidak diminta) dan tampil pesan "Akses dibatasi".
- `<Can roles>` atau `useCan(roles)` menyembunyikan tombol aksi per peran:

```tsx
import { Can } from '@/components/session-provider'

<Can roles={['TREASURER']}>
  <Button>Catat transaksi</Button>  {/* Majelis hanya melihat laporan, tanpa tombol ini */}
</Can>
```

Contoh nyata: blok "Aktivitas terbaru" di Ringkasan hanya tampil (dan hanya dimuat) untuk Admin.

## Desain

Desain dibuat dengan skill `design-taste-frontend` dan `ui-ux-pro-max` di `.claude/skills/`. Arah desain tersimpan di `.taste-skill/` dan dipakai lagi untuk halaman berikutnya.

- **Portal Publik** mengikuti rancangan [design/stitch/10-portal-publik-kage.html](design/stitch/10-portal-publik-kage.html) dengan seluruh isi portal sebelumnya (rancangan 08). Rencana dan catatan pelaksanaannya ada di [docs/rencana-redesign-portal-kage.md](docs/rencana-redesign-portal-kage.md).
  - **Tampilan:** kanvas putih, panel hero membulat berlatar foto gereja dengan header pil yang melayang di atasnya, panel gelap bergaya jendela (papan jadwal, cek status, panel sukses), dan footer foto bertepi gerigi.
  - **Huruf:** judul dua nada Plus Jakarta Sans + Instrument Serif miring, teks Inter, dan JetBrains Mono untuk jam, kode registrasi, dan nomor rekening (Google Fonts).
  - **Token** `site-*` (mis. `bg-site-canvas`, `text-site-ink`, `bg-site-panel`) ada di [index.css](src/client/index.css), dengan nilai terang di `.theme-portal` dan gelap di `.theme-portal.dark`. Komponen bersama ada di [components/portal/kage/](src/client/components/portal/kage).
  - **Tema terang/gelap:** tombol di header. Bawaannya selalu terang, pilihan disimpan di perangkat ([lib/portal-theme.ts](src/client/lib/portal-theme.ts)). Dashboard selalu terang.
  - **Gerak** ([lib/portal-motion.ts](src/client/lib/portal-motion.ts)): gulir halus Lenis, parallax hero dan foto latar, elemen yang muncul saat digulir, dan elemen melayang. Semuanya transform/opacity dan mati bila pengguna meminta kurangi gerak.
  - **Skala desktop 90%** ([docs/rencana-skala-portal-90.md](docs/rencana-skala-portal-90.md)): di layar ≥1024 px dengan tetikus/trackpad, portal tampil 90% lewat `zoom: var(--site-zoom)` pada `html.theme-portal`. Ponsel, tablet, dan dashboard tetap 100%.
    - Tinggi relatif layar ditulis `calc(<tinggi>/var(--site-zoom,1))`, bukan `svh`/`vh` langsung, agar hero, login, dan jendela galeri tetap memenuhi layar.
    - Teks kecil tetap ≥13 px di layar: pakai `text-sm` (variabel `--text-sm` diberi lantai di `.theme-portal`) atau `text-(length:--site-text-xs)`, bukan `text-[13px]`.
  - **Inspector:** pengecualian yang disengaja (bayangan panel, huruf mono, judul dua nada, satu foto gereja) dicatat di bagian 8 rencana dan di `.taste-skill/direction.json`. Ukuran yang dilaporkan inspector (dan `getComputedStyle`) adalah ukuran sebelum zoom; di desktop, ukuran di layar 90%-nya.
  - Cincin sumur Lahai-roi tetap dipakai sebagai tanda merek.
- **Dashboard**, gaya *achromatic ledger* (seed 442642274): chrome tanpa warna, dasar batu karang `#f4f3f1`, tombol utama hampir hitam, dan crimson hanya untuk elemen data utama.
- Token warna ada di [src/client/index.css](src/client/index.css): `:root` untuk dashboard, `.theme-portal` untuk portal. Pakai token (`bg-background`, `text-muted-foreground`, `text-brand`, …), bukan kode warna langsung.

Periksa tampilan dengan inspector skill (butuh Chrome atau Edge):

```bash
node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:5173/
```

Untuk dashboard tambahkan `--app`. Karena dashboard butuh login sedangkan inspector membuka browsernya sendiri, jalankan inspector lewat proxy lokal yang menyisipkan cookie sesi akun uji (hanya untuk database lokal). Jika Chrome gagal diluncurkan di Windows, set `CHROME_PATH` ke `msedge.exe`.

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
transactions.post('/', requireRole('TREASURER', 'ADMIN'), handler)
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

## Akun pengurus & Log Aktivitas

**Mengelola akun** ([src/worker/routes/users.ts](src/worker/routes/users.ts)) hanya bisa dilakukan Admin; peran lain mendapat `403`.

| Aksi                                    | Permintaan                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Daftar akun                             | `GET /api/users`                                                            |
| Tambah pengurus                         | `POST /api/users` `{ name, email?, username?, role, rayon_id?, password? }` |
| Ubah nama, email/username, peran, rayon | `PATCH /api/users/:id`, cukup field yang diubah                             |
| Nonaktifkan / aktifkan kembali          | `PATCH /api/users/:id` `{ "is_active": false }`                             |
| Atur ulang kata sandi                   | `PATCH /api/users/:id` `{ "reset_password": true }` atau `{ "password": "…" }` |

Aturannya:

- **Identitas login.** Minimal salah satu dari email atau username wajib diisi. Username 3–32 karakter (huruf kecil, angka, `.`, `_`, `-`) dan tanpa `@`. Keduanya unik tanpa membedakan huruf besar/kecil; bila sudah dipakai, respons `409`.
- **Rayon.** Majelis wajib punya rayon. Untuk peran lain `rayon_id` selalu dikosongkan.
- **Kata sandi.** Minimal 8 karakter. Bila tidak diisi saat membuat akun, atau saat `reset_password`, server membuat **kata sandi sementara** seperti `k7mp-4rtw-9qex`. Nilainya dikembalikan sekali di `temporary_password` untuk diserahkan Admin ke pemilik akun.
- **Sesi.**
  - Kata sandi baru menghentikan semua sesi akun itu.
  - Penonaktifan juga menghentikannya, lewat trigger.
  - Perubahan peran atau rayon langsung berlaku tanpa login ulang.
- **Akun sendiri.** Admin tidak bisa menonaktifkan atau menurunkan peran akunnya sendiri (`409`), sehingga selalu tersisa minimal satu Admin aktif.
- **Tidak ada penghapusan.** Akun hanya bisa dinonaktifkan.
- **Satu sumber aturan.** Validasi field ada di [src/shared/accounts.ts](src/shared/accounts.ts) dan dipakai oleh API maupun form di dashboard, jadi pesan kesalahannya selalu sama.

**Di dashboard** (`/dashboard/users`):

- Kalimat di bawah judul menyebut akun aktif yang belum pernah masuk; biasanya kata sandi sementaranya belum diterima.
- Kata sandi sementara ditampilkan sekali, beserta pesan siap kirim (misalnya lewat WhatsApp) berisi alamat login, username, dan kata sandinya.
- Penonaktifan selalu dikonfirmasi lewat dialog yang menyebut nama akunnya, dan bisa diurungkan dari notifikasi.
- Menu baris "Lihat riwayat akun" membuka Log Aktivitas yang sudah difilter ke akun tersebut.

**Mencatat Log Aktivitas** dari modul lain memakai [src/worker/lib/audit.ts](src/worker/lib/audit.ts). Statement audit dijalankan dalam satu `db.batch()` bersama perubahan datanya:

```ts
import { LAST_INSERT_ID, auditStatement } from '../lib/audit'

// UPDATE: kirim data sebelum & sesudah; hanya kolom yang berubah yang dicatat.
await db.batch([
  db.prepare('UPDATE members SET full_name = ?2 WHERE id = ?1').bind(id, after.full_name),
  auditStatement(c, { action: 'UPDATE', entityType: 'members', entityId: id, label: after.full_name, before, after }),
])

// CREATE: statement audit tepat setelah INSERT; entity_id diambil dari last_insert_rowid().
await db.batch([
  db.prepare('INSERT INTO members (...) VALUES (...)').bind(...),
  auditStatement(c, { action: 'CREATE', entityType: 'members', entityId: LAST_INSERT_ID, label: data.full_name, after: data }),
])
```

- **Isi otomatis.** Pelaku (`c.get('user')`) dan alamat IP diisi sendiri oleh helper.
- **Atomik.** Satu `db.batch()` adalah satu transaksi D1, jadi data dan lognya tersimpan bersama atau tidak sama sekali.
- **Rahasia aman.** Nilai `password`, `password_hash`, dan token selalu dicatat sebagai `[disembunyikan]`.
- **Aksi tanpa perubahan data.** Untuk aksi seperti `LOGIN`, pakai `recordAudit(c, entry)`.

**Membaca log:** `GET /api/audit-logs` (khusus Admin).

- **Respons.** Berbentuk `{ data, meta: { page, per_page, total } }`, terurut dari yang terbaru.
- **Pelaku.** Setiap item memuat `user_name` dan `user_role` pelakunya. Nilainya `null` bila tidak ada pelaku, misalnya login gagal dengan akun tak dikenal.
- **Query opsional:**
  - `page`, dan `per_page` (maksimal 100, bawaan 50);
  - `user_id`, `action`, `entity_type`, `entity_id`;
  - `from` dan `to`: tanggal `YYYY-MM-DD` dalam waktu WITA, keduanya inklusif.

```json
{
  "id": 42,
  "action": "UPDATE",
  "entity_type": "users",
  "entity_id": 4,
  "user_id": 1,
  "user_name": "Administrator",
  "user_role": "ADMIN",
  "details": {
    "label": "Yohanis Dimu",
    "changes": { "is_active": { "from": true, "to": false } },
    "ip": "203.0.113.7"
  },
  "created_at": "2026-10-28T03:15:00Z"
}
```

## Database Jemaat: Rayon, KK, dan Anggota

Rute: [rayons.ts](src/worker/routes/rayons.ts), [families.ts](src/worker/routes/families.ts), dan [members.ts](src/worker/routes/members.ts). Bagian bersama keduanya ada di [src/worker/lib/congregation.ts](src/worker/lib/congregation.ts).

| Data            | Lihat                        | Tambah & ubah                    | Hapus                   |
| --------------- | ---------------------------- | -------------------------------- | ----------------------- |
| Rayon           | Publik (statistik: pengurus) | Admin                            | Admin, bila belum dipakai |
| Kartu Keluarga  | Admin, Pendeta, Majelis      | Admin, Majelis                   | Admin, bila tanpa anggota |
| Anggota Jemaat  | Admin, Pendeta, Majelis      | Admin, Majelis                   | Admin                   |

- **Cakupan Majelis.** Majelis hanya melihat dan mengelola KK serta jemaat di rayonnya sendiri.
  - Daftar otomatis dibatasi ke rayonnya.
  - Membuka data, memilih `rayon_id`, atau memindahkan KK/jemaat ke rayon lain dijawab `403`.
  - KK baru dari Majelis tanpa `rayon_id` dibuat di rayonnya.
- **PUT atau PATCH.** Keduanya diterima dengan arti yang sama (PRD menyebut PUT): field yang tidak dikirim tidak diubah.
- **Log Aktivitas.** Setiap tambah, ubah, dan hapus dicatat dalam transaksi yang sama.
  - `entity_type` bernilai `rayons`, `families`, atau `members`.
  - KK disebut dengan nomor dan kepalanya, misalnya `LHR-001 (Yakob Lado)`, dan rayon dengan namanya.
- **Penghapusan.** Jemaat yang pindah atau meninggal cukup diubah `status`-nya. `DELETE` hanya untuk data yang salah input.

### Aturan data

Aturan ini ada di [src/shared/congregation.ts](src/shared/congregation.ts), dipakai bersama API dan form dashboard.

- **Normalisasi.** Teks dirapikan (spasi ganda dibuang).
  - Nomor KK dan Nomor Induk diubah ke huruf besar.
  - NIK disimpan sebagai 16 angka tanpa spasi atau titik.
  - Telepon disimpan tanpa spasi atau tanda hubung.
  - Kode pilihan (`male`, `pemuda`) diterima dalam huruf kecil.
- **Unik.** Nomor KK, NIK, dan Nomor Induk tidak boleh dipakai dua kali (`409`).
  - Pesan menyebut nama pemiliknya, kecuali bila pemiliknya di luar cakupan rayon Majelis.
- **Tanggal.** Format `YYYY-MM-DD`, tidak boleh melewati hari ini (WITA), dan tidak boleh sebelum tanggal lahir.
- **Baptis dan sidi.**
  - Mengisi `baptism_date` atau `sidi_date` tanpa statusnya berarti sudah.
  - Sidi hanya untuk yang sudah dibaptis.
  - Tanggal sidi tidak boleh sebelum tanggal baptis.
  - Tanggal nikah hanya untuk yang pernah menikah.
- **Kepala Keluarga.** Satu KK hanya punya satu Kepala Keluarga **aktif** (dijaga juga oleh index unik di migrasi 0010).
  - Kepala yang meninggal atau pindah tetap tercatat, sehingga anggota lain bisa menggantikannya.
  - `family_head_name` di KK otomatis mengikuti nama Kepala Keluarga aktif; perubahan itu ikut tercatat di log.
  - Mengubah nama kepala lewat `PUT /api/families/:id` ditolak (`409`) bila KK sudah punya Kepala Keluarga aktif. Ubah lewat data anggotanya.
- **Pindah KK.** Mengganti `family_id` memindahkan jemaat. Rayonnya ikut KK baru, karena rayon jemaat selalu mengikuti rayon KK-nya.

### Mencari dan memfilter jemaat

`GET /api/members` mengembalikan `{ data, meta: { page, per_page, total } }`, urut nama. Setiap item memuat data anggota beserta `kk_number`, `family_head_name`, `rayon_id`, dan `rayon_name`. Semua parameter bisa dikombinasikan:

| Parameter                                     | Isi                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `q`                                           | Nama, NIK, Nomor Induk, atau nomor KK. Tiap kata harus cocok (urutan bebas) |
| `rayon_id`, `family_id`                       | Id rayon atau KK                                                        |
| `categorical_group`                           | `PAR`, `PEMUDA`, `KAUM_IBU`, `KAUM_BAPAK`, `LANSIA`                     |
| `blood_type`                                  | `A`, `B`, `AB`, `O`                                                     |
| `gender`, `family_relation`, `marriage_status`, `status` | Kode sesuai kolom tabel (`status`: `ACTIVE`, `MOVED`, `DECEASED`) |
| `baptism_status`, `sidi_status`               | `true`/`1` = sudah, `false`/`0` = belum                                 |
| `page`, `per_page`                            | Maksimal 100 per halaman, bawaan 50                                     |

- **Beberapa nilai.** Pisahkan dengan koma, misalnya `categorical_group=PAR,PEMUDA`.
- **Status keanggotaan.** Tanpa `status`, jemaat yang pindah atau meninggal ikut tampil. Kirim `status=ACTIVE` untuk jemaat aktif saja.
- **Filter salah.** Dijawab `400` dengan pesan per parameter.

Contoh (PRD): Rayon Getsemani, Pemuda, belum sidi, masih aktif:

```
GET /api/members?rayon_id=1&categorical_group=PEMUDA&sidi_status=false&status=ACTIVE
```

### Kartu Keluarga dan Rayon

- `GET /api/families?q=&rayon_id=` mencari nomor KK, nama kepala keluarga, atau nama salah satu anggotanya.
  - `member_count` menghitung anggota berstatus Aktif.
  - `empty=true` hanya menampilkan KK yang belum punya anggota tercatat.
- `GET /api/families/:id` mengembalikan KK beserta **seluruh** anggotanya di `members`, termasuk yang pindah atau meninggal.
  - Urutannya: Kepala Keluarga, Istri/Suami, Anak (tertua dulu), lalu Tanggungan.
- `GET /api/rayons` tetap publik untuk portal.
  - Bila dipanggil pengurus yang sedang masuk, tiap rayon juga memuat `family_count` dan `member_count` (jiwa aktif).
  - `DELETE /api/rayons/:id` ditolak (`409`) selama rayon masih dipakai KK, akun Majelis, jadwal ibadah, atau peminjaman aset.

### Di dashboard

Halaman ada di [src/client/pages/dashboard](src/client/pages/dashboard) dan komponennya di [src/client/components/congregation](src/client/components/congregation).

- **Alur KK baru.** Tambah KK (pilih 1 dari 5 rayon) lalu halaman rincian KK langsung terbuka. Di sana tombol "Tambah {nama} sebagai Kepala Keluarga" mengisi nama dan hubungan keluarga, lalu "Tambah anggota" untuk anggota lain.
- **Kartu Keluarga.** Kelima rayon tampil sebagai kartu angka di atas daftar (jumlah KK dan jiwa aktif); menekan satu kartu menyaring daftar ke rayon itu (di ponsel menjadi satu pilihan Rayon). Kalimat di bawah judul menyebut KK yang belum punya anggota tercatat. Rincian KK menampilkan data KK sebagai deret ringkas di atas tabel anggota.
- **Anggota Jemaat.** Status keanggotaan berupa kontrol bersegmen (Aktif, Pindah, Meninggal, Semua) di atas tabel. Pencarian dan filter Rayon, Kategori, Golongan darah, Baptis, dan Sidi ada di bilah alat tabel (di ponsel di balik tombol **Filter**). Semuanya bisa dikombinasikan dan tersimpan di URL. Bawaan menampilkan jemaat Aktif. Kalimat di bawah judul menyebut Pemuda aktif yang belum sidi (calon katekisasi).
- **Profil anggota.** Nama di daftar membuka panel profil lengkap (hanya baca). Form profil memuat seluruh atribut tabel `members`: identitas, KK dan hubungan keluarga, status keanggotaan, kategori pelayanan, pendidikan, pekerjaan, baptis, sidi, dan pernikahan.
  - Aturan validasinya sama dengan API ([src/shared/congregation.ts](src/shared/congregation.ts)); kesalahan dari server (mis. NIK sudah dipakai) muncul di field-nya.
  - Kategori pelayanan diberi saran dari umur, jenis kelamin, dan status nikah (PAR di bawah 17 tahun, Pemuda sampai 35 tahun selama belum menikah, Lansia mulai 60 tahun). Saran hanya mengisi bila pengurus menekan "Pakai".
- **Hak akses di layar.** Admin dan Majelis melihat tombol tambah dan ubah. Pendeta hanya membaca. Majelis tidak melihat pilihan rayon (KK baru otomatis di rayonnya). Riwayat dan hapus data khusus Admin.

### Impor & ekspor Excel/CSV

**Format berkas.** Kolomnya didefinisikan di [src/shared/member-import.ts](src/shared/member-import.ts). Template dan hasil ekspor memakai kolom yang sama, jadi berkas ekspor bisa diimpor ulang. Template diunduh dari halaman Impor dan dibuat langsung di browser.

- **Satu baris, satu jemaat.**
  - Baris dengan Nomor KK yang sama menjadi satu KK.
  - Tanpa Nomor KK, baris dikelompokkan menurut Nama Kepala Keluarga dan Rayon.
- **Kolom wajib.** Nama Lengkap, Jenis Kelamin, Hubungan Keluarga, dan Nomor KK atau Nama Kepala Keluarga. Rayon wajib untuk KK yang belum terdaftar.
- **Judul kolom.** Judul lain juga dikenali, misalnya "No. KK", "L/P", "Tgl Lahir", "No Induk", "Kategorial", "Status Pernikahan".
  - Kolom yang tidak dikenal diabaikan.
  - Baris judul laporan di atas tabel dilewati.

**Nilai yang dikenali** (validasi toleran untuk data Excel lama):

| Isian | Contoh yang diterima |
| --- | --- |
| Rayon | `GETSEMANI`, `Rayon Getsemani`, `Gethsemani`, `golgotha`: huruf besar/kecil, spasi, awalan "Rayon", dan huruf h diabaikan |
| Tanggal | `1975-03-12`, `12/03/1975`, `12-3-75`, `12 Maret 1975`, sel tanggal Excel, nomor seri Excel. Hari ditulis dulu. Tanggal yang hanya berisi tahun ditolak |
| Jenis kelamin | `L`, `P`, `Laki-laki`, `Perempuan`, `Pria`, `Wanita` |
| Hubungan | `Kepala Keluarga`/`KK`, `Istri`/`Suami`, `Anak`, `Tanggungan`/`Orang tua`/`Cucu` |
| Baptis/Sidi | `Sudah`/`Belum`, `Ya`/`Tidak`, `1`/`0`. Tanggal baptis/sidi yang diisi berarti sudah |
| Status nikah | `Belum menikah`/`Belum kawin`, `Menikah`/`Kawin`, `Cerai hidup`, `Cerai mati`/`Duda`/`Janda` |
| Telepon | Nomor yang tersimpan sebagai angka di Excel (`81234567890`) dikembalikan menjadi `081234567890` |

**Alur impor** (`/dashboard/members/import`, khusus Admin). Halaman ini berupa wizard tiga langkah (Pilih berkas → Periksa pratinjau → Selesai):

1. **Baca.** Browser membaca berkas `.xlsx` (lembar pertama) atau `.csv`.
   - Pemisah koma, titik koma (Excel berbahasa Indonesia), atau tab dikenali sendiri.
   - Batasnya 2.000 baris dan 5 MB per berkas.
2. **Pratinjau.** `POST /api/members/import` dengan `dry_run: true` memeriksa setiap baris tanpa menyimpan.
   - **Siap**: akan disimpan; KK baru dibuat otomatis, KK yang sudah terdaftar dipakai.
   - **Sudah ada**: dilewati, tidak dobel. Penyebabnya Nomor Induk atau NIK sudah terdaftar, nama yang sama sudah ada di KK yang sama, atau (tanpa Nomor Induk dan NIK) nama dan tanggal lahir sama. Baris yang sama di dalam berkas juga dihitung.
   - **Perlu diperbaiki**: dilewati, dengan pesan per kolom (rayon tidak dikenal, tanggal tidak ada, sidi tanpa baptis, Kepala Keluarga aktif kedua, dan lain-lain).
3. **Simpan.** Mengirim ulang dengan `dry_run: false`.
   - API memeriksa ulang, lalu menyimpan semua baris "Siap" ke `families` dan `members` dalam **satu transaksi**. Data dikirim sebagai JSON ke `json_each`, jadi 1.200 baris tetap hanya belasan query.
   - Log Aktivitas mencatat satu entri `IMPORT` berisi ringkasannya.
4. **Perbaiki sisanya.** "Unduh baris yang belum masuk" menghasilkan `.xlsx` berisi baris yang dilewati beserta kolom Keterangan.
   - Setelah diperbaiki, berkas itu bisa langsung diimpor lagi. Kolom Baris dan Keterangan diabaikan.

**Ekspor.** Tombol Ekspor di Anggota Jemaat mengunduh `.xlsx` atau CSV sesuai pencarian dan filter yang sedang aktif.

- Isinya urut per rayon dan KK, dengan anggota keluarga berdekatan.
- Di Excel, tanggal menjadi sel tanggal, NIK dan telepon tetap teks, baris judul terkunci, dan filter kolom aktif.
- Majelis hanya mengekspor rayonnya.
- Setiap ekspor tercatat sebagai `EXPORT` di Log Aktivitas, karena data pribadi jemaat keluar dari sistem.

## Keuangan multi-pos

Rute: [finance-funds.ts](src/worker/routes/finance-funds.ts), [finance-budgets.ts](src/worker/routes/finance-budgets.ts), dan [finance-transactions.ts](src/worker/routes/finance-transactions.ts). Aturan data bersama ada di [src/shared/finance.ts](src/shared/finance.ts). Semua nominal adalah bilangan bulat Rupiah tanpa desimal (maksimal Rp1 triliun per nominal).

- **Hak akses.** Keempat peran pengurus boleh membaca. Menambah, mengubah, dan menghapus Pos Kas, mata anggaran, dan transaksi hanya untuk Bendahara dan Admin; Pendeta dan Majelis mendapat `403`.
- **Saldo Pos Kas.** `current_balance` hanya diubah oleh trigger di migrasi 0004, pada statement `INSERT`, `UPDATE`, dan `DELETE` transaksi yang sama.
  - Statement itu dijalankan dalam satu `db.batch()` bersama catatan Log Aktivitas, sehingga transaksi, saldo, dan lognya berubah bersama atau tidak sama sekali.
  - API tidak pernah menerima atau menulis saldo; `current_balance` di body diabaikan.
  - Respons tambah, ubah, dan hapus transaksi menyertakan Pos Kas dengan saldo terbarunya.
  - Saldo awal dari pembukuan lama dicatat sebagai transaksi kas masuk "Saldo awal".
- **Pos Kas.** Kode unik tanpa membedakan huruf besar/kecil, disimpan dalam huruf besar.
  - Pos Kas nonaktif tetap tampil beserta saldonya, tetapi tidak bisa dipakai untuk transaksi atau mata anggaran baru.
  - Hanya Pos Kas yang belum punya mata anggaran atau transaksi yang bisa dihapus.
- **Mata anggaran RAPBJ.** Kode bebas (misalnya `4.1.01` atau `P-01/A`), unik per tahun anggaran.
  - `realized_amount` menjumlahkan transaksi pada mata anggaran itu.
  - Setelah dipakai transaksi, Pos Kas, jenis, dan tahun anggarannya terkunci (`409`); nama, kode, dan target tetap bisa diubah.
- **Transaksi.** Tanggal tidak boleh melewati hari ini (WITA).
  - Bila memilih mata anggaran, mata anggaran itu harus pada Pos Kas, jenis (penerimaan ↔ kas masuk, pengeluaran ↔ kas keluar), dan tahun anggaran yang sama dengan transaksinya.
  - Bukti kuitansi diunggah dulu ke `POST /api/uploads` (folder `kuitansi`), lalu URL-nya dikirim sebagai `receipt_url`.
  - Mengubah Pos Kas, jenis, atau nominal memindahkan selisih saldonya otomatis. Pindah Pos Kas tanpa memilih mata anggaran baru melepas mata anggaran lama.
- **Daftar transaksi.** `GET /api/finance/transactions` menerima `fund_id`, `budget_id`, `type`, `from`, `to` (inklusif), `receipt` (`with` berkuitansi, `without` tanpa kuitansi), `q` (keterangan), `page`, dan `per_page`.
  - Respons: `{ data, meta, totals: { income, expense } }`, dengan `totals` dihitung dari seluruh hasil filter, bukan hanya halaman itu.

```json
POST /api/finance/transactions
{ "fund_id": 1, "budget_id": 3, "transaction_date": "2026-10-25", "type": "INCOME",
  "amount": 1500000, "description": "Kolekte Minggu pagi",
  "receipt_url": "/api/files/kuitansi/2026/10/<uuid>.jpg" }
```

### Di dashboard

Halaman ada di [src/client/pages/dashboard](src/client/pages/dashboard) (`FinanceBudgetsPage`, `FinanceTransactionsPage`) dan komponennya di [src/client/components/finance](src/client/components/finance). Validasi form memakai fungsi yang sama dengan API (`parseFundInput`, `parseBudgetInput`, `parseTransactionInput`).

- **Hak akses di layar.** Bendahara dan Admin melihat tombol tambah, menu ubah/nonaktifkan/hapus, dan form. Pendeta dan Majelis melihat data, rincian, dan kuitansi yang sama tanpa tombol-tombol itu.
- **Pos Kas & RAPBJ** (`/dashboard/finance/budgets`). Tahun anggaran dan Pos Kas dipilih di atas tabel dan tersimpan di URL (`?year=2025&fund_id=2`); bawaannya tahun berjalan.
  - Mata anggaran dikelompokkan Penerimaan dan Pengeluaran, masing-masing dengan subtotal. Tiap baris menampilkan target, realisasi, dan bar capaian. Garis tegak pada bar menandai bagian tahun yang sudah berjalan, sebagai pembanding.
  - Pengeluaran yang melewati target ditandai "Lewat Rp…" dan kelebihannya digambar dengan warna negatif di ujung bar.
  - Kalimat di bawah judul merangkum capaian penerimaan, serapan pengeluaran, dan jumlah mata anggaran yang melewati batas.
  - Realisasi dihitung dari transaksi tercatat. Halaman memuat ulang saat tab kembali dibuka dan setiap 60 detik, jadi transaksi dari pengurus lain ikut terhitung.
  - Panel Pos Kas menampilkan saldo tiap Pos Kas dan totalnya. Mata anggaran atau Pos Kas yang sudah dipakai transaksi hanya bisa dinonaktifkan; menu Hapus menyebut alasannya.
- **Transaksi Kas** (`/dashboard/finance/transactions`). Filter Bulan (bawaan bulan berjalan, atau Semua bulan), Pos Kas, Jenis, Kuitansi, dan pencarian keterangan tersimpan di URL. Nama mata anggaran di halaman RAPBJ membuka transaksinya (`?budget_id=…&month=all`).
  - Kas masuk, kas keluar, dan selisih di atas tabel dihitung dari seluruh hasil filter.
  - Kalimat di bawah judul menyebut transaksi bulan itu yang belum berkuitansi, dengan tautan untuk menampilkannya.
  - "Catat transaksi" hanya menawarkan mata anggaran dengan Pos Kas, jenis, dan tahun yang cocok. Kuitansi (foto JPG/PNG/WebP atau PDF, maksimal 10 MB) langsung diunggah saat dipilih; tombol simpan menunggu unggahan selesai.
  - Uraian transaksi membuka panel rincian. Foto kuitansi tampil di panel; PDF tampil di bingkai dengan tautan untuk membukanya di tab baru.
  - Konfirmasi hapus menyebut saldo Pos Kas sebelum dan sesudahnya. Notifikasi setelah menyimpan menyebut saldo terbaru.

### Laporan keuangan & cetak Warta

`GET /api/finance/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD[&fund_id=]` ([finance-reports.ts](src/worker/routes/finance-reports.ts)) menyusun laporan per Pos Kas untuk rentang tanggal inklusif, paling panjang 366 hari. Keempat peran pengurus boleh membacanya.

- **Saldo awal** = Σ kas masuk − Σ kas keluar sebelum `from`. **Saldo akhir** = saldo awal + kas masuk − kas keluar pada periode.
  - Saldo dihitung dari transaksi, bukan dari `current_balance`, sehingga laporan periode lampau tetap benar.
  - Untuk periode yang mencakup hari ini, saldo akhirnya sama dengan `current_balance`.
- **Rincian** kas masuk dan kas keluar dikelompokkan per mata anggaran (urut kode; transaksi tanpa mata anggaran, mis. saldo awal, di akhir). Setiap kelompok memuat jumlah dan daftar transaksinya.
- Pos Kas nonaktif tanpa saldo dan tanpa transaksi pada periode itu tidak dilaporkan, kecuali diminta lewat `fund_id`.
- Respons: `{ from, to, funds: [{ opening_balance, income_total, expense_total, closing_balance, income, expense, … }], totals }`.

**Halaman** `/dashboard/finance/reports` ([FinanceReportsPage.tsx](src/client/pages/dashboard/FinanceReportsPage.tsx)):

- **Periode** Mingguan, Bulanan, atau Tahunan, dengan tombol periode sebelum/berikutnya. Semua pilihan tersimpan di URL (`?period=month&month=2026-09&fund_id=1&detail=entries`).
  - Minggu warta dihitung **Minggu–Sabtu**, sehingga kolekte hari Minggu membuka minggunya. Ubah `weekStart` di [src/client/lib/finance.ts](src/client/lib/finance.ts) bila gereja memakai minggu lain.
- **Rincian** per transaksi (bawaan laporan mingguan) atau per mata anggaran (bawaan bulanan dan tahunan).
- **Lembar laporan**: kop jemaat, ringkasan seluruh Pos Kas (bila lebih dari satu), lalu tiap Pos Kas dengan saldo awal, penerimaan, pengeluaran, dan saldo akhir. Di akhir ada kolom tanda tangan Ketua Majelis Jemaat dan Bendahara (nama Bendahara terisi bila yang mencetak Bendahara) serta waktu cetak.
  - Periode yang belum berakhir ditandai: saldo akhirnya "sementara", dihitung sampai hari ini.
- **Cetak laporan** memanggil dialog cetak browser; pilih "Simpan sebagai PDF" untuk berkas lampiran. Judul tab diganti sementara agar nama berkasnya jelas, mis. "Laporan Keuangan Mingguan 25 Okt – 31 Okt 2026".
  - `@media print` di [index.css](src/client/index.css) menyembunyikan sidebar dan notifikasi; topbar, judul halaman, dan kontrol memakai `print:hidden`. Kertas A4, margin 16 × 14 mm, teks 10 pt.

## Konten Portal Publik (CMS)

Rute: [contents.ts](src/worker/routes/contents.ts) (CMS, perlu login) dan [public.ts](src/worker/routes/public.ts) (`/api/public/*`, tanpa login). Aturan data bersama ada di [src/shared/contents.ts](src/shared/contents.ts); tabelnya `public_contents` (migrasi 0005).

- **Kategori**: `WARTA` (Warta Jemaat), `DEVOTIONAL` (Renungan), `NEWS` (Berita), `MEDIA`, `PROFILE` (Profil Jemaat), dan `PAYMENT_INFO` (Info Persembahan).
- **Hak akses CMS.** Admin mengelola semua konten. Pendeta hanya menulis Renungan, dan hanya melihat, mengubah, atau menghapus renungan miliknya sendiri. Bendahara dan Majelis mendapat `403`. Setiap tambah, ubah, dan hapus tercatat di Log Aktivitas; isi artikel dicatat sebagai panjang dan sidik jarinya saja, bukan teks utuh.
- **Status.** Konten baru berupa draf (`is_published: false`).
  - Konten tampil di portal bila `is_published` dan `published_at` sudah lewat. `published_at` di masa depan berarti terjadwal (`status: SCHEDULED`).
  - Menerbitkan tanpa `published_at` mengisinya dengan waktu sekarang. `published_at` menerima `YYYY-MM-DD` (pukul 00.00 WITA) atau ISO 8601 dengan zona waktu; respons selalu ISO UTC.
  - Draf boleh belum lengkap. Saat diterbitkan: Warta wajib melampirkan PDF dari folder `warta`; Renungan, Berita, dan Profil wajib berisi; Media wajib punya foto atau tautan video; Info Persembahan wajib punya nomor rekening atau gambar QRIS.
- **Alamat (`slug`)** dibuat dari judul bila tidak diisi; bila sudah dipakai, diberi nomor (`renungan-pagi-2`). Mengubah judul tidak mengubah alamat, agar tautan yang sudah dibagikan tetap berlaku. Kirim `slug: null` untuk membuat ulang alamat dari judul.
- **Isi** berupa teks biasa; paragraf dipisah baris kosong. Baris dipertahankan, CRLF menjadi LF, dan baris kosong berlebih dirapikan. Maksimal 50.000 karakter.
- **Berkas.** `attachment_url` berasal dari folder publik `warta`, `konten`, `media`, atau `liturgi` (unggah dulu lewat `POST /api/uploads`), atau tautan `https`. `thumbnail_url` adalah foto dari folder `konten` atau `media`. Menghapus konten tidak menghapus berkasnya di R2.
- **Info Persembahan**: judul = bank dan keperluan, `summary` = nomor rekening (yang disalin pengunjung), `content_body` = atas nama dan catatan, `thumbnail_url` = gambar QRIS.

**Di dashboard** (`/dashboard/contents` untuk Admin, `/dashboard/renungan` untuk Pendeta; [ContentsPage.tsx](src/client/pages/dashboard/ContentsPage.tsx) dan [ContentEditorPage.tsx](src/client/pages/dashboard/ContentEditorPage.tsx)):

- **Daftar** per kategori (tab Warta, Renungan, Berita, Galeri, Profil, Rekening & QRIS; di ponsel menjadi satu pilihan). Ada filter status dan pencarian di URL, serta status Draf/Terjadwal/Terbit beserta waktunya.
  - **Sakelar Terbit** di tiap baris menerbitkan atau menjadikan draf tanpa membuka editor. Bila konten belum lengkap, notifikasi menyebut alasannya (mis. warta tanpa PDF) dan sakelar tetap mati.
  - Kalimat di bawah judul menyebut warta terakhir, apakah renungan hari ini sudah terbit, dan jumlah draf.
- **Editor** menampilkan field sesuai kategori ([src/client/lib/contents.ts](src/client/lib/contents.ts)):
  - **Warta**: judul terisi "Warta Jemaat Minggu, {Minggu terdekat}", lalu unggah PDF (hanya PDF), ringkasan pengumuman, dan pengumuman singkat.
  - **Renungan**: judul, ayat bacaan (ringkasan), isi, dan gambar sampul.
  - **Berita** dan **Profil**: judul, ringkasan, isi, foto, dan lampiran opsional.
  - **Galeri**: foto dokumentasi (folder `media`), keterangan, cerita kegiatan, dan tautan video.
  - **Rekening & QRIS**: bank, untuk (Pos Kas atau keperluan, dengan saran nama Pos Kas aktif), nomor rekening, atas nama, dan gambar QRIS. Bank dan keperluan disimpan sebagai judul "Bank NTT · Kas Pembangunan" dan diurai kembali saat diubah.
- **Editor teks**: teks biasa dengan mode Tulis/Pratinjau. Pratinjau memisahkan paragraf seperti di portal; ada hitungan karakter.
- **Terbit di portal**: sakelar dan waktu terbit (tanggal + jam WITA). Tanggal yang akan datang menjadikan konten terjadwal; tombol simpan menyesuaikan ("Simpan draf", "Simpan & terbitkan", "Simpan & jadwalkan").
  - Kelengkapan saat terbit diperiksa di browser dengan aturan yang sama dengan API.
  - Draf yang disimpan tetap di editor; konten yang terbit kembali ke daftar.
  - Meninggalkan halaman dengan perubahan yang belum disimpan meminta konfirmasi.
- **Unggahan** memakai [upload-field.tsx](src/client/components/upload-field.tsx) (juga dipakai bukti kuitansi transaksi): berkas langsung diunggah ke R2 dengan progres dan tombol Batal, dibatasi jenisnya (PDF atau gambar), dan bisa diganti atau dilepas.

**Portal (tanpa login).** Respons memakai `Cache-Control: public, max-age=60`.

- `GET /api/public/home`:
  - `upcoming_worships`: 6 jadwal ibadah publik (`is_public`) terdekat mulai hari ini (WITA), urut tanggal dan jam, beserta rayon dan Pelayan Firman.
  - `latest_warta`: warta terbaru beserta PDF-nya.
  - `devotional`: renungan bertanggal hari ini (`is_today: true`), atau renungan terakhir bila belum ada.
  - `latest_news`: 3 berita terbaru.
  - `latest_media`: foto dokumentasi (Galeri) terbaru, untuk kartu gambar di hero beranda.
  - `payment_info`: seluruh rekening dan QRIS, beserta catatannya.
  - Renungan dikirim beserta isinya (`content_body`) karena dibaca utuh di beranda.
- `GET /api/public/contents?category=&q=&page=&per_page=`: daftar tanpa isi lengkap. Bila ringkasan kosong, `summary` berisi cuplikan awal isi. Profil dan Info Persembahan urut sesuai waktu dibuat; kategori lain terbaru dulu.
  - `with_body=true` menyertakan isi lengkap (maks. 50 per halaman), dipakai halaman Profil dan Persembahan. Bersama isi lengkap, `summary` tetap apa adanya (tanpa cuplikan otomatis).
- `GET /api/public/contents/:slug`: satu konten lengkap; `404` untuk draf dan konten terjadwal.
- `GET /api/public/worships?category=&rayon_id=&from=&to=&page=&per_page=`: jadwal ibadah publik untuk Papan Jadwal.
  - Bawaan mulai hari ini (WITA), urut tanggal lalu jam; jadwal tanpa jam di akhir harinya. `from`/`to` (YYYY-MM-DD) bisa menampilkan rentang lain, termasuk yang lampau.
  - `category` salah satu `SUNDAY_SERVICE`, `RAYON`, `CATEGORICAL`, `SPECIAL` (huruf kecil diterima); `rayon_id` id rayon. Keduanya bisa digabung.
  - Setiap jadwal membawa `rayon_id`, `rayon_name`, `preacher`, dan `servants` (peran dan nama petugas, urut seperti tata ibadah).
  - Saringan yang tidak sah → `400` dengan `details` per kolom.

**Halaman portal** ([src/client/pages/public](src/client/pages/public)), semuanya tanpa login dan responsif:

- **Beranda** (`/`): hero foto gereja dengan makna nama Lahai-roi, nama gereja, pita pengumuman terkini, tema Kebaktian Minggu terdekat, dan empat tautan cepat (unduh warta PDF terbaru, jadwal, persembahan, profil). Di bawahnya papan jadwal ibadah terdekat dengan saringan jenis (`#jadwal`), renungan hari ini (dibaca utuh, tombol Bagikan; `#renungan`), warta dan berita & pengumuman (`#warta`), band tiga layanan jemaat, lima rayon, dokumentasi Galeri terbaru, rekening & QRIS persembahan, dan tanya-jawab pendaftaran sakramen.
- **Jadwal Ibadah** (`/jadwal`): jadwal publik mendatang dikelompokkan per hari (Hari ini, Besok, lalu tanggal), dengan petugas, tema, bacaan, dan tautan tata ibadah bila ada.
  - Saringan jenis ibadah (Kebaktian Minggu, Ibadah Rayon, Ibadah Kategorial, Ibadah Khusus) dan lima rayon; di ponsel rayon menjadi satu pilihan. Saringan tersimpan di URL, mis. `/jadwal?jenis=rayon&rayon=2`, agar tautannya bisa dibagikan.
- **Warta Jemaat** (`/warta`): warta terbaru ditonjolkan dengan **Unduh PDF**, **Baca di tab baru**, dan pratinjau PDF di layar lebar (di ponsel cukup kedua tombol, karena peramban ponsel umumnya tidak menampilkan PDF dalam bingkai). Di bawahnya arsip warta dengan pencarian judul dan paging.
- **Renungan** (`/renungan`) dan **Berita & Pengumuman** (`/berita`): artikel terbaru ditonjolkan, sisanya kartu dengan paging. Halaman baca (`/renungan/:slug`, `/berita/:slug`) menampilkan ayat atau ringkasan, penulis, isi, lampiran, tombol Bagikan, dan artikel lainnya. Alamat dengan kategori yang keliru dialihkan ke rute yang benar.
- **Galeri Kegiatan** (`/media`): kartu foto; konten dengan tautan video bertanda "Video" dan memakai gambar pratinjau YouTube bila tak ada foto. Kartu dibuka dalam jendela galeri: video YouTube diputar di tempat (youtube-nocookie), tautan video lain dibuka di tab baru.
- **Profil & Sejarah** (`/profil`): konten Profil di CMS masuk ke bagiannya menurut judul atau alamat: memuat "Sejarah" → Sejarah, "Visi"/"Misi" → Visi & Misi, "Majelis"/"Pendeta" → Pendeta & Majelis; lainnya di bagian akhir. Lima rayon dari `GET /api/rayons` (nama, koordinator, wilayah).
  - Daftar Pendeta & Majelis ditulis satu baris per orang, `Jabatan: Nama` (mis. `Ketua Majelis Jemaat: Pdt. …`), dan tampil sebagai kartu; baris lain menjadi catatan. Foto konten itu menjadi foto bersama majelis.
- **Persembahan** (`/persembahan`): gambar QRIS (konten Rekening & QRIS bergambar) dengan tombol simpan gambar, dan kartu rekening per pos kas (bank, keperluan, nomor, atas nama). **Salin No. Rek** menyalin angka nomor rekening saja, menampilkan notifikasi, dan berubah menjadi "Tersalin" sebentar; tanpa Clipboard API (mis. bukan HTTPS) memakai cara salin lama.
- **Layanan Sakramen** (`/layanan-sakramen`, [SacramentPage.tsx](src/client/pages/public/SacramentPage.tsx)). Uraiannya di bagian [Layanan sakramen](#layanan-sakramen).
- **Masuk pengurus** (`/login`) mengikuti tema dan lapisan gerak portal: formulir di kiri, panel foto gereja dengan daftar peran di kanan. Alamat yang tidak ada menampilkan halaman 404 portal.

## Jadwal ibadah, petugas & kehadiran

Rute: [worships.ts](src/worker/routes/worships.ts). Aturan data bersama ada di [src/shared/worship.ts](src/shared/worship.ts); tabelnya `worship_schedules` dan `worship_servants` (migrasi 0006).

- **Hak akses.** Admin, Pendeta, dan Majelis boleh melihat; Bendahara mendapat `403`.
  - Menyimpan dan mengubah jadwal serta menyusun petugas: Admin dan Pendeta.
  - Mencatat kehadiran: Admin, Pendeta, dan Majelis.
- **Jadwal.** Kolom: `title`, `category` (`SUNDAY_SERVICE`, `RAYON`, `CATEGORICAL`, `SPECIAL`), `rayon_id` (wajib untuk Ibadah Rayon), `worship_date`, dan `worship_time` (`HH:MM` WITA; `7.00` diterima, kosong berarti jam menyusul).
  - Kolom lain: `location`, `theme`, `bible_reading`, `liturgy_file_url`, dan `is_public` (tampil di Papan Jadwal portal; bawaan `false`).
  - PDF tata ibadah diunggah dulu ke `POST /api/uploads` (folder `liturgi`), lalu URL-nya dikirim sebagai `liturgy_file_url`; tautan https juga diterima.
  - `PUT` mengubah sebagian kolom (PATCH juga diterima); field yang tidak dikirim tidak diubah.
- **Petugas.** `POST /api/worships/:id/servants` (PUT juga diterima) menyimpan susunan petugas lengkap satu ibadah, menggantikan susunan sebelumnya; `{ "servants": [] }` mengosongkannya.
  - Tiap petugas: `role` (`PREACHER`, `LITURGIST`, `ELDER_ON_DUTY`, `SINGER`, `MUSICIAN`, `MULTIMEDIA`), `servant_name`, dan `member_id` opsional.
  - Bila `member_id` diisi, `servant_name` boleh kosong; namanya diambil dari data jemaat.
  - Maksimal 30 petugas per ibadah. Satu orang boleh memegang dua tugas berbeda di ibadah yang sama, tetapi tidak dua kali untuk tugas yang sama.
  - Kesalahan dicatat per baris, mis. `details["servants.2.role"]`.
- **Deteksi bentrok.** Bentrok terjadi bila orang yang sama bertugas di dua ibadah berbeda pada tanggal dan jam yang sama.
  - Orang yang sama: `member_id` sama bila keduanya terhubung ke data jemaat; selain itu nama yang sama tanpa membedakan huruf besar/kecil, spasi, sapaan di depan (Pdt., Pnt., Dkn., Bpk., Ibu, …), dan gelar setelah koma (mis. `Pdt. Agustina Riwu Kaho, S.Th.` = `agustina riwu kaho`).
  - Jadwal tanpa jam tidak dibandingkan.
  - Bentrok tidak menolak penyimpanan (PRD: peringatan visual). Setiap respons jadwal berisi `worship.has_conflict`, rincian per petugas di `servants[].conflicts` (`worship_id`, `title`, `role`), dan `warnings` berupa kalimat siap tampil.
  - Bentrok dihitung saat dibaca, sehingga terlihat dari kedua jadwal dan ikut berubah bila tanggal, jam, atau petugas diubah.
- **Kehadiran.** `PATCH /api/worships/:id/attendance` menyimpan `attendance_men` (Pria), `attendance_women` (Wanita), dan `attendance_youth_children` (Anak/Pemuda).
  - Bilangan bulat 0–10.000. Angka yang tidak dikirim tidak diubah; `null` mengosongkan.
  - `attendance_total` dihitung database (kolom generated); `null` selama ketiganya kosong.
  - Hanya untuk ibadah hari ini atau sebelumnya (WITA); ibadah mendatang mendapat `409`. Jadwal yang sudah dicatat kehadirannya tidak bisa dipindah ke tanggal mendatang.
- **Daftar.** `GET /api/worships` menerima `from`, `to` (inklusif), `category`, `rayon_id`, `is_public` (`true`/`false`), `attendance` (`recorded`/`missing`), `q` (nama, tema, lokasi, bacaan), `servant` (nama petugas), `sort` (`asc` bawaan, `desc`), `page`, dan `per_page`.
  - Urut tanggal lalu jam; jadwal tanpa jam di akhir harinya. Setiap jadwal membawa petugas dan tanda bentroknya.
- Setiap perubahan jadwal, susunan petugas, dan kehadiran tercatat di Log Aktivitas.

**Di dashboard** (`/dashboard/worships`; [WorshipsPage.tsx](src/client/pages/dashboard/WorshipsPage.tsx), [WorshipEditorPage.tsx](src/client/pages/dashboard/WorshipEditorPage.tsx), dan [src/client/components/worship](src/client/components/worship)):

- **Daftar** dikelompokkan per tanggal, dengan dua tampilan; hari ini ada di keduanya. Filter jenis, rayon, kehadiran, dan pencarian tersimpan di URL.
  - **Mendatang**: menampilkan jam, ibadah, Pelayan Firman beserta jumlah petugas lain, dan tautan tata ibadah. Jadwal yang petugasnya bentrok diberi tanda amber "N bentrok".
  - **Sudah berlangsung**: total kehadiran per ibadah, atau tombol **Catat** bila belum dicatat.
  - Baris di bawah judul merangkum jumlah ibadah, jadwal yang bentrok, dan kehadiran yang belum dicatat.
  - Di ponsel, kolom Petugas pindah ke baris ketiga tiap ibadah.
- **Rincian** (klik nama ibadah) berisi petugas dengan keterangan bentroknya, tata ibadah, dan kehadiran. Dari sini Admin/Pendeta membuka editor, dan semua peran dapat mencatat kehadiran.
- **Editor jadwal** (Admin dan Pendeta):
  - jenis ibadah, rayon (khusus Ibadah Rayon), nama, tanggal, jam, lokasi, tema, dan bacaan;
  - nama yang dikosongkan diisi saran sesuai jenis dan jam, mis. "Kebaktian Minggu Pagi" atau "Ibadah Rayon Golgota";
  - sakelar **Tampil di portal** dan unggah PDF **Tata ibadah** (folder `liturgi`).
- **Petugas pelayanan** di editor:
  - satu kotak nama per tugas (Pelayan Firman, Liturgos, Majelis bertugas, Pemandu lagu, Pemusik, Multimedia); **Tambah …** menambah orang untuk tugas yang sama;
  - saran nama diambil dari jadwal sekitar tiga bulan terakhir, agar penulisan seragam.
- **Peringatan bentrok langsung:** begitu nama diketik, petugas yang juga bertugas di ibadah lain pada tanggal dan jam yang sama mendapat garis amber dan kalimat "Bentrok: juga bertugas sebagai … di “…”".
  - Ringkasan jumlah petugas yang bentrok tampil di atas daftar.
  - Aturannya sama dengan API (`sameServant`), sehingga peringatan di form cocok dengan hasil simpan.
  - Jadwal tetap bisa disimpan; setelah disimpan, notifikasi memuat kalimat peringatan dari API.
- Jadwal publik yang berlampiran PDF tata ibadah tampil di Papan Jadwal portal (`/jadwal`) dengan tautan **Tata ibadah** yang mengunduh berkasnya.
- **Absensi** (dialog; Admin, Pendeta, Majelis) untuk ibadah hari ini atau sebelumnya: kotak Pria, Wanita, dan Anak/Pemuda, dengan **Total kehadiran** yang terhitung langsung saat diketik. Kotak kosong berarti belum dihitung, bukan nol.
- Meninggalkan editor dengan perubahan yang belum disimpan meminta konfirmasi.

```json
POST /api/worships
{ "title": "Kebaktian Minggu Pagi", "category": "SUNDAY_SERVICE", "worship_date": "2026-11-01",
  "worship_time": "07:00", "location": "Gedung Kebaktian Lahairoi",
  "theme": "Kasih yang Memulihkan", "bible_reading": "Kolose 3:12–14",
  "liturgy_file_url": "/api/files/liturgi/2026/10/<uuid>.pdf", "is_public": true }

POST /api/worships/12/servants
{ "servants": [
  { "role": "PREACHER", "servant_name": "Pdt. Agustina Riwu Kaho, S.Th." },
  { "role": "LITURGIST", "servant_name": "Pnt. Maria Lede" },
  { "role": "MUSICIAN", "member_id": 87 } ] }

PATCH /api/worships/12/attendance
{ "attendance_men": 120, "attendance_women": 150, "attendance_youth_children": 80 }
```

## Layanan sakramen

Rute: [public-sacraments.ts](src/worker/routes/public-sacraments.ts) (`/api/public/sacraments`, tanpa login) dan [sacraments.ts](src/worker/routes/sacraments.ts) (`/api/sacraments`, Admin dan Pendeta). Aturan data bersama, termasuk isian dan dokumen per layanan, ada di [src/shared/sacraments.ts](src/shared/sacraments.ts). Tabelnya `sacrament_applications` (migrasi 0007 dan 0011).

**Pendaftaran dari portal.** `POST /api/public/sacraments/apply` menerima `multipart/form-data`:

- `type`: `BAPTISM` (Baptisan Kudus), `SIDI` (Peneguhan Sidi), atau `MARRIAGE` (Pemberkatan Nikah).
- Isian per layanan (`SACRAMENT_FORMS`):
  - Baptisan: nama calon baptis, jenis kelamin, tempat dan tanggal lahir, nama ayah dan ibu.
  - Sidi: nama, jenis kelamin, tempat dan tanggal lahir, gereja tempat dibaptis (wajib), tanggal baptis, nama orang tua.
  - Nikah: nama, tempat dan tanggal lahir, serta jemaat asal kedua mempelai; rencana tanggal pemberkatan (tidak boleh lewat).
- Isian kontak untuk semua layanan: `contact_name`, `phone` (8–15 angka; spasi dan tanda hubung dibuang), `address`, serta yang opsional: `rayon_id`, `church_member_number`, `applicant_notes`.
- Dokumen syarat sebagai berkas, dengan nama field sesuai jenis dokumennya:
  - Baptisan: `birth_certificate` (wajib), `parents_marriage`, `family_card`.
  - Sidi: `baptism_certificate` (wajib), `photo`, `family_card`.
  - Nikah: `groom_certificates` dan `bride_certificates` (wajib), `id_cards`, `photo`.
  - PDF/JPG/PNG/WebP sampai 10 MB, diperiksa dari isinya. Berkas yang tidak diminta layanan itu ditolak.
- Isian dan dokumen diperiksa sekaligus; kesalahan dikirim per field (`400`).
- Berkas disimpan di folder R2 `sakramen`, yang hanya bisa dibuka pengurus. Bila pendaftaran gagal disimpan, berkasnya dihapus lagi.
- Respons `201`: `{ registration_code, type, status: "PENDING", submitted_at }`.
  - Kodenya acak dan unik, mis. `BPT-K7QX-29MD`: awalan `BPT`/`SDI`/`NKH`, delapan karakter tanpa I, O, 0, 1, sehingga 32⁸ kemungkinan per layanan.
  - Nama yang disimpan: calon baptis/sidi, atau "mempelai pria & mempelai wanita".
- Kiriman dari situs lain ditolak middleware CSRF. Belum ada pembatas laju atau captcha.

**Halaman portal** `/layanan-sakramen` ([SacramentPage.tsx](src/client/pages/public/SacramentPage.tsx), [src/client/lib/sacraments.ts](src/client/lib/sacraments.ts)), tanpa login:

- **Cek Status Pendaftaran** di bagian atas.
  - Kode boleh diketik huruf kecil atau tanpa tanda hubung; formatnya diperiksa sebelum dikirim.
  - Hasilnya menampilkan lima langkah: diterima → verifikasi berkas → penggembalaan → disetujui & dijadwalkan → dilaksanakan. Langkah yang sedang berjalan ditandai, dan Revisi berkas diberi warna peringatan.
  - Jadwal penggembalaan dan pelaksanaan beserta pendetanya, catatan dari Majelis, dan berkas yang sudah diterima ikut tampil.
  - Kode yang pernah dikirim dari perangkat itu tersimpan di peramban (paling banyak lima) dan tampil sebagai tombol cepat. Kode tidak pernah dimasukkan ke URL.
- **Formulir** dalam tiga tab: Baptisan Kudus, Katekisasi/Sidi, dan Pemberkatan Nikah.
  - Tab tersimpan di URL (`?layanan=baptis|sidi|nikah`) dan bisa dipilih dengan panah kiri/kanan. Isian tiap tab tidak hilang saat berpindah tab.
  - Isian disusun per bagian berhuruf (A, B, …) dari `SACRAMENT_FORMS`, ditambah satu kotak unggah per dokumen syarat (klik atau seret).
  - Berkas diperiksa jenis dan ukurannya saat dipilih. Berkas yang ditolak tidak disimpan dan tidak menahan pengiriman bila dokumennya opsional.
  - Sebelum dikirim, isian diperiksa dengan aturan yang sama dengan API, dan semua kesalahan ditandai sekaligus dengan fokus ke isian pertama.
  - Pengiriman memakai multipart dengan progres (`postForm` di [src/client/lib/upload.ts](src/client/lib/upload.ts)).
- **Setelah terkirim**, formulir diganti layar sukses berisi:
  - kode registrasi berukuran besar;
  - **Salin kode** (berubah menjadi "Tersalin");
  - **Kirim ke WhatsApp/aplikasi lain** bila peramban mendukung Web Share;
  - **Cek status sekarang**, yang langsung melacak kode itu di bagian atas.
- Menu portal **Pelayanan** memuat Layanan Sakramen, Cek Status Pendaftaran (`/layanan-sakramen#cek-status`), dan Persembahan.

**Lacak status.** `GET /api/public/sacraments/track/:code`:

- Kode boleh ditulis huruf kecil, dengan atau tanpa tanda hubung.
- Mengembalikan status terkini, catatan verifikasi (`notes`), jadwal konseling dan pelaksanaan beserta pendetanya, dan daftar dokumen yang sudah diterima (tanpa tautan berkas).
- Nama disamarkan (`Kezia N.`, `Yohanis D. & Ester B.`). Nomor HP, alamat, dan isian lain tidak dikirim.
- Respons `Cache-Control: no-store`. Format kode salah → `400`; kode tidak terdaftar → `404`.

**Antrean dan buku induk** (`GET /api/sacraments`):

- Filter `type`, `status` (atau `active` = semua yang belum Selesai), `q` (nama, kode, nomor HP, nomor register), `sort` (`newest` bawaan, `oldest` untuk antrean, `scheduled` menurut tanggal pelaksanaan, `latest` pelaksanaan terbaru dulu untuk buku induk), `page`, `per_page`.
- `counts` berisi jumlah per status untuk jenis dan pencarian yang sama.
- Buku induk = pendaftaran berstatus `COMPLETED` beserta nomor registernya.
- `GET /api/sacraments/:id` menambahkan isian formulir, dokumen (tautan `/api/files/sakramen/…`), dan catatan.

**Verifikasi** (`PATCH /api/sacraments/:id/status`, JSON). `status` wajib. Field lain bersifat opsional; yang tidak dikirim tidak diubah, `null` mengosongkan:

- Field yang tersedia: `notes`, `counseling_date`/`counseling_time`, `scheduled_date`/`scheduled_time`, `officiating_pastor`, `certificate_number`, `member_id`, `partner_member_id` (khusus nikah: `member_id` = mempelai pria, `partner_member_id` = mempelai wanita).
- Syarat per status:

  | Status | Arti | Syarat |
  | ------ | ---- | ------ |
  | `PENDING` | Menunggu verifikasi | — |
  | `REVISION` | Revisi berkas | `notes` berisi apa yang perlu diperbaiki (tampil di halaman lacak) |
  | `COUNSELING` | Konseling/penggembalaan | `counseling_date` |
  | `APPROVED` | Disetujui | `scheduled_date` |
  | `COMPLETED` | Selesai | `scheduled_date` hari ini atau sebelumnya, `officiating_pastor` |

- **Saat Selesai** pendaftaran masuk buku induk.
  - Nomor register diisi manual (mis. `012/B/LHR/2026`) atau dibuat otomatis berurutan per layanan dan tahun pelaksanaan (`BPT-2026-001`, `SDI-2026-001`, `NKH-2026-001`). Nomor ganda per layanan → `409`.
  - Anggota jemaat yang ditautkan diperbarui di batch yang sama, dengan Log Aktivitas masing-masing: Baptisan → baptis Sudah dan tanggalnya; Sidi → sidi Sudah dan tanggalnya; Nikah → kedua mempelai berstatus Menikah dengan tanggal pemberkatan.
  - Respons `member_updates` merangkum perubahan itu, mis. "Baptis: Belum → Sudah (27 Oktober 2026)".
  - Ditolak bila anggota yang ditautkan sudah pindah/meninggal, atau sudah tercatat menerima sakramen yang sama di tanggal lain.
  - Pendaftaran tanpa anggota tertaut (mis. dari jemaat lain) tetap bisa diselesaikan.
- Pendaftaran yang sudah Selesai terkunci (`409`).
- Pengajuan dan setiap perubahan status tercatat di Log Aktivitas; pengajuan dari portal tercatat tanpa pengguna, dengan sumber `portal`.

**Di dashboard** (`/dashboard/sacraments`, Admin dan Pendeta; [SacramentsPage.tsx](src/client/pages/dashboard/SacramentsPage.tsx), [SacramentDetailPage.tsx](src/client/pages/dashboard/SacramentDetailPage.tsx), [SacramentCertificatePage.tsx](src/client/pages/dashboard/SacramentCertificatePage.tsx), [src/client/components/sacrament](src/client/components/sacrament)):

- **Antrean verifikasi**: semua pendaftaran yang belum Selesai, terlama dulu.
  - Chip status beserta jumlahnya (Semua aktif, Menunggu verifikasi, Revisi berkas, Konseling, Disetujui), filter layanan, dan pencarian, semuanya tersimpan di URL.
  - Kolom: pendaftar dan kodenya, tanggal masuk, jadwal konseling atau pelaksanaan, jumlah berkas, dan status.
- **Buku Induk**: tab per jenis (Baptisan, Sidi, Nikah), berisi pendaftaran Selesai dengan nomor register, tanggal pelaksanaan, pendeta, dan anggota jemaat tertaut. Pelaksanaan terbaru di atas; tiap baris punya tombol **Cetak**.
- **Rincian pendaftaran** (`/:id`):
  - Isian formulir per bagian, catatan pendaftar, dan berkas persyaratan. Tiap berkas punya tombol **Buka** di tab baru, foto tampil sebagai gambar kecil, dan dokumen wajib yang tidak ada ditandai.
  - Panel **Verifikasi** berisi pilihan status dengan penjelasannya dan catatan untuk pendaftar (tampil di Cek Status).
  - Isian lain muncul sesuai status: jadwal konseling, jadwal pelaksanaan dan pendeta, pemilih anggota jemaat (dua untuk nikah), serta nomor register saat Selesai. Pemilih anggota mencari anggota aktif dan menampilkan status baptis/sidi/nikahnya.
  - Isian diperiksa dengan aturan yang sama dengan API. Sebelum Selesai, konfirmasi menjelaskan akibatnya, dan notifikasi merangkum perubahan data jemaat.
  - Setelah Selesai, panel berganti ringkasan buku induk dengan tombol **Cetak sertifikat**.
- **Cetak sertifikat** (`/:id/cetak`, hanya untuk pendaftaran Selesai): Surat Baptisan Kudus, Surat Peneguhan Sidi, atau Surat Nikah Gerejawi, pada A4 tegak dengan semua posisi dalam milimeter ([certificate.tsx](src/client/components/sacrament/certificate.tsx)).
  - **Format Desain Lengkap (Kop & Bingkai)**: kop GMIT Jemaat Lahairoi dengan tanda sumur, bingkai ganda, judul, nomor register, kalimat keterangan, label dan isian, ayat, serta blok tanda tangan (Ketua Majelis Jemaat dan pendeta yang melayani).
  - **Format Blangko (Hanya Teks Isian)**: hanya isian yang tercetak (nomor register, data, tanggal pelaksanaan, tempat dan tanggal tanda tangan, nama pendeta), tanpa kop, bingkai, atau label.
    - Label dan bingkai tampil samar di layar sebagai panduan, tidak ikut tercetak.
    - **Margin atas/kiri** (mm, langkah 0,5, −30 sampai 30) menggeser semua isian untuk menyesuaikan printer dan blangko fisik. Nilainya disimpan per jenis sertifikat di peramban.
  - Format tersimpan di URL (`?format=blangko`).
  - Halaman cetak memakai `@page { size: A4; margin: 0 }`, sehingga yang tercetak hanya satu lembar sertifikat. Di dialog cetak pilih skala 100% dan matikan header/footer peramban.
  - Isi sertifikat diambil dari isian formulir pendaftaran. Koreksi salah ketik belum bisa dilakukan dari dashboard.

```bash
curl -X POST http://localhost:5173/api/public/sacraments/apply \
  -H "Origin: http://localhost:5173" \
  -F type=BAPTISM -F full_name="Kezia Ndun" -F gender=FEMALE -F birth_place=Kupang \
  -F birth_date=2026-06-30 -F father_name="Yosua Ndun" -F mother_name="Maria Lede" \
  -F contact_name="Yosua Ndun" -F phone=081234567890 -F address="Jl. Timor Raya, Lasiana" \
  -F birth_certificate=@akta-kelahiran.pdf
```

## Buku Agenda Surat

Rute: [mails.ts](src/worker/routes/mails.ts), khusus Admin (sama dengan folder unggahan `surat`). Aturan data bersama ada di [src/shared/mails.ts](src/shared/mails.ts); tabelnya `mail_archives` (migrasi 0007).

- **Mencatat** (`POST /api/mails`):
  - Isian wajib: `direction` (`INCOMING` surat masuk / `OUTGOING` surat keluar), `mail_date` (hari ini atau sebelumnya, WITA), `sender_or_recipient` (pengirim untuk surat masuk, penerima/tujuan untuk surat keluar), dan `subject` (perihal).
  - Isian opsional: `reference_number` (nomor surat; kosong untuk surat tanpa nomor) dan `category` (`ATESTASI`, `TUGAS`, `UNDANGAN`, `UMUM`; bawaannya `UMUM`).
  - Salinan surat diunggah dulu ke `POST /api/uploads` (folder `surat`, PDF atau foto), lalu URL-nya dikirim sebagai `file_url`. Berkas dari folder lain atau tautan luar ditolak.
- **Daftar** (`GET /api/mails`):
  - Filter `direction`, `category`, `q` (nomor, pengirim/penerima, perihal; setiap kata harus cocok), `from`/`to` (tanggal surat, inklusif), `page`, `per_page`.
  - Urut tanggal surat terbaru dulu. `counts` berisi jumlah surat masuk dan keluar untuk filter lain yang sama.
- **Hapus** (`DELETE /api/mails/:id`): untuk catatan yang salah input; berkas salinannya tetap di R2.
- Pencatatan dan penghapusan tercatat di Log Aktivitas.

**Di dashboard** (`/dashboard/mails`, [MailsPage.tsx](src/client/pages/dashboard/MailsPage.tsx)):

- Tab arah (Semua, Surat masuk, Surat keluar) beserta jumlahnya, serta filter tahun surat (bawaan tahun berjalan; bisa semua tahun), kategori, dan pencarian. Semua filter tersimpan di URL.
- Kolom tabel: tanggal, perihal dengan "Dari …/Kepada …", arah dan kategori, serta nomor surat. Kolom **Salinan** punya tombol **Buka** (tab baru) dan **Unduh**, dengan nama berkas dari tanggal dan nomor surat, mis. `2026-10-28-016-mj-lhr-x-2026.pdf`.
- **Catat surat** (dialog): arah, tanggal, kategori, nomor, pengirim/penerima (labelnya mengikuti arah), perihal, dan unggah salinan. Arah awal mengikuti tab yang sedang dibuka.
- Hapus catatan lewat menu tiap baris, dengan konfirmasi.

## Inventaris & peminjaman barang

Rute: [assets.ts](src/worker/routes/assets.ts) dan [asset-loans.ts](src/worker/routes/asset-loans.ts), untuk Admin dan Majelis. Aturan data bersama ada di [src/shared/assets.ts](src/shared/assets.ts); tabelnya `assets` dan `asset_loans` (migrasi 0008).

- **Katalog aset** (`/api/assets`):
  - Admin dan Majelis dapat melihat, menambah, dan mengubah aset; menghapus khusus Admin.
  - Isian: `name` dan `quantity` (jumlah unit) wajib; `asset_code`, `category`, `location`, `acquisition_source`, `acquisition_year`, `estimated_value`, `condition` (`GOOD` bawaan, `MINOR_DAMAGE`, `MAJOR_DAMAGE`, `MAINTENANCE`), dan `notes` opsional.
  - Kode inventaris kosong dibuat otomatis (`INV-0001`, `INV-0002`, …). Kode yang diisi manual dijadikan huruf besar, dan spasi diganti tanda hubung. Kode kembar (tanpa membedakan huruf besar/kecil) ditolak `409`.
  - `available_quantity` tidak dikirim klien. Saat aset dibuat, nilainya sama dengan `quantity`; setelah itu berubah lewat peminjaman dan pengembalian.
  - Mengubah `quantity` menggeser `available_quantity` dengan selisih yang sama. Jumlah di bawah unit yang sedang dipinjam ditolak.
  - `GET` mendukung filter `category`, `location`, `condition`, `available` (`true`/`false`), `q` (kode, nama, catatan), `page`, dan `per_page`. Respons menyertakan daftar kategori dan lokasi yang sudah dipakai, serta jumlah unit (`units`) dan unit tersedia (`available`) seluruh aset yang cocok.
  - `GET /:id` mengembalikan aset beserta 20 peminjaman terakhirnya.
  - Aset yang punya riwayat peminjaman tidak dapat dihapus, agar log peminjamannya tetap utuh.
- **Meminjam** (`POST /api/asset-loans`):
  - Isian: `asset_id`, `borrower_name`, `quantity_borrowed`, `borrow_date` (hari ini atau sebelumnya), dan `due_date` (tidak boleh sebelum tanggal pinjam); `rayon_id` dan `notes` opsional.
  - `available_quantity` aset langsung berkurang sebanyak `quantity_borrowed`.
  - Bila stok tersedia tidak cukup, permintaan ditolak `409` dan `details.quantity_borrowed` menyebut sisa stoknya. Barang yang rusak berat atau dalam perbaikan juga tidak dipinjamkan.
  - Batas `0 ≤ available_quantity ≤ quantity` dijaga oleh `CHECK` di database. Jadi dua peminjaman yang disimpan bersamaan tidak dapat membuat stok minus.
- **Mengembalikan** (`PATCH /api/asset-loans/:id/return`):
  - Status menjadi `RETURNED`, dan `available_quantity` bertambah lagi sebanyak yang dipinjam.
  - Isian opsional: `return_date` (bawaannya hari ini), `return_condition`, dan `notes`.
  - Pengembalian kedua untuk peminjaman yang sama ditolak `409`, sehingga stok hanya bertambah sekali.
- **Terlambat**:
  - Peminjaman yang belum kembali dan `due_date`-nya sudah lewat (tanggal hari ini, WITA) berstatus `OVERDUE`, dengan `days_overdue` (jumlah hari keterlambatan).
  - Status ini dihitung setiap kali dibaca. Status di database juga ditandai `BORROWED` → `OVERDUE` sebelum setiap pembacaan daftar atau rincian.
- **Daftar peminjaman** (`GET /api/asset-loans`):
  - Filter `status` (`BORROWED`, `OVERDUE`, `RETURNED`, atau `active` = belum kembali), `asset_id`, `rayon_id`, `q` (peminjam, kode/nama barang), `from`/`to` (tanggal pinjam), `page`, dan `per_page`.
  - `counts` berisi jumlah per status untuk filter lain yang sama.
  - Peminjaman aktif diurutkan menurut batas kembali terdekat; selain itu, tanggal pinjam terbaru lebih dulu.
- Perubahan aset, peminjaman, dan pengembalian tercatat di Log Aktivitas.

Contoh:

```bash
curl -b cookies.txt -H "Content-Type: application/json" -X POST http://localhost:5173/api/asset-loans \
  -d '{"asset_id":1,"borrower_name":"Pnt. Yohanis Dimu","rayon_id":2,"quantity_borrowed":20,"borrow_date":"2026-10-28","due_date":"2026-10-31"}'
curl -b cookies.txt -H "Content-Type: application/json" -X PATCH http://localhost:5173/api/asset-loans/1/return \
  -d '{"return_condition":"GOOD"}'
```

**Di dashboard** (`/dashboard/assets`, [AssetsPage.tsx](src/client/pages/dashboard/AssetsPage.tsx)):

- Judul memuat ringkasan seluruh inventaris: jumlah barang, jumlah unit, dan unit yang sedang dipinjam. Tab dan filter tersimpan di URL (`?view=loans` untuk tab Peminjaman).
- **Katalog Inventaris**:
  - Filter kategori, lokasi, dan kondisi fisik (Baik, Rusak ringan, Rusak berat, Dalam perbaikan), serta pencarian kode/nama/catatan.
  - Kolom **Tersedia** menampilkan sisa unit dari jumlah unit, mis. `20 / 60`, beserta jumlah yang sedang dipinjam.
  - Kondisi baik tidak diberi tanda; kondisi lain ditandai label berwarna.
  - **Tambah aset** dan **Ubah data aset** (klik nama barang) untuk Admin dan Majelis. Kode inventaris kosong dibuat otomatis.
  - Menu tiap baris berisi: **Pinjamkan** (tidak aktif bila barang rusak berat, dalam perbaikan, atau semua unit dipinjam), **Riwayat peminjaman** (membuka tab Peminjaman untuk barang itu), dan **Hapus aset** (khusus Admin).
- **Peminjaman Barang**:
  - Saringan status: Belum kembali (bawaan), Terlambat, Sudah dikembalikan, Semua; masing-masing dengan jumlahnya. Ada juga filter rayon dan pencarian.
  - Peminjaman yang melewati batas kembali ditandai **Terlambat N hari** dengan label merah. Jumlah yang terlambat juga tampil di tab.
  - Tombol **Kembalikan** membuka konfirmasi pengembalian berisi tanggal kembali, kondisi saat kembali, dan catatan. Catatan pengembalian ditambahkan di bawah keperluan peminjaman.
  - Bila barang kembali rusak, notifikasinya menawarkan **Perbarui kondisi**. Tombol ini membuka form aset dengan kondisi yang dilaporkan.
- **Catat peminjaman** (dialog):
  - Barang dipilih per kategori, dengan sisa unit terkini. Jumlah dibatasi sisa unit. Rayon peminjam (untuk Majelis bawaannya rayonnya sendiri), nama peminjam, tanggal pinjam, batas kembali, dan keperluan.
  - Bila stok habis didahului peminjaman lain, dialog menampilkan sisa terbaru.

## Dashboard Eksekutif & Analitik

Rute: [analytics.ts](src/worker/routes/analytics.ts). Aturan periode dan tanggal ulang tahun ada di [src/shared/analytics.ts](src/shared/analytics.ts); bentuk responsnya `AnalyticsDashboard` di [types.ts](src/shared/types.ts).

`GET /api/analytics/dashboard` mengagregasi data riil dari `members`, `families`, `rayons`, `finance_funds`, `finance_budgets`, `finance_transactions`, dan `worship_schedules` dalam satu batch D1.

- **Akses**: keempat peran pengurus dapat membaca angka agregat. `birthdays` (nama dan tanggal lahir) hanya untuk Admin, Pendeta, dan Majelis, sama dengan hak baca data jemaat; Bendahara menerima `null`.
- **Filter** (opsional) untuk keuangan dan kehadiran:
  - `year`: tahun anggaran, 2000 s.d. tahun berjalan; bawaannya tahun berjalan.
  - `month_from`, `month_to`: bulan 1–12, inklusif. Bawaannya Januari s.d. bulan berjalan untuk tahun ini, atau seluruh tahun untuk tahun lampau.
- Bagian yang selalu keadaan hari ini (WITA), tidak terpengaruh filter:
  - **`summary`**:
    - jiwa: anggota berstatus `ACTIVE`;
    - KK: yang masih punya anggota aktif;
    - saldo kas: jumlah `current_balance` seluruh Pos Kas;
    - `last_sunday` dan `previous_sunday`: kehadiran Kebaktian Minggu pada dua hari Minggu terakhir yang sudah diinput, dijumlahkan bila ada lebih dari satu kebaktian (pagi dan sore).
  - **`demographics`**:
    - per rayon: KK, jiwa, laki-laki, perempuan; kelima rayon selalu tampil;
    - jenis kelamin;
    - kelompok kategorial, beserta `unassigned` untuk yang belum diisi;
    - cakupan sakramen: baptis, sidi, menikah, dan persentase dari anggota aktif.
  - **`birthdays`**: ulang tahun anggota aktif pada minggu berjalan (Minggu s.d. Sabtu) dan bulan berjalan.
    - Setiap entri memuat tanggal lahir, tanggal ulang tahunnya, usia yang dicapai, dan nama rayon. Urutannya menurut tanggal.
    - Yang lahir 29 Februari berulang tahun pada 28 Februari di tahun bukan kabisat.
    - Bayi yang lahir pada periode itu (usia 0) tidak dihitung.
    - Minggu yang melintasi pergantian tahun dihitung dengan benar.
- Bagian yang mengikuti filter:
  - **`finance`**:
    - kas masuk dan keluar per bulan, termasuk bulan tanpa transaksi;
    - total periode;
    - saldo tiap Pos Kas pada akhir periode, dihitung dari transaksi sehingga tahun lampau tetap benar. Pos nonaktif hanya tampil bila masih bersaldo atau ada transaksinya;
    - `budget`: realisasi RAPBJ per jenis, berupa target seluruh mata anggaran tahun itu dibanding transaksi pada mata anggaran tersebut dalam rentang bulan, dengan persen satu desimal.
  - **`attendance`**:
    - setiap minggu dalam periode s.d. minggu ini (Minggu s.d. Sabtu, termasuk minggu tanpa data): jumlah ibadah, total, dan rata-rata kehadiran per ibadah, keseluruhan dan per jenis ibadah;
    - total periode per jenis ibadah.
  - Hanya ibadah yang kehadirannya sudah diinput yang dihitung.

Contoh:

```bash
curl -b cookies.txt "http://localhost:5173/api/analytics/dashboard?year=2026&month_from=1&month_to=6"
```

**Di dashboard** (`/dashboard`, [OverviewPage.tsx](src/client/pages/dashboard/OverviewPage.tsx), komponen di [src/client/components/analytics](src/client/components/analytics)):

- **Judul halaman**:
  - salam sesuai jam WITA dan tanggal hari ini;
  - status sistem (API dan D1), waktu data diperbarui, dan tombol muat ulang;
  - filter periode di kanan (tahun anggaran, bulan awal s.d. akhir), yang berlaku untuk keuangan dan kehadiran. Bulan setelah bulan berjalan tidak bisa dipilih untuk tahun ini.
- **4 kartu KPI** (keadaan hari ini), dengan ikon dan tautan ke modulnya bila peran itu bisa membukanya:
  - Total jiwa;
  - Kartu Keluarga;
  - Saldo kas, dengan perubahan dari akhir bulan lalu dan grafik mini saldo akhir tiap bulan;
  - Kehadiran Minggu, dengan perubahan dari Minggu sebelumnya dan grafik mini kehadiran tiap Minggu.

  Grafik mini dan perubahan saldo diambil dari data periode, jadi hanya tampil bila periodenya memuat hari ini (bawaan).
- **Urutan blok menyesuaikan peran**:
  - Bendahara: keuangan, kehadiran, lalu jemaat;
  - Pendeta dan Majelis: jemaat, kehadiran, lalu keuangan;
  - Admin: jemaat, keuangan, lalu kehadiran dengan aktivitas terbaru di sampingnya.

  Kartu KPI pertama tiap peran menjadi angka utama (crimson).
- **Jemaat** (keadaan hari ini):
  - donat komposisi laki-laki dan perempuan, dengan jumlah dan persentase di legenda;
  - batang jiwa per rayon, dengan jumlah KK;
  - kelompok kategorial, dengan persentasenya;
  - meter cakupan baptis dan sidi.
- **Ulang Tahun Jemaat Minggu Ini**:
  - nama, rayon, tanggal lahir, hari ulang tahun, dan usia yang dicapai, dengan penanda "Hari ini";
  - tab **Bulan ini**;
  - tombol **Salin untuk warta**, yang menyalin daftar siap tempel.

  Widget ini tidak tampil untuk Bendahara.
- **Keuangan dan kehadiran** (mengikuti filter periode):
  - **Kas masuk dan keluar per bulan**: kolom berpasangan. Kas masuk memakai warna utama (crimson), kas keluar abu-abu pembanding. Legendanya ikut membawa total periode dan selisih. Di bawahnya ada realisasi RAPBJ, dengan garis tegak untuk bagian tahun yang sudah berjalan.
  - **Saldo per Pos Kas**: saldo pada akhir periode, porsinya, serta kas masuk dan keluar per Pos Kas di periode itu.
  - **Tren kehadiran ibadah**:
    - garis rata-rata kehadiran per ibadah per minggu (Minggu s.d. Sabtu) untuk satu jenis ibadah (bawaannya Kebaktian Minggu);
    - kurva halus dengan isian bergradasi; minggu tanpa data memutus garis, tidak dihitung nol.
- **Aktivitas terbaru** (Admin): linimasa lima aktivitas terakhir dengan ikon modulnya.
- **Grafik**:
  - Arahkan kursor, atau fokuskan grafik lalu tekan panah kiri/kanan, Home, atau End, untuk melihat tooltip tiap bulan atau minggu.
  - Tombol **Tabel** menampilkan angka yang sama sebagai tabel.
  - Saat filter diganti, grafik lama tetap tampil, sedikit pudar, sampai data baru tiba.

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

- Mengunggah wajib login, dan tiap folder punya peran yang boleh mengisinya: `kuitansi` untuk Bendahara dan Admin; `warta`, `media`, `surat` untuk Admin; `konten`, `liturgi`, `sakramen` untuk Admin dan Pendeta (`UPLOAD_FOLDER_ROLES`).
- Berkas di folder portal (`warta`, `konten`, `media`, `liturgi`) bisa diunduh siapa saja. Berkas `kuitansi`, `sakramen`, dan `surat` hanya untuk pengurus yang sudah masuk.
- Pengecualian: dokumen syarat sakramen dari portal dikirim bersama formulirnya ke `POST /api/public/sacraments/apply`, tanpa login, dan disimpan ke folder `sakramen` dengan pemeriksaan yang sama ([src/worker/lib/uploads.ts](src/worker/lib/uploads.ts)). Tidak ada endpoint unggah anonim terpisah.

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
| 0010    | Index unik: satu Kepala Keluarga aktif per KK                     | Database Jemaat & KK          |
| 0011    | `sacrament_applications`: jadwal konseling, jam pelaksanaan, mempelai kedua | Sakramen & Persuratan |

Konvensi yang dipakai di semua tabel:

- **Nominal uang** adalah bilangan bulat Rupiah (`INTEGER`, tanpa desimal); nilai desimal ditolak oleh CHECK.
- **Tanggal** berformat `YYYY-MM-DD`, **jam** `HH:MM`, **timestamp** `YYYY-MM-DD HH:MM:SS` (UTC, dari `datetime('now')`). Format lain (misalnya `12/04/2010` dari Excel) ditolak database, jadi impor harus menormalkan tanggal lebih dulu. CHECK tanggal ditulis `date(x) IS x` (bukan `=`) karena di SQLite CHECK yang bernilai NULL dianggap lolos.
- **Timestamp di respons API** dikirim sebagai ISO 8601 UTC (`2026-10-28T03:15:00Z`), agar `new Date()` di browser tidak salah menafsirkannya sebagai jam lokal. Tampilkan di frontend dalam zona `Asia/Makassar` (WITA).
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

Komponen akan ditulis ke `src/client/components/ui/`. Preset yang dipakai: `radix-nova` (Radix UI, ikon Lucide); font `font-sans` adalah Geist (`@fontsource-variable/geist`, dimuat oleh `lib/dashboard-theme.ts`). Beberapa komponen sudah disesuaikan untuk proyek ini dan perlu dicek ulang bila ditimpa CLI: breakpoint sidebar di `lg` (1024px), overlay sheet tanpa blur, dan teks aksesibilitas berbahasa Indonesia.

## Endpoint yang tersedia saat ini

| Method | Path               | Akses       | Keterangan                                           |
| ------ | ------------------ | ----------- | ---------------------------------------------------- |
| GET    | `/api/health`      | Publik      | Status API dan koneksi D1 (`503` jika D1 gagal)      |
| GET    | `/api/rayons`      | Publik      | Daftar rayon; pengurus juga mendapat jumlah KK & jiwa |
| POST   | `/api/rayons`      | Admin       | Tambah rayon                                         |
| PUT    | `/api/rayons/:id`  | Admin       | Ubah rayon (PATCH juga diterima)                     |
| DELETE | `/api/rayons/:id`  | Admin       | Hapus rayon yang belum dipakai data apa pun          |
| POST   | `/api/auth/login`  | Publik      | Masuk; mengirim cookie sesi dan profil pengguna      |
| POST   | `/api/auth/logout` | Publik      | Keluar; menghapus sesi dan cookie                    |
| GET    | `/api/auth/me`     | Login       | Profil pengguna yang sedang masuk                    |
| GET    | `/api/users`       | Admin       | Daftar akun pengurus (+ waktu login terakhir)        |
| POST   | `/api/users`       | Admin       | Tambah akun pengurus                                 |
| PATCH  | `/api/users/:id`   | Admin       | Ubah data, peran/rayon, status aktif, atau kata sandi |
| GET    | `/api/audit-logs`  | Admin       | Log Aktivitas, terbaru lebih dulu, dengan filter     |
| GET    | `/api/families`    | Admin, Pendeta, Majelis* | Daftar KK, cari & filter rayon          |
| GET    | `/api/families/:id`| Admin, Pendeta, Majelis* | KK beserta seluruh anggotanya           |
| POST   | `/api/families`    | Admin, Majelis* | Tambah KK                                        |
| PUT    | `/api/families/:id`| Admin, Majelis* | Ubah KK (PATCH juga diterima)                    |
| DELETE | `/api/families/:id`| Admin       | Hapus KK tanpa anggota                               |
| GET    | `/api/members`     | Admin, Pendeta, Majelis* | Daftar jemaat dengan filter kombinasi   |
| GET    | `/api/members/:id` | Admin, Pendeta, Majelis* | Detail jemaat beserta KK & rayon        |
| POST   | `/api/members`     | Admin, Majelis* | Tambah anggota ke KK                             |
| PUT    | `/api/members/:id` | Admin, Majelis* | Ubah atau pindahkan anggota (PATCH juga diterima) |
| DELETE | `/api/members/:id` | Admin       | Hapus anggota yang salah input                       |
| POST   | `/api/members/import` | Admin    | Pratinjau (`dry_run: true`) atau simpan impor Excel/CSV |
| GET    | `/api/members/export` | Admin, Pendeta, Majelis* | Unduh `.xlsx` (bawaan) atau `?format=csv` sesuai filter |
| GET    | `/api/finance/funds` | Semua pengurus | Pos Kas beserta saldo (`?is_active=`)            |
| POST   | `/api/finance/funds` | Bendahara, Admin | Tambah Pos Kas                                 |
| PUT    | `/api/finance/funds/:id` | Bendahara, Admin | Ubah atau nonaktifkan Pos Kas (PATCH juga diterima) |
| DELETE | `/api/finance/funds/:id` | Bendahara, Admin | Hapus Pos Kas yang belum dipakai           |
| GET    | `/api/finance/budgets` | Semua pengurus | Mata anggaran RAPBJ beserta realisasinya       |
| POST   | `/api/finance/budgets` | Bendahara, Admin | Tambah mata anggaran                         |
| PUT    | `/api/finance/budgets/:id` | Bendahara, Admin | Ubah mata anggaran (PATCH juga diterima) |
| DELETE | `/api/finance/budgets/:id` | Bendahara, Admin | Hapus mata anggaran tanpa transaksi      |
| GET    | `/api/finance/transactions` | Semua pengurus | Transaksi dengan filter, paging, dan total |
| POST   | `/api/finance/transactions` | Bendahara, Admin | Catat kas masuk/keluar; saldo Pos Kas ikut berubah |
| PUT    | `/api/finance/transactions/:id` | Bendahara, Admin | Ubah transaksi (PATCH juga diterima) |
| DELETE | `/api/finance/transactions/:id` | Bendahara, Admin | Hapus transaksi; saldo dikembalikan |
| GET    | `/api/finance/reports/summary` | Semua pengurus | Laporan per Pos Kas: saldo awal, rincian kas masuk/keluar, saldo akhir |
| GET    | `/api/public/home` | Publik | Beranda portal: jadwal ibadah terdekat, warta terbaru, renungan hari ini, berita, rekening/QRIS |
| GET    | `/api/public/contents` | Publik | Konten terbit per kategori, dengan pencarian dan paging |
| GET    | `/api/public/contents/:slug` | Publik | Satu konten terbit lengkap |
| GET    | `/api/public/worships` | Publik | Papan Jadwal: jadwal ibadah publik dengan saringan jenis dan rayon, beserta petugas |
| GET    | `/api/contents` | Admin, Pendeta | Daftar CMS termasuk draf dan terjadwal (Pendeta: renungannya) |
| GET    | `/api/contents/:id` | Admin, Pendeta | Satu konten untuk diubah |
| POST   | `/api/contents` | Admin, Pendeta | Tambah konten (Pendeta: Renungan) |
| PUT    | `/api/contents/:id` | Admin, Pendeta | Ubah konten (PATCH juga diterima) |
| DELETE | `/api/contents/:id` | Admin, Pendeta | Hapus konten |
| GET    | `/api/worships` | Admin, Pendeta, Majelis | Jadwal ibadah dengan petugas, kehadiran, tanda bentrok, filter, dan paging |
| GET    | `/api/worships/:id` | Admin, Pendeta, Majelis | Satu jadwal beserta peringatan bentrok |
| POST   | `/api/worships` | Admin, Pendeta | Tambah jadwal (lokasi, tema, bacaan, PDF liturgi) |
| PUT    | `/api/worships/:id` | Admin, Pendeta | Ubah jadwal (PATCH juga diterima) |
| POST   | `/api/worships/:id/servants` | Admin, Pendeta | Simpan susunan petugas; bentrok dilaporkan di `warnings` (PUT juga diterima) |
| PATCH  | `/api/worships/:id/attendance` | Admin, Pendeta, Majelis | Kehadiran Pria, Wanita, Anak/Pemuda; total otomatis |
| POST   | `/api/public/sacraments/apply` | Publik | Pendaftaran Baptis/Sidi/Nikah (multipart, dengan dokumen syarat); kode registrasi unik |
| GET    | `/api/public/sacraments/track/:code` | Publik | Status, catatan verifikasi, jadwal konseling & pelaksanaan menurut kode |
| GET    | `/api/sacraments` | Admin, Pendeta | Antrean pendaftaran dan buku induk, dengan hitungan per status |
| GET    | `/api/sacraments/:id` | Admin, Pendeta | Rincian pendaftaran: isian formulir dan dokumen syarat |
| PATCH  | `/api/sacraments/:id/status` | Admin, Pendeta | Ubah status verifikasi; Selesai mencatat nomor register dan memperbarui status sakramen anggota jemaat |
| GET    | `/api/mails` | Admin | Buku Agenda Surat dengan filter arah, kategori, kata kunci, tanggal, dan hitungan per arah |
| POST   | `/api/mails` | Admin | Catat surat masuk/keluar beserta URL salinannya |
| DELETE | `/api/mails/:id` | Admin | Hapus catatan surat yang salah input |
| GET    | `/api/assets` | Admin, Majelis | Katalog inventaris dengan filter kategori, lokasi, kondisi, ketersediaan, dan kata kunci |
| GET    | `/api/assets/:id` | Admin, Majelis | Satu aset beserta riwayat peminjaman terakhirnya |
| POST   | `/api/assets` | Admin, Majelis | Tambah aset; kode inventaris otomatis bila kosong |
| PUT    | `/api/assets/:id` | Admin, Majelis | Ubah aset; stok tersedia ikut menyesuaikan jumlah unit (PATCH juga diterima) |
| DELETE | `/api/assets/:id` | Admin | Hapus aset yang belum pernah dipinjam |
| GET    | `/api/asset-loans` | Admin, Majelis | Log peminjaman dengan status terlambat (`OVERDUE`), filter, dan hitungan per status |
| POST   | `/api/asset-loans` | Admin, Majelis | Catat peminjaman; stok tersedia berkurang, ditolak bila tidak cukup |
| PATCH  | `/api/asset-loans/:id/return` | Admin, Majelis | Catat pengembalian; stok tersedia bertambah lagi |
| GET    | `/api/analytics/dashboard` | Semua pengurus | Agregasi demografi, ulang tahun (bukan untuk Bendahara), arus kas & saldo Pos Kas, dan tren kehadiran; filter `year`, `month_from`, `month_to` |
| POST   | `/api/uploads`     | Login + peran folder | Unggah berkas ke R2 (`multipart`: `file`, `folder`) |
| GET    | `/api/files/*`     | Publik / Login | Ambil berkas dari R2 (mendukung ETag / `304`)     |

\* Majelis hanya untuk KK dan jemaat di rayonnya sendiri.
