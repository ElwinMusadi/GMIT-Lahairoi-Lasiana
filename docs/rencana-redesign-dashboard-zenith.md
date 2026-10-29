# Rencana Redesign Dashboard Pengurus (Zenith)

Disusun 29 Oktober 2026. Status: **disetujui** 29 Oktober 2026 (keputusan D1–D10 di bagian 7).
Dikerjakan di branch `feat/redesign-dashboard-zenith`. Acuan utamanya penerapan Zenith milik
pengguna di proyek HRIS (bagian 2.4).

## 1. Tujuan

- **Tampilan dan interaksi** dashboard pengurus (`/dashboard`) memakai **Zenith Dashboard — Shadcn/ui
  Admin Template** (DashboardPack, berlisensi milik pengguna).
- **Isi dan fitur dashboard GMIT tetap utuh:**
  - 14 modul dan pembatasan per peran;
  - data dan logika halaman;
  - cetak laporan keuangan dan sertifikat sakramen.
- **Tiga perbaikan dashboard yang tertunda** sejak audit 28 Oktober ikut dikerjakan (bagian 2.3).

## 2. Temuan

### 2.1 Lisensi dan sumber

- **Status lisensi:** Zenith adalah produk berbayar ($69). Pengguna sudah membeli lisensinya, tetapi
  belum mengunduh source React-nya.
- **Acuan yang dipakai:** penerapan gaya Zenith milik pengguna sendiri di proyek HRIS
  (`D:\Herd\HRIS`, bagian 2.4), ditambah demo publik sebagai acuan tampilan. Demo tidak dipakai
  sebagai sumber kode: tidak ada rekonstruksi bundle dengan REA.
- **Komponen React** ditulis di repo ini di atas shadcn/ui (MIT) yang sudah dipakai proyek, mengikuti
  token dan pola HRIS/Zenith. Tidak ada kode Zenith mentah yang masuk repo.
- **Bila source React Zenith diunduh kemudian**, komponen tertentu (mis. tabel data) boleh
  dibandingkan atau diambil darinya, dengan source tetap disimpan di luar repo.

### 2.2 Zenith (dari demo, 29 Oktober 2026)

| Aspek | Temuan |
| --- | --- |
| Stack | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui |
| Gaya | *Achromatic*: token warna oklch tanpa kroma; terang (kanvas putih, tombol hitam) dan gelap; radius 0,625 rem; huruf Geist |
| Pengatur tema | Kelas `density-comfortable`, `layout-sidebar`, `container-fluid`, `dir-ltr`: kepadatan, tata letak (sidebar/topbar), lebar kontainer, arah teks |
| Sidebar | Grup berlabel kecil yang bisa dilipat (Overview, Commerce, Apps, …), ikon + label, lencana jumlah, kartu pengguna di bawah, tombol ciutkan |
| Header | Pencarian ⌘K, tombol aksi utama, tombol tema, pengatur tema, notifikasi bertitik merah, menu pengguna |
| Judul halaman | Breadcrumb, judul, satu baris deskripsi, tombol aksi utama di kanan |
| Kartu KPI | Label, angka besar, ikon dalam kotak, perubahan "vs last month" hijau/merah |
| Tabel data | Saringan status bersegmen, pencarian, jumlah hasil, pengatur kolom, ekspor, kolom bisa diurutkan, pilih baris, sel avatar + nama + email, lencana status berwarna, kolom tren (sparkline), menu aksi per baris, paginasi + jumlah baris |
| Widget | Grafik overview bertab, donat dengan legenda, target berbilah progres, linimasa aktivitas |
| Halaman | 6 varian dashboard, Orders, Products, Customers, Invoices, Mail, Chat, Files, Kanban, Calendar, Wizard, Forms, Billing, Users, Notifications, Settings, Support, Docs, Profile |

### 2.3 Dashboard GMIT sekarang (baseline)

Tangkapan dasar tiap modul per peran (Admin, Bendahara, Pendeta, Majelis) di 1440/768/390 px ada di
`.taste-skill/inspect-dashboard-baseline/` (tidak di-commit).


- **Kerangka:** `SidebarProvider` shadcn, header 56 px dengan breadcrumb dan menu pengguna,
  [DashboardLayout.tsx](../src/client/layouts/DashboardLayout.tsx).
- **Gaya:** *achromatic ledger*, yaitu kanvas batu karang `#f4f3f1`, tombol hampir hitam, crimson
  `#b11226` hanya untuk data utama, dan huruf Roundo. Hanya tema terang.
- **Isi:** 6 grup menu, 14 modul, 22 halaman (±11.900 baris).
  - Tabel, formulir, dan grafik dibuat sendiri. Grafiknya SVG di `components/analytics`, dengan palet
    yang sudah divalidasi.
  - Primitif shadcn yang dipakai: button, input, label, dropdown-menu, alert-dialog, sidebar, tabs,
    breadcrumb, avatar, skeleton, sonner.
- **Cetak:** Laporan Keuangan (A4, lampiran Warta) dan sertifikat sakramen (2 mode).
- **Perbaikan tertunda** (audit 28 Oktober):
  1. Pos Kas & RAPBJ di 1280 px: nama mata anggaran terpotong.
  2. Transaksi Kas di ponsel: nama Pos Kas dan mata anggaran terpotong.
  3. Ringkasan untuk Bendahara: blok keuangan baru terlihat setelah digulir; urutan blok sebaiknya
     mengikuti peran.

