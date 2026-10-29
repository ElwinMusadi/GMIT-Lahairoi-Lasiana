# Konteks Proyek — Sistem Informasi GMIT Lahairoi Tuak Sabu Lasiana

> Dokumen ini merangkum seluruh informasi proyek sampai status terakhir. Bacalah lebih dulu
> sebelum melanjutkan pekerjaan, termasuk sesi Claude Code yang baru.
>
> **Terakhir diperbarui:** 30 Oktober 2026
> **Branch aktif:** `main`
> **Repositori:** <https://github.com/ElwinMusadi/GMIT-Lahairoi-Lasiana> (publik)

Rincian teknis per modul (aturan data, endpoint, perilaku layar) ada di [README.md](README.md).
Spesifikasi produk ada di [docs/prd.md](docs/prd.md). Dokumen ini tidak mengulang isi keduanya:
yang ditulis di sini adalah gambaran besar, status, keputusan, dan cara kerja.

---

## 1. Ringkasan

Platform manajemen gereja dan portal informasi publik untuk **GMIT Jemaat Lahairoi Tuak Sabu
Lasiana**, Kota Kupang, NTT. Sekitar 1.200 jiwa terbagi dalam **5 rayon pelayanan**:
1 Getsemani, 2 Golgota, 3 Tiberias, 4 Galilea, 5 Kapernaum.

Aplikasi ini terdiri atas dua bagian:

- **Portal Publik** untuk jemaat dan masyarakat umum, tanpa login. Isinya jadwal ibadah, warta
  mingguan (PDF), renungan, berita, galeri, profil gereja, rekening dan QRIS persembahan, serta
  pendaftaran sakramen dengan pelacakan memakai kode registrasi.
- **Dashboard pengurus** untuk empat peran: Admin, Bendahara, Pendeta, dan Majelis. Isinya data
  jemaat dan KK, keuangan multi-pos dan RAPBJ, CMS portal, jadwal ibadah dan kehadiran,
  verifikasi sakramen dan cetak sertifikat, arsip surat, inventaris, dan dashboard eksekutif.

Nama *Lahai-roi* berarti "Yang Hidup yang melihat aku" (Kejadian 16:13–14). Cincin sumur
Lahai-roi menjadi tanda merek (`src/client/components/brand/well.tsx`).

---

## 2. Status saat ini

**Semua fitur PRD Fase 1–3 sudah dibangun, diuji, di-commit, dan di-push ke `main`.** Tahap
penyempurnaan UI/UX: redesign Portal Publik (kage) dan dashboard pengurus (Zenith) sudah selesai
dan tergabung di `main`.

| Modul (PRD) | Fase | Status | Commit utama |
| --- | --- | --- | --- |
| Skema D1 15 tabel + seed | – | Selesai | `43defa2` |
| Kerangka layout portal & dashboard, helper API, unggah R2 | – | Selesai | `d0bd9ce` |
| Autentikasi, sesi cookie, RBAC, login | 1 | Selesai | `cdd6ac2`, `af3435f` |
| Akun pengurus & Log Aktivitas | 1 | Selesai | `0f383b8`, `af3435f` |
| Database Jemaat: Rayon, KK, Anggota, filter kombinasi | 1 | Selesai | `89f6d1f`, `b85740f` |
| Impor/ekspor jemaat Excel/CSV dengan pratinjau | 1 | Selesai | `27a2288` |
| Keuangan: Pos Kas, RAPBJ, transaksi + kuitansi | 1 | Selesai | `baeb008`, `72c1ed6` |
| Laporan keuangan per Pos Kas siap cetak Warta | 1 | Selesai | `f541667` |
| CMS konten portal + `/api/public` | 1 | Selesai | `edc6108`, `ea6a3ab` |
| Portal Publik (rancangan 08): Beranda, Profil, Persembahan | 1 | Selesai | `94151f1` |
| Portal: Jadwal, Warta, Renungan, Berita, Galeri | 1 | Selesai | `8448961` |
| Jadwal ibadah, petugas (deteksi bentrok), kehadiran | 2 | Selesai | `5fae4c3`, `2042c4b` |
| Pendaftaran sakramen online + lacak status (portal) | 2 | Selesai | `5ec95f8`, `bf8c0e5` |
| Verifikasi sakramen, buku induk, cetak sertifikat 2 mode | 2 | Selesai | `ed12c4c` |
| Buku Agenda Surat masuk/keluar | 2 | Selesai | `c1f84d8` |
| Inventaris: katalog aset & peminjaman | 3 | Selesai | `6c926b4`, `841e79c` |
| Dashboard Eksekutif: API agregasi + UI + widget ulang tahun | 3 | Selesai | `cdf6930`, `f88480c` |
| Redesign Portal Publik bergaya kage (rancangan 10), isi 08 tetap | – | Selesai | `90e5a7a` (merge) |
| Redesign dashboard pengurus bergaya Zenith, logika dan API tetap | – | Selesai | `c7855e8` (merge) |
| Pengaturan > Tampilan: tema Portal Publik Bawaan atau Glassmorphism | – | Selesai | branch `feat/tema-portal-glassmorphism` |

Catatan status:

- Kotak centang kriteria penerimaan di `docs/prd.md` masih kosong (`- [ ]`). Isinya sudah
  terpenuhi, tetapi dokumennya belum diperbarui.
- **Belum pernah di-deploy ke Cloudflare.** `database_id` di [wrangler.toml](wrangler.toml)
  masih dikomentari. Langkah sebelum deploy pertama ada di README bagian "Menyiapkan database di
  Cloudflare".
- Riwayat `main` ada di bagian 13. Branch lokal lama `chore/design-skills`,
  `docs/stitch-portal-smooth-scroll`, `feat/redesign-portal-kage`, dan
  `feat/redesign-dashboard-zenith` sudah tergabung ke `main` dan tidak di-push.
- Redesign portal (12 commit, merge `90e5a7a`, dan catatan merge `2396a6a`) sudah di-push ke
  `origin/main` pada 29 Oktober 2026.
- Redesign dashboard (9 commit, merge `c7855e8`, dan catatan merge sesudahnya) sudah di-push ke
  `origin/main` pada 29 Oktober 2026.

### Redesign dashboard bergaya Zenith (selesai, 29 Oktober 2026)

Dashboard pengurus (`/dashboard`) dirombak dengan tampilan Zenith Dashboard (shadcn/ui,
DashboardPack). Pengguna punya lisensinya tetapi belum mengunduh source React-nya.

- **Acuan:** penerapan gaya Zenith milik pengguna di proyek HRIS (`D:\Herd\HRIS`, Laravel + Blade +
  Alpine.js) dan demo publik Zenith (hanya acuan tampilan; tidak ada rekonstruksi kode dengan REA).
- **Cara kerja:** komponen React ditulis sendiri di atas shadcn/ui; logika, API, peran, dan cetakan
  tidak berubah.
- **Rencana dan keputusan D1–D10** (disetujui 29 Oktober 2026) ada di
  [docs/rencana-redesign-dashboard-zenith.md](docs/rencana-redesign-dashboard-zenith.md).
- **Branch:** `feat/redesign-dashboard-zenith`, sudah di-merge `--no-ff` ke `main` lewat merge
  commit `c7855e8` (D10).
