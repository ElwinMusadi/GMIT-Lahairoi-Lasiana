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