| Grup | Modul | Peran | Halaman |
| --- | --- | --- | --- |
| Umum | Ringkasan | Semua | OverviewPage (KPI, arus kas, demografi, kehadiran, dana, ulang tahun) |
| Jemaat | Anggota Jemaat | Admin, Pendeta, Majelis | MembersPage, MemberImportPage (impor bertahap) |
| | Kartu Keluarga | Admin, Pendeta, Majelis | FamiliesPage, FamilyDetailPage |
| | Rayon | Admin | RayonsPage |
| Keuangan | Transaksi Kas | Bendahara, Admin, Pendeta, Majelis | FinanceTransactionsPage (kuitansi) |
| | Pos Kas & RAPBJ | idem | FinanceBudgetsPage |
| | Laporan Keuangan | idem | FinanceReportsPage (cetak A4) |
| Pelayanan | Jadwal Ibadah | Admin, Pendeta, Majelis | WorshipsPage, WorshipEditorPage |
| | Layanan Sakramen | Admin, Pendeta | SacramentsPage, SacramentDetailPage, SacramentCertificatePage (cetak) |
| | Arsip Surat | Admin | MailsPage |
| | Inventaris | Admin, Majelis | AssetsPage (aset + peminjaman) |
| Portal Publik | Warta & Konten | Admin | ContentsPage, ContentEditorPage |
| | Renungan Saya | Pendeta | ContentsPage (dibatasi renungan) |
| Administrasi | Akun Pengurus | Admin | UsersPage |
| | Log Aktivitas | Admin | AuditLogsPage |

### 2.4 Penerapan Zenith di HRIS (acuan utama)

HRIS (Laravel 13, Blade, Alpine.js, Chart.js) menerjemahkan gaya Zenith ke komponen sendiri.

| Bagian | Di HRIS | Rencana di GMIT (React) |
| --- | --- | --- |
| Token | `resources/css/app.css`: `page`, `surface`, `canvas`, `accent`, `sidebar`, `ink`, `muted`, `subtle`, `line`, `brand`, `success/warning/danger`; abu-abu netral oklch | Token dashboard di `:root` (`index.css`) dengan nama setara; `brand` = crimson GMIT untuk data (D3), tombol utama hitam seperti Zenith |
| Tema gelap | `html.dark`: token, skala abu-abu, dan tint `-50/-100/-200/-700/-800/-900` dipetakan ulang, sehingga tampilan tidak perlu varian `dark:`; disimpan di `localStorage` | Pola yang sama (D1); skrip anti-kedip di `index.html` untuk `/dashboard`; cetakan selalu terang |
| Huruf | Geist, dasar 15 px (kompromi tabel padat) | Geist (D2), dimuat hanya oleh bundel dashboard; ukuran dasar diputuskan di Tahap 1 (15 atau 16 px) |
| Sidebar | Grup berlabel yang bisa dilipat, diciutkan ke ikon (`localStorage`), flyout untuk submenu, kartu pengguna + keluar di bawah, tombol ciut di tepi | shadcn `Sidebar` (`collapsible="icon"`) dengan gaya HRIS; modul GMIT tanpa submenu, jadi flyout tidak perlu |
| Topbar | Lengket, buram, tinggi 64 px: tombol menu ponsel, pencarian ⌘K, tombol "Buat" cepat, tema, notifikasi, menu pengguna (nama, email, lencana peran, keluar) | Sama; notifikasi ditunda (D5); tombol "Buat" berisi aksi tambah sesuai peran |
| Palet ⌘K | Halaman, aksi cepat, cari karyawan; panah, Enter, Esc | Halaman modul (sesuai peran), aksi tambah, cari anggota jemaat (D5) |
| Judul halaman | `page-header`: breadcrumb kecil, judul 2xl tebal, subjudul, tombol kembali, aksi | Komponen `PageHeader` |
| Kartu | `card` (border, radius xl, bayangan xs), header dengan garis bawah | Komponen `Card` shadcn bergaya HRIS |
| Kartu KPI | Label, angka 28 px, ikon dalam kotak bertint warna seri, tren hijau/merah, sparkline atau "Lihat detail" | Komponen `KpiCard` |
| Tabel | `tbl`: kepala abu kecil, baris bergaris, sorot saat hover | Kelas/komponen tabel bersama untuk semua modul |
| Lencana | Warna solid: hijau, kuning, merah, biru (brand), abu, ungu | Komponen `StatusBadge` |
| Kontrol bersegmen | `segmented` (latar `accent`, pilihan aktif putih) | Komponen `Segmented` untuk saringan status dan tab grafik |
| Grafik | Chart.js; warna seri `--chart-1..9` mengikuti tema; isian bergradasi; donat | D7: tetap grafik SVG sendiri (palet tervalidasi) bergaya HRIS, atau Chart.js; diputuskan di Tahap 1 setelah mengukur bundel |
| Dashboard | KPI + sparkline, overview per bulan, donat, kartu analitik, pengajuan terbaru, aktivitas, pengumuman, perayaan, tautan cepat | Ringkasan GMIT dengan pola yang sama (Tahap 3) |

## 3. Pendekatan

- **Kerangka dan komponen** ditulis ulang dalam React di atas shadcn/ui yang sudah ada, mengikuti
  token dan pola HRIS (bagian 2.4) serta tampilan demo Zenith.
  - Tema memakai hook sendiri, dengan pola yang sama seperti `portal-theme.ts`.
  - Rute, data, dan penjaga peran tetap milik proyek ini.

- **Logika tidak diubah.** Pemanggilan API, validasi, penjaga peran, dan rute tetap. Yang diganti
  adalah lapisan tampilan: kerangka, judul halaman, tabel, formulir, kartu, dan grafik.
- **Satu modul per tahap,** masing-masing diverifikasi dengan keempat peran, seperti pola redesign
  portal.
- **Portal Publik tidak tersentuh.** Token dashboard (`:root`) dan portal (`.theme-portal`)
  tetap terpisah.

### 3.1 Pemetaan modul ke pola Zenith