- **Tahap 0 (persiapan):** acuan HRIS diinventaris; baseline dashboard per peran ada di
  `.taste-skill/inspect-dashboard-baseline/` (tidak di-commit).
- **Tahap 1 (fondasi) selesai.**
  - Token `.theme-dashboard` terang/gelap (nama token shadcn yang sama, jadi halaman lama ikut).
  - `lib/dashboard-theme.ts` dan Geist yang di-host sendiri.
  - Komponen `components/zenith/`: `PageHeader`, `KpiCard`, `Sparkline`, `StatusBadge`,
    `Segmented`, `Kbd`, ditambah `ui/table.tsx`.
  - D7: tetap grafik SVG sendiri (Chart.js menambah gzip 67 KB).
  - Dashboard sungguhan belum memakai tema baru.
- **Tahap 2 (kerangka) selesai.**
  - Dashboard kini memakai tema Zenith: `theme-dashboard` di `<html>`, skrip anti-kedip, dan tombol
    tema terang/gelap.
  - Sidebar berkelompok (grup bisa dilipat, ciut ke ikon diingat di perangkat, kartu pengguna
    di bawah); topbar lengket dengan pencarian, tombol "Buat" sesuai peran, tema, dan avatar.
  - Palet Ctrl+K: halaman, aksi "Buat", dan pencarian anggota jemaat atau KK.
  - `font-sans` kini Geist; Roundo dicabut; `useLogout` pindah ke `lib/session.ts`.
  - Inspector `--app` harus dijalankan dengan arah aplikasi (lihat rencana bagian 9, Tahap 2).
