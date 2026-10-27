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
│   │   │   ├── users/          # Dialog form akun dan kata sandi sementara
│   │   │   ├── congregation/   # Form KK, profil anggota, rayon; panel profil; pemilih KK
│   │   │   └── session-provider.tsx
│   │   ├── layouts/            # RootLayout, PublicLayout, DashboardLayout
│   │   ├── pages/              # public/, dashboard/, LoginPage, RouteErrorPage
│   │   ├── lib/                # api, use-api-query, use-url-filters, upload, session, navigation, format WITA, audit-format, congregation, read-spreadsheet, member-files
│   │   ├── router.tsx          # Definisi semua rute
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind v4 + token tema portal & dashboard
│   ├── worker/                 # API Hono (Cloudflare Worker)
│   │   ├── routes/             # Satu file per grup endpoint
│   │   ├── middleware/         # requireAuth, requireRole (RBAC)
│   │   ├── lib/                # Hash kata sandi, sesi, log aktivitas, pembaca request, data jemaat
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
| `/`                  | `PublicLayout`    | Beranda portal                                                    |
| `/jadwal`, `/warta`, `/renungan`, `/persembahan`, `/tentang` | `PublicLayout` | Kerangka halaman portal (diisi modul Portal Publik) |
| `/login`             | berdiri sendiri   | Masuk pengurus                                                    |
| `/dashboard`         | `DashboardLayout` | Ringkasan: modul per peran, rayon, status sistem, dan aktivitas terbaru (Admin) |
| `/dashboard/members` | `DashboardLayout` | Anggota Jemaat (Admin, Pendeta, Majelis): cari, filter kombinasi di URL, profil lengkap, ekspor |
| `/dashboard/members/import` | `DashboardLayout` | Impor data jemaat dari Excel/CSV dengan pratinjau validasi (Admin) |
| `/dashboard/families` | `DashboardLayout` | Kartu Keluarga per rayon; KK baru langsung dibuka untuk diisi anggotanya |
| `/dashboard/families/:id` | `DashboardLayout` | Rincian KK: seluruh anggota, data KK, tambah Kepala Keluarga/anggota |
| `/dashboard/rayons`  | `DashboardLayout` | Rayon (Admin): koordinator, keterangan, jumlah KK dan jiwa |
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

- **Portal Publik**, arah *one motif* (seed 1525544793): satu-satunya motif adalah **sumur Lahai-roi** (Kejadian 16:13–14) dilihat dari atas, yaitu sebuah cincin. Cincin itu muncul sebagai tanda merek, penanda tautan aktif, bentuk raksasa di hero, dan bibir sumur dari sepuluh batu di footer. Palet hitam & crimson diambil dari warna tenun ikat Sabu. Huruf: Roundo (di-host sendiri di `public/fonts`).
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
- **Kartu Keluarga.** Kelima rayon tampil sebagai pilihan di atas daftar, lengkap dengan jumlah KK dan jiwa aktif (di ponsel menjadi satu pilihan Rayon). Kalimat di bawah judul menyebut KK yang belum punya anggota tercatat.
- **Anggota Jemaat.** Pencarian dan filter Rayon, Kategori, Golongan darah, Baptis, Sidi, dan Status keanggotaan bisa dikombinasikan; semuanya tersimpan di URL. Bawaan menampilkan jemaat Aktif. Kalimat di bawah judul menyebut Pemuda aktif yang belum sidi (calon katekisasi).
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

**Alur impor** (`/dashboard/members/import`, khusus Admin):

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
| 0010    | Index unik: satu Kepala Keluarga aktif per KK                     | Database Jemaat & KK          |

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

Komponen akan ditulis ke `src/client/components/ui/`. Preset yang dipakai: `radix-nova` (Radix UI, ikon Lucide); font diganti Roundo lewat token. Beberapa komponen sudah disesuaikan untuk proyek ini dan perlu dicek ulang bila ditimpa CLI: breakpoint sidebar di `lg` (1024px), overlay sheet tanpa blur, dan teks aksesibilitas berbahasa Indonesia.

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
| POST   | `/api/uploads`     | Login + peran folder | Unggah berkas ke R2 (`multipart`: `file`, `folder`) |
| GET    | `/api/files/*`     | Publik / Login | Ambil berkas dari R2 (mendukung ETag / `304`)     |

\* Majelis hanya untuk KK dan jemaat di rayonnya sendiri.