| Modul GMIT | Pola Zenith |
| --- | --- |
| Ringkasan | Dashboard: kartu KPI, grafik overview bertab (kas masuk/keluar), donat (demografi), target berbilah (realisasi RAPBJ), linimasa (aktivitas terbaru), daftar ulang tahun |
| Anggota Jemaat, Kartu Keluarga, Rayon | Customers/Users: tabel data dengan avatar, saringan, kolom, ekspor; rincian KK seperti halaman profil |
| Impor jemaat | Wizard (langkah bertahap) |
| Transaksi Kas | Orders/Invoices: tabel dengan lencana status dan kolom nominal |
| Pos Kas & RAPBJ | Tabel + bilah progres (pola Monthly Goals) |
| Laporan Keuangan | Invoices/laporan; tata letak cetak A4 tetap |
| Jadwal Ibadah | Tabel + (opsional, D6) tampilan Calendar; editor memakai pola Forms |
| Layanan Sakramen | Tabel bersaringan status + halaman rincian; cetak sertifikat tetap |
| Arsip Surat | Tabel + berkas (pola Files) |
| Inventaris | Products: tabel aset, tab peminjaman |
| Warta & Konten, Renungan Saya | Tabel + editor (pola Forms) |
| Akun Pengurus | Users |
| Log Aktivitas | Tabel + linimasa (Recent Activity) |

## 4. Yang tidak berubah

- Portal Publik, halaman login (tetap bergaya portal, D9), dan semua API.
- Hak akses per peran dan isi tiap modul.
- Isi cetakan laporan keuangan dan sertifikat (tata letaknya hanya diselaraskan bila perlu).

## 5. Pemeriksaan per tahap

- `typecheck`, `lint`, `build`.
- Browser (CDP) dengan database uji, sebagai Admin, Bendahara, Pendeta, dan Majelis.
- Inspector skill dengan `--app` di tiga lebar.
- Kedua tema (bila D1 = terang + gelap), keyboard, dan pratinjau cetak untuk modul yang punya
  cetakan.
- Ukuran bundel; Recharts atau TanStack Table bisa menambah ukuran (D7).

## 6. Risiko

| No | Risiko | Mitigasi |
| --- | --- | --- |
| R1 | Kode Zenith ikut ter-push ke GitHub | Komponen ditulis sendiri di atas shadcn; bila source React Zenith diunduh kemudian, source itu tetap di luar repo; catatan asal-usul gaya di README |
| R2 | Tanpa source React, detail visual berbeda dari Zenith asli | Tiap tahap dibandingkan dengan demo Zenith dan HRIS (tangkapan berdampingan) |
| R3 | Regresi di ±11.900 baris logika halaman | Logika dipertahankan, hanya lapisan tampilan yang diganti; tiap modul diuji alurnya (tambah/ubah/hapus, saringan, unggah, cetak) |
| R4 | Cetakan berubah | Gaya cetak (`@media print`) diuji tiap tahap keuangan dan sakramen |
| R5 | Teks Zenith berbahasa Inggris | Semua label diterjemahkan, tetap dengan istilah gereja yang dipakai sekarang |
| R6 | Ukuran bundel dashboard naik | Dashboard sudah dimuat terpisah dari portal; ukuran diukur tiap tahap |

## 7. Keputusan (dikonfirmasi 29 Oktober 2026: semua sesuai usulan)