- **Tahap 3 (Ringkasan) selesai.**
  - Kartu KPI Zenith (grafik mini dan tren saldo/kehadiran), filter periode di kanan judul, kartu
    `Panel`, donat komposisi jemaat, linimasa aktivitas (Admin), kurva kehadiran bergradasi.
  - Urutan blok per peran (D8, perbaikan tertunda #3): Bendahara keuangan dulu; Pendeta/Majelis
    jemaat lalu kehadiran; Admin jemaat, keuangan, lalu kehadiran + aktivitas.
- **Tahap 4 (Jemaat) selesai.**
  - Komponen tabel bersama `components/zenith/data-table.tsx` (kartu tabel, pencarian,
    paginasi, pesan, kerangka), `person-avatar.tsx`, dan `stepper.tsx`; dipakai lagi di
    Tahap 5–7.
  - Anggota: status bersegmen dan filter di bilah alat. KK: deret rayon berupa kartu angka.
    Rincian KK: Data KK berupa deret di atas tabel anggota. Impor: wizard tiga langkah.
- **Tahap 5 (Keuangan) selesai.**
  - Komponen baru `components/zenith/stat-strip.tsx` (deret angka dalam satu kartu).
  - Transaksi Kas: deret jumlah, jenis bersegmen, filter di bilah alat, kolom Kuitansi.
  - Pos Kas & RAPBJ: Pos Kas menjadi deret kartu saldo di atas tabel RAPBJ selebar halaman.
  - Laporan: kendali bersegmen dan deret saldo di atas lembar; cetakan tidak berubah.
  - Perbaikan tertunda #1 dan #2 selesai.
- **Tahap 6 (Pelayanan) selesai.**
  - Jadwal Ibadah: tampilan bersegmen, satu tabel berkelompok per tanggal. Editor memakai
    `Panel`, kolom sampingnya lengket.
  - Sakramen: antrean/Buku Induk bersegmen, lencana status di
    `components/sacrament/status-badge.tsx`. Halaman cetak sertifikat hanya diganti
    bingkainya; isi cetakan tetap.
  - Arsip Surat: arah surat bersegmen, kolom Salinan. Inventaris: Katalog/Peminjaman dan
    kondisi bersegmen; kondisi Baik tetap tanpa lencana.
  - Dikerjakan tiga subagen paralel dengan pola dari Tahap 3–5, lalu ditinjau dan diuji di sini.
- **Tahap 7 (Konten & Administrasi) selesai.**
  - Warta & Konten / Renungan Saya: kategori dan status bersegmen; nada lencana di
    `STATUS_TONE` (`lib/contents.ts`). Editor memakai `Panel` dengan kolom samping lengket.
  - Akun Pengurus: status akun bersegmen, avatar, lencana peran netral. Log Aktivitas: filter di
    bilah alat, satu tabel berkelompok per hari, ikon modul polos (`auditIcon` di
    `lib/audit-format.ts`, dipakai juga linimasa Ringkasan).
  - Dikerjakan dua subagen paralel, lalu ditinjau dan diuji di sini.
- **Tahap 8 (Rapikan & QA) selesai.**
  - Blok `:root` "achromatic ledger" dihapus; token dashboard terang kini `:root, .theme-dashboard`
    (juga cadangan tanpa kelas tema). Portal mendapat `--radius: 0.5rem` sendiri, jadi tampilannya
    tidak berubah (dibuktikan dengan perbandingan nilai token sebelum/sesudah). Token mati
    `--field`, `--field-foreground`, dan `--warning` dihapus.
  - Dihapus: `ui/badge.tsx`, `ui/tabs.tsx` (diganti `StatusBadge`/`Segmented`) dan `<Can>` (cukup
    `useCan`). Halaman "Akses dibatasi" memakai judul setara `PageHeader`.
  - Audit akhir 4 peran × semua halaman × 1440/768/390 px, tema gelap, cetak, Ctrl+K. Perbaikan:
    baris keterangan Jemaat membungkus di bawah 1024 px; kolom angka Rayon dipersempit di ponsel;
    `GroupHeaderRow` (data-table) agar judul hari di Jadwal Ibadah dan Log Aktivitas tidak membuat
    kolom kosong di ponsel.
  - README dan bagian Desain di berkas ini diperbarui.
- **Tahap 9 (Merge) selesai.** `git merge --no-ff` menjadi merge commit `c7855e8` di `main`
  (D10), tanpa konflik. Pohon `main` identik dengan ujung branch yang diuji; typecheck, lint, dan
  build lolos dengan bundel yang sama. Di-push ke `origin/main` bersama catatan merge.
- **Usulan berikutnya** (belum dimulai):
  - perbaikan bug API `LIKE` 50 byte (bagian redesign portal di bawah);
  - `robots.txt`, 401 `/api/auth/me` di konsol portal, dan kode dashboard di bundel utama
    (`session-provider` dimuat statis oleh `main.tsx`);
  - kotak centang kriteria penerimaan di `docs/prd.md`;
  - deploy pertama ke Cloudflare.

### Selesai: skala Portal Publik 90%

Portal desktop (≥1024 px dengan tetikus/trackpad) dibuat tampil 90%, seperti zoom browser 90%;
ponsel, tablet, dan dashboard tetap 100%. Rencana dan keputusan S1–S4 ada di
[docs/rencana-skala-portal-90.md](docs/rencana-skala-portal-90.md). Dikerjakan langsung di `main`
(S4), commit per tahap setelah disetujui.

- **Tahap 1 (skala + kompensasi) selesai.**
  - `zoom: var(--site-zoom)` pada `html.theme-portal`, dengan `--site-zoom: 0.9` di desktop.
  - Tinggi relatif layar (hero, login, jendela galeri) dibagi `--site-zoom` agar tetap setinggi
    semula di layar.
  - `portal-motion.ts` menyamakan `scroll-margin-top` dengan zoom (luncuran jangkar Lenis).
  - Garis ubin unggah tetap 2 px, dan jangkar `/profil#…` diulang setelah font web siap.
- **Tahap 2 (lantai teks) selesai.** `--text-sm` didefinisikan ulang di `.theme-portal`
  (lantai 13 px), token `--site-text-xs` menggantikan `text-[13px]`, dan toast portal ikut.
  Di desktop tidak ada teks di bawah 13 px; ponsel tidak berubah.
  - Ukuran font kecil baru di portal: pakai `text-sm` atau `text-(length:--site-text-xs)`,
    bukan `text-[13px]` atau utilitas bernama seperti `text-site-sm`, karena `cn` menganggapnya
    warna.
- **Tahap 3 (QA & dokumentasi) selesai.**
  - Firefox 150 diuji langsung (WebDriver BiDi) dengan hasil sama seperti Chrome: ukuran,
    luncuran jangkar, parallax, tinggi layar, dan lantai teks.
  - Chrome: inspector 13 halaman setara Tahap 10, navigasi/keyboard/pembaca layar/tema/kurangi
    gerak lolos, tanpa lompatan ukuran saat dimuat, Lighthouse desktop 97–99 (aksesibilitas 100).
  - README bagian Desain diperbarui.
- **Sudah di-push** ke `origin/main` (`14449e0..f2b4ed5`) pada 29 Oktober 2026, atas
  permintaan pengguna sebelum uji Safari.
- **Jarak atas header** dipisah dari jarak tepi: token `--site-header-top` (24 / 32 / 40 px,
  sebelumnya ikut `--site-inset` 32 / 48 / 64 px), atas permintaan pengguna.
- **Menunggu pengguna:** uji Safari macOS dengan daftar di rencana skala bagian 10 (Tahap 3).
  Bila jangkar atau parallax meleset di Safari, perbaikannya memakai pendekatan cadangan R1.
- **Aturan baru untuk kode portal:** tinggi relatif layar ditulis
  `calc(<tinggi>/var(--site-zoom,1))`, bukan `svh`/`vh` langsung.

### Redesign Portal Publik (selesai, 29 Oktober 2026)

**Redesign Portal Publik** dikerjakan di branch `feat/redesign-portal-kage`. Tujuannya memakai
tampilan dan interaksi rancangan [design/stitch/10-portal-publik-kage.html](design/stitch/10-portal-publik-kage.html)
dengan seluruh informasi portal 08. Rencana lengkapnya ada di
[docs/rencana-redesign-portal-kage.md](docs/rencana-redesign-portal-kage.md). Branch ini sudah
di-merge ke `main` lewat merge commit `90e5a7a`.

Keputusan yang sudah dikonfirmasi pengguna (28 Oktober 2026):

- **K1:** footer hanya memakai isi 08. Kontak dan alamat lengkap ditambahkan bila pengurus
  memberikan datanya.
- **K2:** ada tombol tema terang/gelap. Bawaan selalu terang, dan pilihan diingat di
  perangkat. Dashboard tetap terang.
- **K3:** kesembilan halaman tetap ada, dikelompokkan ke lima menu induk: Beranda, Jadwal
  Ibadah, Kabar Jemaat ▾, Pelayanan ▾, Tentang Jemaat ▾. Submenu muncul saat kursor diarahkan,
  juga dengan fokus keyboard dan ketukan.
- **K4:** testimoni, metrik fiktif, dan perbandingan "cara lama" dari Stitch dibuang.
- **K5:** pakai foto gedung yang ada (1254 px) dulu.
- **K6:** merge ke `main` dengan *merge commit* (`--no-ff`).
- **Gerak:** parallax dan gulir halus Lenis wajib di semua halaman portal, dengan nilai persis
  dari manifest kage. Gerak hanya mati saat `prefers-reduced-motion`.

Progres tahap:

- **Tahap 0 (persiapan) selesai.** Database uji portal sudah terisi konten realistis lewat API.
  Baseline inspector portal 08 ada di `.taste-skill/inspect-portal-08-baseline/`. Catatannya di
  rencana bagian 11.
- **Tahap 1 (fondasi) selesai.** Isinya: token `site-*` terang/gelap, mekanisme tema
  (`lib/portal-theme.ts` + skrip anti-kedip), tombol tema, huruf kage, foto responsif di
  `public/images/`, dan primitif di `components/portal/kage/`. Tampilan portal 08 belum
  berubah.
- **Tahap 2 (lapisan gerak) selesai.** `lib/portal-motion.ts` berisi Lenis, parallax hero dan
  foto latar, reveal, dan float. Semuanya dipasang di `PublicLayout`, rukun dengan Radix dan
  tombol Kembali, dan mati saat reduced-motion. Uji kinerja dengan CPU 4× menghasilkan frame
  median 16,7ms.
- **Tahap 3 (kerangka) selesai.** Semua halaman portal memakai header dan footer kage:
  - **Header:** pil melayang yang merapat ke atas saat digulir. Navigasi lima menu induk
    (`portalNav`, Radix NavigationMenu langsung) dengan submenu hover/fokus/ketuk, tombol tema,
    dan menu ponsel bergrup.
  - **Footer:** foto dengan parallax ±420, scrim, dan tepi gerigi.
  - **Variabel shadcn terang** dipetakan ke kage; `--ring` `#C2620A`.
  - Halaman 08 tanpa hero diberi ruang atas lewat `main:not(:has([data-hero]))`. Hero kage
    nanti memasang `data-hero`.
  - Di tema gelap, seksi halaman 08 masih terang sampai halamannya dirombak.
- **Tahap 4 (Beranda) selesai.**
  - Beranda kage berisi semua isi 08: hero foto, papan jadwal, renungan, warta & berita, band
    layanan, lima rayon, galeri, persembahan dengan rekening, dan FAQ sakramen.
  - Perbaikan 08 nomor 2, 3, 4, dan 9 selesai.
  - Komponen baru yang dipakai ulang: `HeroPanel`, `ScheduleBoard`, `SiteSection`,
    `PhotoBand`.
  - Lenis kini menghormati gulir dari keyboard dan bilah gulir saat sedang meluncur.
  - Inspector Beranda: 1 FAIL (baseline 10).
- **Tahap 5 (Jadwal & Warta) selesai.**
  - `/jadwal`: hero ringkas dengan saringan di atas foto, dan papan jadwal dengan semua petugas.
  - `/warta`: warta terbaru dalam panel jendela dengan pratinjau PDF, serta arsip dengan
    pencarian.
  - Kontrol daftar kage baru di `kage/list-controls.tsx` (`PhotoFilterPill`, `SearchField`,
    `SitePager`).
  - `useUrlFilters().update(…, { keepScroll: true })` mencegah halaman portal meloncat ke atas
    saat saringan diganti; dashboard tidak diubah.
- **Tahap 6 (Renungan & Berita) selesai.**
  - Daftar: hero ringkas dengan cari kaca, artikel unggulan, dan kartu.
  - Halaman baca editorial tanpa hero: judul besar, ayat serif miring, Bagikan, dan artikel
    lainnya.
  - Judul tab kini kembali setelah meninggalkan artikel (perbaikan 08 #1).
  - Inspector: daftar 0 FAIL, halaman baca 1 FAIL (K5), Beranda 0 FAIL.
- **Tahap 7 (Galeri & Profil) selesai.**
  - Galeri: hero berlatar foto dokumentasi terbaru, kisi ubin, dan jendela galeri bergaya
    panel jendela. Fokus kini kembali ke ubin setelah jendela ditutup.
  - Profil: sejarah editorial, kartu Visi & Misi, `RayonTable` bersama Beranda, serta kisi
    Pendeta & Majelis.
  - Perbaikan 08 #5 (lampiran Profil) dan #6 (Coba lagi rayon); `/profil#rayon` dari halaman
    lain kini tepat di 96 px.
  - Jangkar di halaman yang sama memakai `Link` (tautan "#…" biasa membuat `ScrollRestoration`
    kembali ke atas), dan penjaga gulir Lenis membiarkan lompatan ke jangkar ditimpa luncuran.
  - Inspector: keduanya 0 FAIL.
- **Tahap 8 (Persembahan & Sakramen) selesai.**
  - Persembahan: kolom QRIS (kartu putih di panel gelap) dan kolom transfer bank dengan bilah
    salin.
  - Sakramen: panel jendela cek status dengan pelacak 5 langkah, formulir tiga jenis dalam kartu
    kanvas, panel sukses gelap, dan FAQ bersama Beranda.
  - Perbaikan 08 #7 (kode baru langsung muncul di chip) dan #8 (tab nikah tidak terpotong di
    ponsel).
  - `html.lenis-scrolling { overflow-anchor: none }`: scroll anchoring tidak lagi menghentikan
    luncuran saat isi berubah tinggi.
  - Inspector: Persembahan 0 FAIL, Sakramen 1 FAIL (`few-pictures`, keputusan K5).
- **Tahap 9 (404, eror, login) selesai.**
  - 404: hero ringkas "Alamat ini / tidak ada." dengan pil "Ke beranda".
  - `RouteErrorPage`: tetap netral, judul dua nada, tombol pil.
  - Login: formulir di kiri, panel foto gereja dengan kartu kaca peran di kanan (ponsel: pita
    foto di atas). Login menyalakan lapisan gerak portal (Lenis, parallax, muncul berurutan).
  - Gaya isian bersama di `kage/field.ts`.
  - Perbaikan bawaan 08: `ScrollRestoration` memakai `getKey`, sehingga muat penuh alamat lain
    tidak lagi mewarisi posisi gulir halaman sebelumnya.
  - Inspector: login 1 FAIL (`few-pictures`, K5), 404 2 FAIL (`few-pictures`, `still-page`).
- **Tahap 10 (Rapikan & QA) selesai.**
  - Sisa 08 dihapus: `parts.tsx`, token `portal-*`, huruf `--font-portal*`, `text-step-*`, kelas
    gerak lama, `Wordmark`, dan `BuiltWell`.
  - Perbaikan dari QA: toast saat Bagikan gagal menyalin, "Lewati ke konten" memindahkan fokus,
    fokus setelah Hapus berkas, dan preload foto hero di semua halaman berfoto gereja.
  - Audit: keadaan eror/memuat/kosong semua halaman (respons API disadap lewat CDP), navigasi
    keyboard dan submenu, pembaca layar dasar, kedua tema, kurangi gerak, 60 fps (median 16,7 ms),
    Lighthouse ponsel (aksesibilitas 100), dan bundel utama 391,4 KB (gzip 122,3 KB).
  - Daftar periksa isi 08 tercentang semua. Hal di luar lingkup dicatat di rencana bagian 11.
- **Tahap 11 (Merge) selesai.** `git merge --no-ff` menjadi merge commit `90e5a7a` di `main`
  (Keputusan K6). Pohon `main` identik dengan ujung branch yang diuji; typecheck, lint, dan build
  lolos dengan bundel yang sama. Sudah di-push ke `origin/main`.
- **Usulan berikutnya** (belum dimulai):
  - perbaikan bug API `LIKE` 50 byte di bawah;
  - perbaikan dashboard yang ditunda sampai redesign selesai (selesai di redesign Zenith,
    Tahap 3 dan 5);
  - hal di luar lingkup redesign yang dicatat di rencana bagian 11 (`robots.txt`, 401
    `/api/auth/me` di portal, kode dashboard di bundel utama).

**Bug API yang ditemukan di Tahap 0** (belum diperbaiki, diusulkan sebagai commit terpisah):

- D1 membatasi pola `LIKE` 50 byte.
- Akibatnya, membuat konten yang alamat otomatisnya ≥49 karakter gagal dengan eror 500
  (`uniqueSlug` di `src/worker/routes/contents.ts`).
- Kata pencarian ≥49 karakter juga memicu eror 500 di semua kotak cari (`containsPattern` di
  `src/worker/lib/request.ts`), termasuk pencarian portal.

### Hasil audit UI/UX (28 Oktober 2026)

Audit dilakukan dengan inspector skill `design-taste-frontend` pada 41 layar, tiga lebar layar,
dan empat peran. Laporannya ada di `.taste-skill/inspect-audit/` (tidak di-commit).

- **Portal Publik:** 12 halaman gagal, dengan 5–10 FAIL per halaman. Penyebabnya: teks bacaan
  14px, banyak teks di bawah 13px, label kecil huruf kapital di atas judul, bayangan pada kartu,
  tidak ada titik fokus di layar pertama, minim foto, dan tanpa gerak. Ada juga temuan khusus:
  - di ponsel, tab "3. Pemberkatan Nikah" di `/layanan-sakramen` terpotong di tepi layar;
  - `/profil` punya ruang kosong besar;
  - `/persembahan` memakai deretan kartu berikon.

  Semua ini ditangani oleh redesign.
- **Dashboard:** 28 layar lolos pengukuran tanpa FAIL. Tiga perbaikan masih tertunda, dikerjakan
  setelah redesign portal:
  1. ~~**Pos Kas & RAPBJ (1280px):** nama mata anggaran terpotong ("P1 Persembah…").~~ Selesai di
     redesign Zenith Tahap 5: Pos Kas pindah ke deret kartu, tabel RAPBJ selebar halaman.
  2. ~~**Transaksi Kas di ponsel:** nama Pos Kas dan mata anggaran terpotong di baris keterangan.~~
     Selesai di Tahap 5: baris keterangan membungkus di bawah 1024 px.
  3. ~~**Ringkasan untuk Bendahara:** blok keuangan baru terlihat setelah digulir.~~ Selesai di
     redesign Zenith Tahap 3: urutan blok menyesuaikan peran.
- **Identitas visual belum seragam:** portal biru tua dengan amber, halaman login biru tua dengan
  judul 118px, dan dashboard *achromatic* dengan crimson. Login ikut diselaraskan dalam redesign.

---

## 3. Stack & arsitektur

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript ~7, Tailwind CSS v4, shadcn/ui (preset `radix-nova`), React Router 8, sonner, lucide-react |
| Backend | Hono 4 di Cloudflare Workers (`src/worker/index.ts`, basePath `/api`) |
| Database | Cloudflare D1 (binding `DB`), migrasi SQL di `migrations/` (0001–0012) |
| Berkas | Cloudflare R2 (binding `FILES`, bucket `gmit-lahairoi-files`) |
| Build/dev | `@cloudflare/vite-plugin`: SPA dan Worker berbagi satu origin, tanpa proxy maupun CORS |
| Lint | oxlint (`.oxlintrc.json`), typecheck `tsc -b` |

Struktur folder:

- `src/client`: SPA React.
  - `pages/public`: halaman portal.
  - `pages/dashboard`: halaman modul dashboard.
  - `components`: komponen per modul; `ui/` berisi shadcn.
  - `lib`: helper API, format, navigasi, dan aturan per modul.
  - `layouts`: `RootLayout`, `PublicLayout`, `DashboardLayout`.
- `src/worker`: API Hono.
  - `routes`: satu file per grup endpoint.
  - `middleware/auth.ts`: `requireAuth`, `requireRole`.
  - `lib`: sesi, password, audit, konten, keuangan, unggahan.
- `src/shared`: tipe dan aturan validasi yang dipakai client dan worker bersama
  (mis. `types.ts`, `analytics.ts`, `sacraments.ts`).
- `scripts/`: `seed.ts` dan `reset-local-db.ts`, dijalankan langsung oleh Node 22.18+.
- `design/stitch/`: referensi desain dari Google Stitch. HTML dan manifest dilacak git; PNG diabaikan.
- `.taste-skill/`: arah desain hasil skill. `direction.json` dilacak; folder `inspect*/` diabaikan.
- `.claude/skills/`: skill desain proyek (`design-taste-frontend`, `ui-ux-pro-max`).
- `.claude/launch.json`: konfigurasi dev server (`npm run dev`, port 5173).

Alias impor: `@/…` mengarah ke `src/client/…` dan `@shared/…` ke `src/shared/…`. Worker memakai
impor relatif.

Rute utama:

- Portal: `/`, `/jadwal`, `/warta`, `/renungan(/:slug)`, `/berita(/:slug)`, `/media`, `/profil`,
  `/persembahan`, `/layanan-sakramen`; `/tentang` dialihkan ke `/profil`.
- Lainnya: `/login` dan `/dashboard/*`.
- Seluruh dashboard dimuat lazy, sehingga pengunjung portal tidak mengunduhnya.
- Daftar rute lengkap ada di README bagian "Rute dan layout".

---

## 4. Peran & hak akses

Menu ditentukan oleh [src/client/lib/navigation.ts](src/client/lib/navigation.ts). Pembatasan
sebenarnya selalu ditegakkan API dengan `requireRole`.

| Modul | Admin | Bendahara | Pendeta | Majelis |
| --- | --- | --- | --- | --- |
| Ringkasan (dashboard eksekutif) | ✓ (+ aktivitas terbaru) | ✓ (tanpa ulang tahun) | ✓ | ✓ |
| Anggota Jemaat, Kartu Keluarga | ✓ | – | ✓ (baca) | ✓ (rayonnya sendiri) |
| Rayon | ✓ | – | – | – |
| Transaksi Kas, Pos Kas & RAPBJ | ✓ | ✓ | baca | baca |
| Laporan Keuangan | ✓ | ✓ | ✓ | ✓ |
| Jadwal Ibadah | ✓ | – | ✓ | lihat + catat kehadiran |
| Layanan Sakramen | ✓ | – | ✓ | – |
| Arsip Surat | ✓ | – | – | – |
| Inventaris | ✓ (hapus aset hanya Admin) | – | – | ✓ |
| Warta & Konten (CMS) | ✓ | – | Renungan Saya | – |
| Akun Pengurus, Log Aktivitas | ✓ | – | – | – |
| Pengaturan > Tampilan (tema Portal Publik) | ✓ | – | – | – |

Catatan keamanan:

- **Sesi:** sesi opaque di D1 (tabel `sessions`, cookie `gmit_session` HttpOnly), berlaku 12 jam
  sejak aktivitas terakhir.
- **Login:** dikunci 15 menit setelah 5 kali gagal, dan ada perlindungan CSRF.
- **Akun nonaktif:** sesinya langsung dihapus oleh trigger.
- **Biaya CPU:** hash PBKDF2-SHA256 100.000 iterasi butuh ±50 ms CPU per login, melebihi batas
  Workers Free. Pakai Workers Paid, atau turunkan iterasinya.

---

## 5. Data

| Migrasi | Tabel |
| --- | --- |
| 0001 | `rayons` (+5 rayon bawaan) |
| 0002 | `users`, `audit_logs` |
| 0003 | `families`, `members` |
| 0004 | `finance_funds`, `finance_budgets`, `finance_transactions` |
| 0005 | `public_contents` (kategori `WARTA`, `DEVOTIONAL`, `NEWS`, `MEDIA`, `PROFILE`, `PAYMENT_INFO`) |
| 0006 | `worship_schedules`, `worship_servants` |
| 0007 | `sacrament_applications`, `mail_archives` |
| 0008 | `assets`, `asset_loans` |
| 0009 | `sessions` |
| 0010 | indeks unik: satu Kepala Keluarga aktif per KK |
| 0011 | jadwal konseling, jam pelaksanaan, mempelai kedua di `sacrament_applications` |
| 0012 | `site_settings`: pengaturan situs per kunci (kini `portal_theme`) |

Konvensi yang wajib diikuti:

- **Nilai dan format:**
  - uang berupa bilangan bulat Rupiah;
  - tanggal `YYYY-MM-DD`, jam `HH:MM`;
  - timestamp di respons API berformat ISO UTC, tetapi ditampilkan dalam zona **WITA**
    (`Asia/Makassar`).
- **CHECK tanggal** ditulis `date(x) IS x`.
- **Kolom turunan** dihitung database:
  - `finance_funds.current_balance` diperbarui oleh trigger (jangan diubah dari aplikasi);
  - `members.is_deceased`;
  - `worship_schedules.attendance_total`.
- **Akun pengguna** tidak dihapus, hanya dinonaktifkan.
- **Perubahan skema** selalu lewat file migrasi baru. Migrasi yang sudah diterapkan jangan diedit.
- **Kode registrasi sakramen:** `BPT-XXXX-XXXX` (baptis), `SDI-…` (sidi), `NKH-…` (nikah).
  Statusnya PENDING, REVISION, COUNSELING, APPROVED, COMPLETED.
- **Berkas unggahan:**
  - masuk ke R2 per folder: `warta`, `konten`, `media`, `liturgi` (publik); `kuitansi`,
    `sakramen`, `surat` (khusus pengurus);
  - jenis JPG/PNG/WebP/PDF, maksimal 10 MB, dan jenisnya diperiksa dari magic bytes.

---

## 6. Desain

### Portal Publik — rancangan "10 kage"

Isi tetap dari portal 08, ditambah tema gelap (bawaan terang) dan navigasi berkelompok
bersubmenu. Rencana, keputusan K1–K6, dan catatan per tahap ada di
[docs/rencana-redesign-portal-kage.md](docs/rencana-redesign-portal-kage.md).

- Rancangannya [design/stitch/10-portal-publik-kage.html](design/stitch/10-portal-publik-kage.html)
  (bahasa desain kage.design Nova). Ciri utamanya:
  - hero panel membulat dengan foto gedung gereja, nav berbentuk pil di atas foto, dan judul
    dua nada (sans tebal + serif miring);
  - papan jadwal gelap bergaya jendela, band fitur di atas foto, dan footer foto bertepi gergaji;
  - parallax dan gulir halus Lenis ([src/client/lib/portal-motion.ts](src/client/lib/portal-motion.ts)),
    mati bila pengguna meminta kurangi gerak.
- Huruf: Plus Jakarta Sans, Instrument Serif *italic*, Inter, JetBrains Mono (Google Fonts di
  `index.html`).
- Token `site-*` ada di `.theme-portal` (terang) dan `.theme-portal.dark` (gelap) di
  [src/client/index.css](src/client/index.css). Komponen bersama ada di
  `src/client/components/portal/kage/`.
- Tema portal dipasang di `<html>` oleh skrip di `index.html` dan `usePortalTheme()`; pilihan
  gelap disimpan di perangkat ([src/client/lib/portal-theme.ts](src/client/lib/portal-theme.ts)).
- Foto: satu foto gedung gereja (Keputusan K5) di `public/images/gereja-gmit-lahairoi-*.webp`
  (640/960/1254 px). Catatan gerak asli ada di [design/stitch/manifest.json](design/stitch/manifest.json).
- **Tema Glassmorphism** (30 Oktober 2026), dipilih Admin di Pengaturan > Tampilan untuk semua
  pengunjung; terang/gelap tetap pilihan pengunjung. Uraian lengkap ada di README bagian
  "Pengaturan tampilan portal".
  - Panel kaca buram di atas latar warna senja Pantai Lasiana (`site-aurora`).
  - Kelas `portal-glass` di `<html>`; komponen memakai varian `glass:` dan utilitas
    `glass-card`, `glass-slab`, `glass-bar`, `glass-bar-behind`, `glass-panel`, `glass-photo`,
    `glass-blur`.
  - Tema bawaan dijaga tetap identik: perbandingan gaya terhitung di 9 halaman, 2 lebar layar,
    terang dan gelap menghasilkan 0 perbedaan.
  - Jebakan: elemen ber-`backdrop-filter` menjadi akar latar bagi isinya. Bilah yang memuat
    menu tarik-turun memakai `glass-bar-behind` (kaca di `::before`).

### Dashboard — gaya Zenith

Dashboard mengikuti Zenith Dashboard (template berlisensi milik pengguna), lewat penerapannya di
proyek HRIS pengguna. Rencana, keputusan D1–D10, dan catatan per tahap ada di
[docs/rencana-redesign-dashboard-zenith.md](docs/rencana-redesign-dashboard-zenith.md).

- **Asal-usul:** komponen ditulis sendiri di atas shadcn/ui. Kode sumber Zenith tidak pernah
  masuk repo, dan demo Zenith tidak direkonstruksi dengan REA; demo hanya acuan tampilan.
- **Tampilan:** palet netral oklch, kanvas putih, tombol utama hitam, garis abu tipis. Crimson
  `--brand` `#b11226` hanya untuk data (D3).
- **Huruf:** Geist (`@fontsource-variable/geist`, OFL), di-host sendiri dan hanya dimuat bundel
  dashboard.
- **Tema:** terang + gelap ([src/client/lib/dashboard-theme.ts](src/client/lib/dashboard-theme.ts)),
  kelas `theme-dashboard` di `<html>`. Gelap hanya di `@media screen`, jadi cetakan selalu terang.
- **Token:** `:root, .theme-dashboard` dan `.theme-dashboard.dark` di
  [src/client/index.css](src/client/index.css). `:root` sekaligus cadangan saat `<html>` tanpa
  kelas tema (mis. halaman eror). Selalu pakai token, jangan kode warna langsung.
- **Komponen** di `src/client/components/zenith/`: `PageHeader`, `KpiCard`, `Panel`, `Donut`,
  `Segmented`, `StatusBadge`, `StatStrip`, `data-table` (`TableCard`, `SearchField`,
  `TablePagination`, `TableMessage`, `SkeletonRows`, `GroupHeaderRow`), `PersonAvatar`, `Stepper`,
  `Sparkline`, `Kbd`.
  Tabel memakai `ui/table`. Lencana status per modul memetakan nada di `lib/*` (mis. `STATUS_TONE`
  di `lib/contents.ts`), bukan kelas warna sendiri.
- **Grafik** dibuat sendiri dengan SVG di `src/client/components/analytics/`; palet crimson + abu
  `--chart-2` `#8a8a8a` divalidasi dengan validator skill `dataviz` untuk kedua tema.
- **Inspector `--app`** membaca `.taste-skill/app/direction.json` (arah dashboard sebelumnya,
  "achromatic ledger") sebagai salinan `.taste-skill/direction.json` di folder kerja lain. Berkas
  itu kini hanya masukan inspector (huruf Geist, aturan layar aplikasi), bukan arah tampilan.

### Referensi lain

`design/stitch/01`–`07` berisi rancangan Stitch untuk modul dashboard. Rancangan ini **tidak
diikuti**: dashboard memakai gaya Zenith. Simpan hanya sebagai referensi isi.

---

## 7. Cara kerja & konvensi

- **Bahasa:** semua komunikasi, UI, komentar kode, dan pesan commit memakai Bahasa Indonesia.
- **Alur tugas:**
  1. Pengguna menempelkan spesifikasi task.
  2. Claude mengimplementasikan dan menguji (API di Worker terisolasi dan D1 scratch; UI di
     browser dan inspector).
  3. Claude menjelaskan "apa yang berubah dan cara memverifikasinya".
  4. Commit **hanya** setelah pengguna menjawab "Ya, commit"; push hanya bila diminta.
- **Pesan commit:**
  - pola `feat(scope): uraian`; scope yang dipakai: `db`, `ui`, `auth`, `api`, `jemaat`,
    `keuangan`, `portal`, `ibadah`, `sakramen`, `surat`, `inventaris`, `analitik`, `dashboard`;
  - prefiks lain: `docs:` dan `chore:`;
  - diakhiri baris `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Git:** tambahkan berkas ke commit secara eksplisit, jangan `git add -A`. Jangan ikutkan
  `.taste-skill/inspect*` atau berkas sementara.
- **UI:**
  - pakai skill proyek `design-taste-frontend` dan `ui-ux-pro-max` (`.claude/skills`), serta
    `dataviz` untuk grafik;
  - periksa dengan inspector di tiga lebar layar.
- **Format kode:** `npx --yes prettier@3 --write --no-semi --single-quote --print-width 100`
  pada berkas yang diubah.
- **Pemeriksaan wajib sebelum selesai:** `npm run typecheck`, `npm run lint`, `npm run build`.
- **Kredensial:** kredensial uji hanya untuk D1 scratch di localhost dan tidak pernah ditulis
  ulang di chat. Kata sandi seed disimpan di berkas folder uji.
- **Gaya kode:** tanpa titik koma, kutip tunggal, komentar singkat berbahasa Indonesia. Aturan
  validasi bersama ditaruh di `src/shared`.
- **Pola backend:**
  - `requireRole(...)`;
  - `auditStatement` di dalam `db.batch`;
  - `createReader` untuk membaca input (`text`, `choice`, `id`, `integer`, `date`);
  - `whereBuilder` dan `readPaging` (maksimal 100 per halaman);
  - `json_each(?1)` untuk daftar di D1.
- **Pola client:**
  - `useApiQuery` (data lama tetap tampil saat memuat ulang), `useUrlFilters` (filter di URL),
    toast sonner;
  - Dialog/DropdownMenu shadcn dan `ConfirmDialog`.

---

## 8. Pengujian

Repo belum punya suite tes otomatis. Pengujian dilakukan per task dengan skrip di folder scratch
sesi, di luar repo:

1. **Build** `npm run build`, lalu jalankan Worker terisolasi di port sendiri:

   ```bash
   npx wrangler dev -c dist/gmit_lahairoi_lasiana/wrangler.json --port <N> --inspector-port <M> --persist-to <folder-uji>/state
   ```

   Worker harus di-restart setiap kali build ulang.
2. **D1 scratch baru:** migrasi + seed `--sample-users`. Kata sandi ditulis ke berkas, tidak
   dicetak. Akun contoh: `admin`, `bendahara`, `pendeta`, `majelis.golgota`.
3. **Uji API:** skrip Node `fetch` dengan cookie sesi. Uji UI: browser pane dan inspector.
4. **Dashboard di inspector:** lewat `session-proxy.mjs`, proxy lokal yang menyisipkan cookie
   sesi akun uji.

   ```bash
   CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
     node .claude/skills/design-taste-frontend/scripts/inspect.mjs <url> [--app] --widths 1280,820,390 --out .taste-skill/inspect-<nama>
   ```

   Pakai `--app` untuk dashboard. Portal memakai mode halaman dengan lebar `1440,768,390`.
5. **Data contoh:**
   - database uji gabungan untuk audit berisi ±180 jiwa, 541 jadwal ibadah 2025–2026, kas
     bulanan, 25 konten portal, 6 pendaftaran sakramen, 6 surat, dan 9 aset + 8 peminjaman;
   - dibuat dengan menggabungkan beberapa D1 scratch dan generator `seed-dashboard.mjs`.
6. **Bersih-bersih:** hentikan semua proses Worker, proxy, dan Chrome headless setelah selesai,
   lalu pastikan port-nya bebas.

Hasil pengujian terakhir:

| Area | Hasil |
| --- | --- |
| API inventaris | 58/58 |
| API analitik | 51/51 |
| Inspector dashboard | 0 FAIL |
| Inspector portal kage (13 halaman) | 6 halaman 0 FAIL; sisanya `few-pictures` (K5), ditambah `off-centre` di Jadwal 390 px dan `still-page` di halaman baca berita dan 404 |
| QA portal kage (Tahap 10) | Keadaan eror/memuat/kosong, keyboard, pembaca layar dasar, kedua tema, kurangi gerak, 60 fps, Lighthouse aksesibilitas 100 |

---

## 9. Menjalankan & deploy

```bash
npm install
npm run db:migrate:local
npm run db:seed:local -- --sample-users   # akun contoh hanya untuk lokal
npm run dev                               # http://localhost:5173
```

Sebelum deploy pertama:

1. `npx wrangler login`
2. `npx wrangler d1 create gmit-lahairoi-db`, lalu isi `database_id` di `wrangler.toml`.
3. `npx wrangler r2 bucket create gmit-lahairoi-files`
4. `npm run cf-typegen`
5. `npm run db:migrate:remote`
6. `npm run db:seed:remote`
7. `npm run deploy`

---

## 10. Catatan teknis & jebakan

- **Windows:**
  - jika Chrome gagal diluncurkan oleh inspector, set `CHROME_PATH` ke Chrome atau `msedge.exe`;
  - Git memakai autocrlf; tulis berkas teks dengan LF.
- **Proses tertinggal:** Chrome headless dari inspector yang dihentikan paksa bisa tertinggal dan
  mengunci folder. Hentikan proses dengan `--user-data-dir=...ad-chrome-*`.
- **Build:** Vite memberi peringatan `INEFFECTIVE_DYNAMIC_IMPORT` untuk `session-provider.tsx`.
  Peringatan ini tidak berbahaya.
- **Komponen shadcn yang sudah disesuaikan** (periksa ulang bila ditimpa CLI):
  - breakpoint sidebar di `lg` (1024px);
  - overlay sheet tanpa blur;
  - teks aksesibilitas berbahasa Indonesia.
- **oxlint:** `only-export-components` memperingatkan file komponen yang juga mengekspor helper.
  Pindahkan helper ke `lib/`.
- **Analitik:**
  - minggu dihitung Minggu–Sabtu (`date(x, '-6 days', 'weekday 0')`);
  - ulang tahun 29 Februari dirayakan 28 Februari di tahun non-kabisat.
- **Respons `/api/public/*`** memakai `Cache-Control: public, max-age=60`.

---

## 11. Pertanyaan terbuka & keputusan yang menunggu

- **Data gereja untuk footer/kontak portal** (menunggu data dari pengurus): alamat lengkap,
  email, telepon, WhatsApp, jam kantor Tata Usaha, dan klasis. Sampai data itu ada, footer hanya
  memuat "Lasiana, Kota Kupang, Nusa Tenggara Timur" (K1).
- **Foto** (menunggu dari pengurus): saat ini hanya ada satu foto gedung gereja (1254 px
  persegi). Foto ≥2400 px dan foto kegiatan akan memperkuat portal (K5).
- **Perbaikan dashboard yang tertunda:** tiga butir di bagian 2, dikerjakan setelah redesign
  portal.

---

## 12. Berkas penting

| Berkas | Isi |
| --- | --- |
| [README.md](README.md) | Dokumentasi teknis lengkap per modul + daftar endpoint |
| [docs/prd.md](docs/prd.md) | PRD: fitur, kriteria penerimaan, model data, alur pengguna |
| [docs/rencana-redesign-portal-kage.md](docs/rencana-redesign-portal-kage.md) | Rencana implementasi redesign portal |
| [docs/rencana-redesign-dashboard-zenith.md](docs/rencana-redesign-dashboard-zenith.md) | Rencana, keputusan D1–D10, dan catatan per tahap redesign dashboard Zenith |
| [src/client/components/zenith/](src/client/components/zenith) | Komponen dashboard bergaya Zenith |
| [src/client/router.tsx](src/client/router.tsx) | Semua rute |
| [src/client/lib/navigation.ts](src/client/lib/navigation.ts) | Tautan portal, menu dashboard per peran |
| [src/client/index.css](src/client/index.css) | Token tema dashboard (`:root, .theme-dashboard`, `.theme-dashboard.dark`) dan portal (`.theme-portal`, `.theme-portal.dark`) |
| [src/worker/index.ts](src/worker/index.ts) | Pendaftaran semua route API |
| [src/shared/types.ts](src/shared/types.ts) | Tipe data bersama |
| [design/stitch/manifest.json](design/stitch/manifest.json) | Daftar rancangan Stitch + catatan gerak portal kage |

---

## 13. Riwayat commit `main`

| Commit | Tanggal | Pesan |
| --- | --- | --- |
| `5c185e9` | 2026-10-27 | chore: inisialisasi proyek React, Hono, dan Cloudflare D1 |
| `7a1702b` | 2026-10-27 | chore: tambahkan skill desain UI/UX untuk Claude Code |
| `43defa2` | 2026-10-27 | feat(db): skema migrasi D1 untuk 15 tabel dan seed data awal |
| `d0bd9ce` | 2026-10-27 | feat(ui): kerangka layout portal & dashboard, helper API, dan unggah R2 |
| `cdd6ac2` | 2026-10-28 | feat(auth): API autentikasi, sesi cookie, middleware RBAC, dan form login |
| `0f383b8` | 2026-10-28 | feat(api): helper Log Aktivitas otomatis dan API manajemen akun pengurus |
| `af3435f` | 2026-10-28 | feat(ui): halaman login, Akun Pengurus, dan Log Aktivitas di dashboard |
| `89f6d1f` | 2026-10-28 | feat(api): CRUD Rayon, Kartu Keluarga, dan Anggota Jemaat dengan filter kombinasi |
| `b85740f` | 2026-10-28 | feat(ui): halaman Kartu Keluarga, Anggota Jemaat, dan Rayon |
| `27a2288` | 2026-10-28 | feat(jemaat): impor & ekspor data jemaat Excel/CSV dengan pratinjau validasi |
| `baeb008` | 2026-10-28 | feat(api): Pos Kas, mata anggaran RAPBJ, dan transaksi kas masuk/keluar |
| `72c1ed6` | 2026-10-28 | feat(ui): halaman Pos Kas & RAPBJ dan Transaksi Kas dengan kuitansi |
| `f541667` | 2026-10-28 | feat(keuangan): laporan keuangan per Pos Kas siap cetak Warta Jemaat |
| `edc6108` | 2026-10-28 | feat(api): CMS konten Portal Publik dan beranda /api/public |
| `ea6a3ab` | 2026-10-28 | feat(ui): CMS Warta & Konten di dashboard dan Renungan Saya untuk Pendeta |
| `72b9d84` | 2026-10-28 | docs: simpan referensi desain Stitch untuk 8 modul dan portal publik baru |
| `94151f1` | 2026-10-28 | feat(portal): Beranda, Profil & Sejarah, dan Persembahan bergaya rancangan 08 |
| `61c862e` | 2026-10-28 | docs: foto gereja di hero dan parallax ala runnova.ai pada desain portal |
| `1396068` | 2026-10-28 | docs: foto gereja di band fitur dan footer desain portal, parallax diperkuat |
| `cdede70` | 2026-10-28 | docs: parallax band fitur dan footer lebih kuat, overlay yang hilang diperbaiki |
| `8448961` | 2026-10-28 | feat(portal): Papan Jadwal Ibadah, Warta PDF, Renungan, Berita, dan Galeri Media |
| `5fae4c3` | 2026-10-28 | feat(ibadah): API jadwal ibadah, penugasan pelayan dengan deteksi bentrok, dan kehadiran |
| `2042c4b` | 2026-10-28 | feat(ibadah): halaman Jadwal Ibadah, petugas, tata ibadah, dan absensi di dashboard |
| `b0e032a` | 2026-10-28 | docs: smooth scroll Lenis ala runnova.ai pada desain portal |
| `5ec95f8` | 2026-10-28 | feat(sakramen): API pendaftaran sakramen online, lacak status, dan verifikasi pastoral |
| `bf8c0e5` | 2026-10-28 | feat(portal): formulir pendaftaran sakramen online dan cek status di /layanan-sakramen |
| `ed12c4c` | 2026-10-28 | feat(sakramen): dashboard verifikasi, buku induk, dan cetak sertifikat 2 mode |
| `c1f84d8` | 2026-10-28 | feat(surat): API dan halaman Buku Agenda Surat Masuk & Keluar |
| `6c926b4` | 2026-10-28 | feat(inventaris): API katalog aset dan log peminjaman barang |
| `841e79c` | 2026-10-28 | feat(inventaris): halaman katalog inventaris dan peminjaman barang |
| `cdf6930` | 2026-10-28 | feat(analitik): API agregasi dashboard eksekutif |
| `f88480c` | 2026-10-28 | feat(dashboard): dashboard eksekutif dan widget ulang tahun di /dashboard |
| `238c4cf` | 2026-10-28 | docs: rencana redesign portal kage dan konteks proyek |
| `ed6e4ab` | 2026-10-28 | docs: catatan Tahap 0 redesign portal (data uji dan baseline 08) |
| `987b4c8` | 2026-10-28 | feat(portal): fondasi redesign kage, token terang/gelap dan primitif |
| `d933913` | 2026-10-29 | feat(portal): lapisan gerak Lenis, parallax, reveal, dan float |
| `587102e` | 2026-10-29 | feat(portal): kerangka kage, header bernavigasi bergrup dan footer foto |
| `eb019e4` | 2026-10-29 | feat(portal): Beranda kage dengan seluruh isi Beranda 08 |
| `095ad49` | 2026-10-29 | feat(portal): Jadwal Ibadah dan Warta Jemaat bergaya kage |
| `bb884af` | 2026-10-29 | feat(portal): Renungan dan Berita bergaya kage, daftar dan halaman baca |
| `cfa5b04` | 2026-10-29 | feat(portal): Galeri dan Profil bergaya kage, jangkar halaman diperbaiki |
| `6ae0f8f` | 2026-10-29 | feat(portal): Persembahan dan Layanan Sakramen bergaya kage |
| `0cebfd8` | 2026-10-29 | feat(portal): 404, halaman eror, dan login bergaya kage |
| `8030acd` | 2026-10-29 | chore(portal): rapikan sisa 08 dan QA akhir redesign kage |
| `90e5a7a` | 2026-10-29 | Merge branch 'feat/redesign-portal-kage': redesign Portal Publik bergaya kage |
| `2396a6a` | 2026-10-29 | docs: catat merge redesign Portal Publik kage |
| `14449e0` | 2026-10-29 | docs: catat redesign Portal Publik sudah di-push |
| `56008be` | 2026-10-29 | feat(portal): skala Portal Publik 90% di desktop |
| `3349aa1` | 2026-10-29 | feat(portal): lantai teks 13 px untuk skala 90% |
| `f2b4ed5` | 2026-10-29 | docs: QA dan dokumentasi skala Portal Publik 90% |
| `3eada99` | 2026-10-29 | docs: catat skala Portal Publik 90% sudah di-push |
| `5c16a38` | 2026-10-29 | feat(portal): rapatkan jarak navigasi dari atas halaman |
| `6caf0de` | 2026-10-29 | docs: rencana redesign dashboard bergaya Zenith (Tahap 0) |
| `d6cc46e` | 2026-10-29 | feat(dashboard): fondasi tema Zenith (Tahap 1) |
| `3301a50` | 2026-10-29 | feat(dashboard): kerangka bergaya Zenith (Tahap 2) |
| `2cc976b` | 2026-10-29 | feat(dashboard): Ringkasan bergaya Zenith (Tahap 3) |
| `97b744e` | 2026-10-29 | feat(dashboard): modul Jemaat bergaya Zenith (Tahap 4) |
| `7b75061` | 2026-10-29 | feat(dashboard): modul Keuangan bergaya Zenith (Tahap 5) |
| `f88296b` | 2026-10-29 | feat(dashboard): modul Pelayanan bergaya Zenith (Tahap 6) |
| `59103b2` | 2026-10-29 | feat(dashboard): modul Konten & Administrasi bergaya Zenith (Tahap 7) |
| `bfac603` | 2026-10-29 | chore(dashboard): rapikan sisa gaya lama dan audit akhir (Tahap 8) |
| `c7855e8` | 2026-10-29 | Merge branch 'feat/redesign-dashboard-zenith': redesign dashboard bergaya Zenith |