| No | Pertanyaan | Pilihan | Usulan (disetujui) |
| --- | --- | --- | --- |
| D1 | Tema dashboard | (a) terang saja seperti sekarang; (b) terang + gelap seperti Zenith | **(b)**, bawaan terang; cetakan selalu terang |
| D2 | Huruf | (a) Geist (Zenith); (b) Roundo (sekarang) | **(a)** Geist, agar sesuai Zenith; Roundo dilepas |
| D3 | Warna data | (a) palet Zenith; (b) crimson GMIT `#b11226` tetap untuk data utama dan grafik | **(b)**: identitas GMIT dan palet grafik yang sudah divalidasi |
| D4 | Pengatur tema (kepadatan, tata letak, lebar) | Dipakai / tidak | **Tidak**; cukup tombol tema. Fitur itu menambah kerumitan tanpa kebutuhan pengurus |
| D5 | Pencarian ⌘K dan notifikasi | (a) ⌘K untuk lompat ke modul dan cari jemaat, notifikasi ditunda; (b) keduanya; (c) tidak keduanya | **(a)**: notifikasi butuh sumber data baru (mis. pendaftaran sakramen baru) yang belum ada |
| D6 | Tampilan kalender untuk Jadwal Ibadah | Ditambah / tidak | **Tidak** di tahap ini; tabel tetap, kalender bisa menyusul |
| D7 | Komponen tabel dan grafik | Ikuti pustaka Zenith (mis. TanStack Table, Recharts) / tetap buatan sendiri dengan gaya Zenith | **Tetap buatan sendiri** (Tahap 1): Chart.js seperti HRIS, hanya garis/batang/donat, menambah 191 KB (gzip 67 KB); grafik SVG sendiri dengan palet tervalidasi diberi gaya Zenith. Tabel memakai primitif shadcn `ui/table.tsx` |
| D8 | Urutan blok Ringkasan | Sama untuk semua peran / menyesuaikan peran (Bendahara: keuangan di atas) | **Menyesuaikan peran** (perbaikan tertunda #3) |
| D9 | Halaman login | Tetap bergaya portal / ikut Zenith | **Tetap portal**, sesuai redesign portal |
| D10 | Cara kerja | (a) branch `feat/redesign-dashboard-zenith` + merge `--no-ff`; (b) langsung di `main` | **(a)**: perubahannya besar dan berlangsung beberapa hari |

## 8. Tahapan

| Tahap | Isi | Hasil yang bisa diperiksa |
| --- | --- | --- |
| 0. Persiapan | Acuan HRIS dan demo Zenith; inventaris komponen (bagian 2.4); baseline tangkapan layar dashboard sekarang (4 peran, 3 lebar); data uji | Daftar komponen yang dipakai |
| 1. Fondasi | Token warna dan tema (D1, D3), huruf (D2), primitif Zenith yang dipakai (tabel, lencana, kartu, dll.) | Halaman uji lokal (tidak di-commit) |
| 2. Kerangka | Sidebar berkelompok, header (⌘K, tema, menu pengguna), judul halaman, breadcrumb | Semua modul memakai kerangka baru; isi lama tetap berfungsi |
| 3. Ringkasan | Kartu KPI, grafik, widget; urutan per peran (D8) | 4 peran diperiksa |
| 4. Jemaat | Anggota, KK + rincian, Rayon, Impor (wizard) | |
| 5. Keuangan | Transaksi Kas, Pos Kas & RAPBJ, Laporan + cetak | Perbaikan tertunda #1 dan #2 |
| 6. Pelayanan | Jadwal Ibadah + editor, Sakramen + rincian + sertifikat, Arsip Surat, Inventaris | Cetak sertifikat |
| 7. Konten & Administrasi | Warta & Konten + editor, Renungan Saya, Akun Pengurus, Log Aktivitas | |
| 8. Rapikan & QA | Hapus komponen lama yang tak terpakai, README & KONTEKS, audit akhir | Siap merge |
| 9. Merge | Sesuai D10 | |

Setiap tahap: implementasi, verifikasi, penjelasan, lalu commit setelah "Ya, commit".

## 9. Catatan pelaksanaan

### Tahap 0 — Persiapan (29 Oktober 2026)

- **Acuan:**
  - penerapan Zenith di HRIS (`D:\Herd\HRIS`): token, tema gelap, sidebar, topbar, palet ⌘K, kartu
    KPI, tabel, lencana, kontrol bersegmen, grafik, dan dashboard, dipetakan di bagian 2.4;
  - demo Zenith: tata letak, sidebar berkelompok, tabel data (Orders), tema terang dan gelap.
- **Inventaris komponen yang akan ditulis** (Tahap 1–2):
  - token dan tema terang/gelap;
  - `PageHeader`, `Card`, `KpiCard`, kelas tabel bersama, `StatusBadge`, `Segmented`, kbd;
  - sidebar bergaya HRIS dan topbar (⌘K, tombol "Buat", tema, menu pengguna);
  - palet ⌘K;
  - tema grafik (D7).
- **Baseline:** 93 tangkapan di `.taste-skill/inspect-dashboard-baseline/` (tidak di-commit), yaitu tiap modul
  yang bisa dibuka tiap peran di 1440/768/390 px:

  | Peran | Modul | Tangkapan |
  | --- | --- | --- |
  | Admin | 14 | 42 |
  | Bendahara | 4 | 12 |
  | Pendeta | 7 | 21 |
  | Majelis | 6 | 18 |

- **Berikutnya: Tahap 1** (fondasi).

### Tahap 1 — Fondasi (29 Oktober 2026)

**Token** ([index.css](../src/client/index.css)):

- Blok `.theme-dashboard` (terang) dan `.theme-dashboard.dark` (gelap) memakai nama token shadcn
  yang sudah dipakai semua halaman dashboard (`background`, `foreground`, `card`, `muted`,
  `muted-foreground`, `rule`, `border`, `input`, `ring`, `brand`, `positive`, `warning`, `chart-*`,
  `sidebar-*`). Halaman lama ikut berganti rupa tanpa ditulis ulang.
- **Terang:** palet netral oklch seperti Zenith/HRIS (kanvas putih, tombol utama
  `oklch(0.205 0 0)`, garis `oklch(0.922 0 0)`, teks redup `oklch(0.556 0 0)` 4,7:1), radius
  0,625 rem.
- **Gelap:** kanvas `oklch(0.1)`, kartu `oklch(0.165)`, tombol utama terang. Hanya di
  `@media screen`, sehingga cetakan selalu terang.
- **Seri grafik:** terang crimson `#b11226` + abu `#8a8a8a`; gelap `#e5484d` + `#8a8a8a`.
  Divalidasi ulang dengan validator dataviz: ΔE buta warna 9,1, normal 19,3, kontras ≥3:1.

**Tema** ([dashboard-theme.ts](../src/client/lib/dashboard-theme.ts)):

- Pola sama dengan `portal-theme.ts`: kelas `theme-dashboard` + `dark` di `<html>`, kunci
  `gmit-lahairoi:tema-dashboard`, bawaan terang, dilepas saat meninggalkan dashboard.
- Dashboard sungguhan baru memakainya di Tahap 2 (bersama skrip anti-kedip di `index.html`).

**Huruf:** Geist (`@fontsource-variable/geist` 5.3.0, OFL-1.1) di-host sendiri dan diimpor oleh
`dashboard-theme.ts`. CSS-nya hanya ikut chunk dashboard (1,5 KB), dan browser hanya mengunduh
subset Latin (29 KB). Utilitas `font-sans`/`font-heading` masih Roundo, karena nilainya ditulis
langsung oleh `@theme inline`. Peralihan ke Geist dan pencabutan Roundo dikerjakan di Tahap 2,
agar dashboard yang sekarang tidak jatuh ke huruf sistem.

**Komponen** ([components/zenith](../src/client/components/zenith)):

| Komponen | Isi |
| --- | --- |
| `PageHeader` | Judul tebal 2xl, deskripsi, aksi di kanan, tombol kembali opsional |
| `KpiCard` | Label, angka besar, ikon dalam kotak (crimson untuk angka utama, netral untuk pendamping), perubahan hijau/merah dengan arah baik yang bisa dibalik (mis. kas keluar), grafik mini opsional, seluruh kartu bisa jadi tautan |
| `Sparkline` | Garis + isian bergradasi `currentColor`, hanya hiasan (`aria-hidden`) |
| `StatusBadge` | Solid seperti Zenith: sukses `emerald-700`, peringatan `amber-400` teks gelap, bahaya `red-600`, info hitam/terang, brand crimson, netral. Teks putih ≥4,5:1 pada 12 px |
| `Segmented` | Grup tombol `aria-pressed`, dengan jumlah opsional |
| `Kbd` | Tombol keyboard kecil |
| `ui/table.tsx` | Primitif shadcn bergaya tabel Zenith |
| `ui/card.tsx` | Judul kartu kini semibold seperti Zenith (komponen ini belum dipakai di halaman mana pun) |

**Pemeriksaan:** halaman uji lokal `/zenith-lab` (tidak di-commit, disimpan di folder sementara).

| Uji | Hasil |
| --- | --- |
| Tema terang dan gelap, 1440 dan 390 px | Token, Geist, tombol, KPI, tabel, kontrol bersegmen, dan lencana sesuai Zenith; tanpa gulir menyamping |
| Dashboard sungguhan | Belum berubah: kelas `theme-dashboard` belum dipasang |
| Typecheck, lint | Bersih |

**Berikutnya: Tahap 2** (kerangka).

### Tahap 2 — Kerangka (29 Oktober 2026)

**Tema dan huruf:**

- **Tema:** [DashboardLayout.tsx](../src/client/layouts/DashboardLayout.tsx) memanggil
  `useDashboardTheme()`. Skrip di `index.html` memasang `theme-dashboard` (dan `dark` bila
  dipilih) untuk `/dashboard` sebelum React dimuat, dengan kunci terpisah dari tema portal.
  Toaster mengikuti tema.
- **Huruf:** `--font-sans` kini Geist. `@font-face` Roundo, preload-nya di `index.html`, dan berkas
  `public/fonts/roundo` dihapus (D2).
- **Teks redup:** `--muted-foreground` terang digelapkan ke `oklch(0.52)` (setara `#6b6b6b` lama),
  agar ≥5:1 di putih dan di permukaan `muted` (tab, kbd). Nilai Zenith (0.556) hanya 4,3:1 di
  permukaan muted.

**Kerangka** ([components/dashboard](../src/client/components/dashboard)):

| Bagian | Isi |
| --- | --- |
| Sidebar | Merek di kotak gelap ("Lahairoi / SISTEM GEREJA"); grup berlabel kapital kecil yang bisa dilipat; butir 36 px; saat diciutkan ke ikon, label diganti garis pemisah dan tooltip; tombol bulat di tepi (desktop); status ciut diingat (`gmit-lahairoi:sidebar`); kartu pengguna (avatar, nama, peran, tombol keluar) dan "Lihat portal publik" di bawah; di bawah 1024 px menjadi sheet |
| Topbar | Lengket dan buram, tinggi 64 px: tombol menu (di bawah 1024 px), kolom pencarian dengan `Ctrl K`/`⌘K`, tombol "Buat" sesuai peran, tombol tema, avatar dengan menu (nama, email, lencana peran, portal, keluar) |
| Aksi "Buat" | Hanya aksi yang punya alamat: jadwal ibadah baru (Admin, Pendeta), konten portal baru (Admin), renungan baru (Pendeta), impor data jemaat (Admin). Bendahara dan Majelis tanpa tombol. Aksi berupa dialog di dalam halaman ditambahkan saat modulnya dirombak |
| Palet Ctrl+K | Halaman sesuai peran, aksi "Buat", dan "Cari anggota jemaat/KK" (ke `?q=`); combobox + listbox dengan panah, Enter, Esc |
| Breadcrumb | Pindah dari topbar ke atas judul halaman (Zenith), tidak tampil di Ringkasan |

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| Kerangka 4 peran (1440 px) | Admin 6 grup/16 butir, Bendahara 2/6, Pendeta 5/11, Majelis 4/10; tombol "Buat" hanya Admin dan Pendeta; Geist termuat; header 64 px; tanpa gulir menyamping |
| Ctrl+K | Terbuka dengan fokus di kolom; "transaksi" → Transaksi Kas, Enter membuka `/dashboard/finance/transactions`; "Yosua" → "Cari anggota jemaat", panah memilih, Enter membuka `/dashboard/members?q=Yosua` (12 baris) |
| Menu "Buat" (Admin) | Jadwal ibadah baru, Konten portal baru, Impor data jemaat |
| Sidebar ciut | Diingat setelah muat ulang |
| Tema gelap | `theme-dashboard dark` sudah terpasang sebelum React (tanpa kedip); isi halaman lama ikut token |
| Cetak saat tema gelap | Latar putih, teks gelap, sidebar tersembunyi |
| Pindah ke portal | Kelas bertukar ke `theme-portal`; tema portal tidak terpengaruh |
| Ponsel 390 px | Tombol menu membuka sheet; tanpa gulir menyamping |
| Inspector `--app` (via proxy sesi Admin) | Ringkasan 0 FAIL/0 WARN, Anggota 0/0, Transaksi 0 FAIL, Pos Kas & RAPBJ 0 FAIL (WARN angka rata kiri dan teks dekat tepi di ponsel: isi halaman, Tahap 5) |
| Typecheck, lint | Bersih |

**Catatan inspector:** `inspect.mjs` selalu membaca `.taste-skill/direction.json` (arah portal)
di folder kerja lebih dulu, sehingga di dashboard ia salah melapor `font-not-dealt` (Plus Jakarta
Sans + Inter). Untuk dashboard, jalankan dari folder yang berisi salinan arah aplikasi
(`.taste-skill/app/direction.json`) sebagai `.taste-skill/direction.json`. Arah aplikasi itu
memang memilih Geist sejak awal.

**Berikutnya: Tahap 3** (Ringkasan).

### Tahap 3 — Ringkasan (29 Oktober 2026)

[OverviewPage.tsx](../src/client/pages/dashboard/OverviewPage.tsx) ditulis ulang dengan pola
dashboard Zenith/HRIS. API dan datanya tidak berubah.

**Tata letak:**

- **Judul halaman:**
  - salam sesuai jam WITA, nama, dan tanggal;
  - baris meta: status sistem, waktu pembaruan, tombol muat ulang;
  - filter periode (tahun, bulan s.d. bulan) di kanan. Di ponsel filter ini menjadi dua baris:
    "Periode [tahun]", lalu rentang bulan selebar layar.
- **Kartu KPI** (`KpiCard`):
  - empat kartu keadaan hari ini, dengan ikon dan tautan ke modul bila peran itu bisa membukanya
    (`canOpenModule`);
  - saldo kas: perubahan dari akhir bulan lalu dan grafik mini saldo akhir tiap bulan, dihitung
    mundur dari saldo akhir periode;
  - kehadiran Minggu: perubahan dari Minggu sebelumnya dan grafik mini total tiap Minggu;
  - grafik mini hanya tampil bila periodenya memuat hari ini, karena KPI selalu keadaan hari ini;
  - label dan ikon sebaris, sedangkan angka memakai seluruh lebar kartu dan mengecil lewat
    `clamp(…cqi…)`, sehingga "Rp138.650.000" tidak terpotong di empat kolom 1280 px (24 px);
  - kartu bertautan tanpa grafik mini diberi baris "Lihat rincian".
- **Kartu widget** (`Panel` baru, di atas `Card` shadcn): judul, keterangan, aksi di kanan
  ("Lihat semua ↗", kendali grafik). Aksi tetap sebaris dengan judul selama muat.
- **Jemaat:**
  - donat komposisi laki-laki/perempuan (`Donut` baru: celah 2 px, sorot potongan atau baris
    legenda, angka dan persen di legenda);
  - cakupan sakramen bertumpuk;
  - jiwa per rayon dan kelompok kategorial.
- **Ulang tahun:** tab memakai `Segmented`; lencana "Hari ini" memakai `StatusBadge` brand.
- **Grafik:**
  - garis bantu putus-putus;
  - kehadiran berupa kurva halus monoton (metode Steffen, seperti `d3.curveMonotoneX`) dengan isian
    bergradasi.
- **Aktivitas terbaru** (Admin): linimasa di samping grafik kehadiran, dengan ikon modul polos dan
  garis penghubung.

**Urutan per peran (D8, perbaikan tertunda #3):**

| Peran | KPI (yang pertama crimson) | Blok |
| --- | --- | --- |
| Admin | Jiwa, KK, Saldo, Kehadiran | Jemaat + ulang tahun, Keuangan, Kehadiran + aktivitas |
| Bendahara | Saldo, Kehadiran, Jiwa, KK | Keuangan, Kehadiran, Jemaat (tanpa ulang tahun) |
| Pendeta, Majelis | Jiwa, KK, Kehadiran, Saldo | Jemaat + ulang tahun, Kehadiran, Keuangan |

**Tema gelap:** `--brand-foreground` gelap diganti teks hampir hitam (5,1:1 di `#e5484d`; teks putih
hanya 3,9:1 untuk lencana 12 px).

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| 4 peran, 1440 px | Urutan KPI dan blok sesuai tabel di atas. Tautan KPI sesuai hak akses (Bendahara: hanya Saldo). Padding kartu 20 px. Tanpa gulir menyamping |
| 1280 px | Angka KPI 24 px, tidak terpotong |
| 768 dan 390 px (Admin, Bendahara) | Tanpa gulir menyamping; filter periode dua baris; legenda donat turun ke bawah donat |
| Tema gelap | Kartu, grafik, dan donat mengikuti token; lencana "Hari ini" teks gelap |
| Interaksi | Tombol Tabel (10 baris, `aria-pressed`); panah kiri di grafik kehadiran; tab ulang tahun bulan ini (30 baris); sorot donat ("86 Perempuan") |
| Periode lampau (2025) dan kosong (2021) | KPI tetap, grafik mini hilang; grafik kosong dengan pesan |
| Galat API dan muat lambat | Pesan + "Coba lagi"; kerangka seukuran isi |
| Inspector `--app` (Admin) | 0 FAIL, 0 WARN. Sempat 1 WARN `icon-tiles` (ikon berkotak berulang di aktivitas); diganti ikon polos dengan garis linimasa. Kotak ikon KPI dipertahankan sebagai ciri Zenith |
| Typecheck, lint | Bersih |

**Berikutnya: Tahap 4** (Jemaat).

### Tahap 4 — Jemaat (29 Oktober 2026)

**Komponen bersama baru** ([components/zenith](../src/client/components/zenith)), dipakai juga
di Tahap 5–7:

| Komponen | Isi |
| --- | --- |
| `data-table.tsx` | `TableCard` (bilah alat, tabel `ui/table`, kaki paginasi), `SearchField`, `selectClass`, `TablePagination` (rentang, "Halaman x dari y", tombol panah), `TableMessage`, `SkeletonRows` |
| `person-avatar.tsx` | Avatar inisial berwarna identitas pucat (pindahan dari `user-menu`), abu-abu untuk jemaat pindah/meninggal |
| `stepper.tsx` | Penunjuk langkah wizard (lingkaran bernomor, centang, garis penghubung, `aria-current="step"`) |

**Halaman:**

- **Anggota Jemaat:**
  - `PageHeader` dengan temuan Pemuda belum sidi;
  - tabel dalam `TableCard`:
    - status keanggotaan berupa kontrol bersegmen (Aktif, Pindah, Meninggal, Semua);
    - pencarian dan lima filter tanpa label terlihat, tetapi pilihan pertamanya menjelaskan diri
      ("Semua gol. darah", "Baptis: semua"), dengan `aria-label`;
    - di ponsel filter dilipat di balik tombol "Filter (n)";
  - sel nama: avatar, nama, lencana status, lalu hubungan keluarga dan KK.
- **Kartu Keluarga:** deret rayon menjadi kartu angka yang juga pilihan (terpilih bergaris
  tebal); tabel dengan avatar kepala keluarga dan panah ke rincian.
- **Rincian KK:**
  - `PageHeader` dengan tombol kembali;
  - Data KK berupa deret ringkas selebar halaman (label di atas nilai; di ponsel sebaris);
  - tabel anggota selebar halaman.

  Tata letak dua kolom (tabel + kartu samping) sempat dicoba. Inspector menandai tinggi yang tidak
  sejajar, dan bila disamakan, ruang kosong di dalam kartu.
- **Rayon:** tabel dengan garis porsi jiwa aktif di bawah nama rayon.
- **Impor:**
  - wizard tiga langkah (Pilih berkas → Periksa pratinjau → Selesai);
  - zona unggah bergaris putus-putus;
  - template di `Panel`;
  - empat kartu angka sebagai pilihan tampilan, lencana `StatusBadge` (Siap/Sudah ada/Perlu
    diperbaiki), dan sel rata atas.
- **Panel profil jemaat:** avatar di kepala panel, lencana status `StatusBadge`.

**Pemeriksaan** (database uji dicadangkan sebelum uji simpan impor, lalu dipulihkan):

| Uji | Hasil |
| --- | --- |
| Admin, Pendeta, Majelis (1440 px) | Tabel 50 baris + avatar, paginasi "1–50 dari 178 jiwa, Halaman 1 dari 4". Majelis tanpa filter/kolom rayon dan tanpa deret rayon. Tanpa gulir menyamping |
| Anggota | Segmen Pindah → `?status=MOVED` (3 baris berlencana); filter Pemuda → `?categorical_group=PEMUDA` (53); Hapus filter; halaman 2 → "51–100" |
| Profil dan menu baris | Panel profil terbuka dari nama; menu: Lihat profil, Ubah profil, Buka KK, Riwayat, Hapus |
| Kartu Keluarga | Pilih Golgota → `?rayon_id=2` (14 KK), kartu terpilih ditandai; rincian KK terbuka dari nama |
| Impor | Langkah 1 → 2 (2 siap, 1 perlu diperbaiki, tampilan otomatis ke "Perlu diperbaiki") → 3 ("2 jemaat tersimpan") |
| Ponsel 390 dan tablet 768 | Kolom menyusut ke nama + tindakan, keterangan pindah ke baris kedua; filter dua kolom di balik tombol |
| Tema gelap | Tabel, segmen, dan filter mengikuti token |
| Inspector `--app` | Anggota, KK, Rayon, Impor: 0 FAIL, 0 WARN. Rincian KK (6 anggota): 0/0. Rincian KK dengan 2 anggota: 1 WARN `hero-void`, karena isinya memang sedikit |
| Typecheck, lint, prettier | Bersih |

**Berikutnya: Tahap 5** (Keuangan, termasuk perbaikan tertunda #1 dan #2).

### Tahap 5 — Keuangan (29 Oktober 2026)

**Komponen baru:** `StatStrip` ([stat-strip.tsx](../src/client/components/zenith/stat-strip.tsx)).

- Deret angka dalam satu kartu.
- Di layar ≥1024 px tiap angka satu kolom dengan label di atasnya; di bawahnya menjadi baris
  label–angka.
- Angka mengecil lewat `clamp(…cqi…)`, agar nominal Rupiah muat di empat kolom.

**Halaman:**

- **Transaksi Kas** (pola Zenith Orders):
  - deret Kas masuk / Kas keluar / Selisih di atas tabel;
  - di bilah alat: jenis bersegmen, pencarian, filter Bulan, Pos Kas, dan Kuitansi;
  - kolom Kuitansi: tautan "Buka" atau lencana "Belum ada".
  - **Perbaikan tertunda #2:** di bawah 1024 px baris keterangan (Pos Kas, mata anggaran,
    pencatat) membungkus, tidak dipotong; kolom nominal di ponsel lebih rapat agar uraian lebih
    lebar.
- **Pos Kas & RAPBJ:**
  - Pos Kas menjadi deret kartu saldo (nama, saldo, kode dan pemakaian, menu) dengan total saldo di
    judulnya;
  - tabel RAPBJ selebar halaman, dengan tahun dan Pos Kas di bilah alat;
  - lencana "Lewat Rp…" memakai `StatusBadge` bahaya; sel Capaian rata kanan.
  - **Perbaikan tertunda #1:** panel samping 20rem dihapus, sehingga kolom nama mata anggaran di
    1280 px melebar dari ±150 px ke ±500 px; nama boleh membungkus.
- **Laporan Keuangan:**
  - jenis periode bersegmen, navigasi periode, Pos Kas, dan Rincian dalam satu baris;
  - deret saldo awal / penerimaan / pengeluaran / saldo akhir di atas lembar;
  - lembar laporan berbingkai kartu.
  - Deret, kendali, dan judul halaman tidak ikut tercetak; isi cetakan sama seperti sebelumnya.

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| 4 peran (1440 px) | Bendahara dan Admin: tombol Catat, menu baris. Pendeta dan Majelis: baca saja. Kartu Pos Kas, tabel RAPBJ 6 baris, laporan mingguan. Tanpa gulir menyamping |
| Perbaikan #1 (1280 px, Bendahara dan Admin) | 0 sel nama mata anggaran terpotong |
| Perbaikan #2 (390 px) | 0 baris keterangan terpotong; di 768 px juga 0 |
| Interaksi | Segmen Kas masuk → `?type=INCOME` (deret ikut berubah); panel rincian transaksi; laporan Bulanan → `?period=month` |
| Cetak (emulasi media print) | Judul halaman, kendali, dan deret tersembunyi; lembar laporan tampil tanpa bingkai, latar putih |
| Tema gelap | Kartu, tabel, bar capaian, dan lencana mengikuti token |
| Inspector `--app` (Bendahara) | Transaksi 0 FAIL/0 WARN. RAPBJ 0/0: WARN `numeric-align` lama dari Tahap 2 selesai. Laporan 0 FAIL, 1 WARN `panel-void`, yaitu ruang tanda tangan basah di atas garis nama yang memang disengaja |
| Typecheck, lint, prettier | Bersih |

**Berikutnya: Tahap 6** (Pelayanan).

### Tahap 6 — Pelayanan (29 Oktober 2026)

**Cara kerja:** tujuh halaman (±4.000 baris) dibagi ke tiga subagen paralel dengan berkas yang
tidak bersinggungan:

1. Jadwal Ibadah + editor;
2. Sakramen;
3. Arsip Surat + Inventaris.

Tiap subagen mengikuti pola halaman Tahap 3–5 yang sudah jadi. Hasilnya ditinjau, dirapikan, dan
diuji di sini.

**Halaman:**

- **Jadwal Ibadah:**
  - Mendatang/Sudah berlangsung bersegmen, beserta jumlah yang belum dicatat;
  - pencarian, jenis, dan rayon di bilah alat;
  - satu tabel dengan kelompok per tanggal (`th scope="rowgroup"`);
  - lencana "N bentrok" kuning; kolom Jam rata kanan.
- **Editor jadwal:**
  - `PageHeader` dengan tombol kembali, Batal, dan Simpan;
  - `Panel` Rincian ibadah dan Petugas pelayanan;
  - kolom samping (tampil di portal, tata ibadah, Kehadiran) lengket di bawah topbar.
- **Sakramen:**
  - Antrean verifikasi / Buku Induk bersegmen di kanan judul;
  - status (antrean) atau jenis (Buku Induk) bersegmen di bilah alat;
  - avatar pendaftar di sel nama.
  - Rincian: `Panel` data pendaftaran, berkas, dan verifikasi. Pendaftaran Selesai memakai deret
    buku induk selebar halaman.
  - Lencana status di `components/sacrament/status-badge.tsx`: Menunggu netral, Revisi merah,
    Konseling kuning, Disetujui gelap, Selesai hijau.
- **Cetak sertifikat:**
  - judul dan pengaturan memakai `PageHeader` dan `Panel` (format bersegmen, lengket di xl);
  - semuanya `print:hidden`;
  - `certificate.tsx` dan aturan `@page` tidak disentuh.
- **Arsip Surat:**
  - arah surat bersegmen beserta jumlah;
  - tahun dan kategori di bilah alat;
  - lencana Masuk/Keluar;
  - kolom Salinan: "Buka" + unduh, atau "Tidak ada".
- **Inventaris:**
  - Katalog/Peminjaman bersegmen (beserta lencana "N terlambat"); kondisi dan status peminjaman
    juga bersegmen.
  - Kondisi rusak ringan, rusak berat, dan dalam perbaikan berlencana; Baik tetap teks biasa
    agar pengecualian menonjol.
  - Lencana "Terlambat N hari" merah.

**Perbaikan bersama:**

- `TableCard`: bilah alat kini `grid-cols-1` (minmax(0, 1fr)). Segmen yang panjang bergulir di
  tempat dan tidak lagi melebarkan bilah alat melewati kartu di ponsel (ditemukan di Inventaris
  390 px).
- `SkeletonRows` mendapat opsi `avatar` (tabel tanpa avatar: Jadwal, Transaksi, RAPBJ, Rayon,
  Buku Induk, Arsip, Inventaris).
- `Segmented` menulis jumlah dengan pemisah ribuan.
- Kode lama yang tidak terpakai dihapus: `STATUS_PILL` sakramen dan `CONDITION_PILL` aset.

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| Admin, Pendeta, Majelis (1440 px) | Semua halaman sesuai hak akses; lencana sesuai peta nada; tanpa gulir menyamping dan tanpa teks penting terpotong |
| Editor jadwal (yang ada dan baru) | Panel Rincian ibadah, Petugas pelayanan, Kehadiran; tombol Batal dan Simpan di judul |
| Inventaris → Peminjaman | `?view=loans`, segmen status beserta jumlah, lencana "Terlambat N hari" |
| Buku Induk → rincian Selesai → cetak | Deret buku induk; cetak (desain lengkap dan blangko) hanya menampilkan isi sertifikat |
| 768 dan 390 px | Tanpa gulir menyamping atau teks terpotong; isi bilah alat 11 halaman tabel tetap di dalam kartu |
| Tema gelap | Jadwal, Sakramen, Inventaris mengikuti token |
| Inspector `--app` (Admin) | 0 FAIL di 9 halaman. 0 WARN: Jadwal, Sakramen, kedua rincian sakramen, Arsip, Inventaris. Dibiarkan: `ragged-row` di editor jadwal (form panjang dengan kolom samping lengket) dan di halaman cetak (pengaturan lengket di samping pratinjau A4), serta `font-count` di halaman cetak (Georgia adalah huruf sertifikat) |
| Typecheck, lint, prettier | Bersih |

**Berikutnya: Tahap 7** (Konten & Administrasi).
