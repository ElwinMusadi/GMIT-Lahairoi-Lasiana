# Rencana Implementasi — Redesign Portal Publik "Kage × 08"

> **Branch:** `feat/redesign-portal-kage` (dari `main` @ `f88480c`). Di-merge ke `main` setelah
> semua tahap selesai dan lolos pemeriksaan akhir.
> **Status:** rencana disetujui. Keputusan K1–K6 dikonfirmasi pengguna pada 28 Oktober 2026
> (bagian 9). Belum ada kode yang diubah.

## 1. Tujuan

Portal Publik memakai **tampilan dan interaksi** rancangan
[design/stitch/10-portal-publik-kage.html](../design/stitch/10-portal-publik-kage.html), tetapi
**seluruh informasi dan fitur** tetap dari portal 08 yang berjalan sekarang. Tidak ada yang hilang:
tiap informasi, saringan, tombol, formulir, dan keadaan kosong/eror di 08 punya tempat di desain
baru.

Selesai berarti:

1. Kesebelas halaman portal (`/`, `/jadwal`, `/warta`, `/renungan`, `/renungan/:slug`, `/berita`,
   `/berita/:slug`, `/media`, `/profil`, `/persembahan`, `/layanan-sakramen`), halaman 404,
   halaman eror rute, dan `/login` memakai bahasa desain kage.
2. **Daftar periksa isi** (bagian 6) tercentang semua: setiap butir isi 08 ada dan berfungsi.
3. Inspector di 1440/768/390 px tanpa FAIL di luar pengecualian tertulis (bagian 8). Tidak ada
   gulir menyamping di ponsel.
4. **Parallax dan gulir halus Lenis** aktif di semua halaman portal dengan nilai dari manifest
   kage (bagian 3.4). Keduanya hanya mati bila pengunjung meminta `prefers-reduced-motion`.
5. **Tema terang dan gelap.** Tombol tema ada di header. Tema bawaan selalu terang, dan pilihan
   pengunjung diingat. Setiap halaman lolos pemeriksaan di kedua tema (Keputusan K2).
6. **Navigasi berkelompok** dengan submenu yang muncul saat kursor diarahkan ke menu induk,
   juga saat fokus keyboard dan sentuhan. Kesembilan halaman tetap terjangkau (Keputusan K3).
7. `npm run typecheck`, `npm run lint`, dan `npm run build` bersih. Dashboard tidak berubah.
8. README bagian Desain dan `KONTEKS_PROJECT.md` diperbarui. Branch di-merge ke `main`.

**Di luar cakupan:**

- perubahan API dan skema database;
- dashboard, termasuk tema gelap dashboard (tiga perbaikan dashboard dikerjakan sesudah
  redesign ini).

## 2. Prinsip

1. **Bentuk dari kage, isi dari 08.** Komposisi, tipografi, warna, dan gerak mengikuti kage.
   Teks, data, dan fitur mengikuti 08 dan API yang ada.
2. **Tidak ada isi karangan.** Bagian kage yang isinya contoh fiktif diganti isi nyata dari 08
   atau dibuang:
   - testimoni "Suara jemaat" dengan bintang lima;
   - metrik "600 kursi gedung ber-AC";
   - nama pendeta, alamat rumah, dan RT di papan jadwal;
   - kontak (email, telepon, WA) dan alamat lengkap di footer;
   - nomor rekening contoh;
   - kisah "Tanpa portal / Dengan portal" dan tabel "cara lama".

   Data gereja yang belum ada di sistem (kontak, alamat lengkap) hanya tampil bila pengurus
   memberikannya (Keputusan K1).
3. **Satu sumber data.** Semua isi berasal dari endpoint yang sudah ada:
   - `/api/public/home`, `/api/public/contents(/:slug)`, `/api/public/worships`;
   - `/api/rayons`, `/api/public/sacraments/*`.

   Hook dan helper di `src/client/lib/portal.ts`, `contents.ts`, `sacraments.ts`, dan
   `worship.ts` dipakai ulang. Logika bisnis dan validasi tidak ditulis ulang.
4. **Ponsel lebih dulu.** Jemaat membuka portal dari ponsel (PRD). Setiap komposisi kage diberi
   versi 390 px yang dirancang, bukan sekadar ditumpuk.
5. **Mudah dibaca.**
   - Teks bacaan 16–18 px dengan panjang baris 60–70 karakter.
   - Tidak ada teks yang harus dibaca di bawah 13 px. Label mono kage dinaikkan ke ≥13 px.
   - Kontras teks di atas foto dijaga oleh scrim.
6. **Gerak adalah bagian dari desain.**
   - Parallax dan Lenis wajib ada di semua halaman portal, bukan hanya Beranda.
   - Gerak hanya memakai `transform` dan `opacity`.
   - Isi tetap lengkap dan terbaca bila JavaScript gerak gagal dimuat atau pengunjung memilih
     kurangi gerak.
7. **Dashboard tidak tersentuh.**
   - Token baru hanya berlaku di bawah `.theme-portal`.
   - Lenis hanya hidup di `PublicLayout`.
   - Bundle dashboard tetap lazy.

## 3. Bahasa desain kage → token proyek

### 3.1 Warna (prefiks token `site-`, di `@theme` [src/client/index.css](../src/client/index.css))

| Token | Nilai | Peran di kage |
| --- | --- | --- |
| `site-night` | `#07151A` | Teal gelap: dasar hero, kartu "dengan portal", footer, scrim foto |
| `site-panel` | `#111113` | Panel gelap: papan jadwal, panel persembahan, tombol utama, pil aktif |
| `site-panel-2` | `#1C1C1E` | Bilah input gelap (nomor rekening) |
| `site-accent` | `#F08A2B` | Aksen jingga: jam ibadah, titik aktif, penanda; **bukan** untuk teks panjang |
| `site-green` | `#355A3A` | Sorotan "rayon Anda" |
| `site-paper` | `#F6F6F4` | Permukaan putih tulang (seksi selang-seling, kartu terang) |
| `site-rule` | `#E7E7E7` | Garis tabel dan tepi kartu terang |
| `site-muted` | `#6B6B6B` | Teks sekunder dan baris kedua judul (serif) |
| `site-blue` | `#00236f` | Biru editorial (sama dengan biru 08): penekanan serif dan tautan |
| `white` / `site-ink` | `#FFFFFF` / `#111113` | Kanvas dan teks utama |

Variabel shadcn di `.theme-portal` (`--primary`, `--ring`, `--border`, …) dipetakan ulang ke nilai
di atas agar dialog, sheet, input, dan tombol shadcn ikut gaya kage. Contohnya `--primary` menjadi
`#111113`. `--ring` menjadi jingga tua `#C2620A` (4,2:1 di putih), karena jingga kage `#F08A2B`
hanya 2,5:1 di putih, terlalu pucat untuk penanda fokus. Di tema gelap `--ring` tetap `#F08A2B`.

Kontras dihitung dengan rumus WCAG:

| Pasangan | Kontras |
| --- | --- |
| `site-muted` di atas putih | 5,3:1 |
| `site-muted` di atas `site-paper` | 4,9:1 |
| `site-blue` di atas putih | 14,3:1 |
| aksen jingga di atas `site-panel` | 7,5:1 |
| aksen jingga di atas putih | 2,5:1 |

Karena itu, **di tema terang aksen jingga tidak dipakai sebagai warna teks**. Jingga hanya untuk
titik, garis, dan teks di atas panel gelap.

### 3.1a Tema gelap (Keputusan K2)

Tema gelap memakai token yang sama dengan nilai lain, sehingga komponen tidak perlu dua set kelas.
Nilai di bawah ini usulan; kontrasnya sudah dihitung dan akan divalidasi ulang di Tahap 1.

| Token | Terang | Gelap | Kontras teks di tema gelap |
| --- | --- | --- | --- |
| kanvas (`--background`) | `#FFFFFF` | `#0A1215` | – |
| `site-paper` (permukaan naik) | `#F6F6F4` | `#111B1F` | – |
| `site-ink` (teks utama) | `#111113` | `#F2F2EE` | 16,9:1 di kanvas |
| `site-muted` | `#6B6B6B` | `#9BA5A8` | 7,5:1 di kanvas; 7,0:1 di permukaan |
| `site-rule` | `#E7E7E7` | `#24323A` | garis, bukan teks |
| `site-blue` (penekanan serif) | `#00236f` | `#A9B9FF` | 10,0:1 |
| `site-accent` | `#F08A2B` | `#F08A2B` | 7,5:1 (di tema gelap boleh untuk teks) |
| `site-green` | `#355A3A` | `#6E9C76` | – |
| `site-panel` / `site-night` | tetap | tetap; panel diberi tepi `white/10` agar terpisah dari kanvas | – |

**Yang tidak ikut menggelap:**

- foto dan scrim-nya;
- kartu QRIS: tetap putih agar mudah dipindai;
- pratinjau PDF warta;
- logo bank atau gambar dari CMS.

**Mekanisme:**

- Kelas `dark` dipasang bersama `theme-portal` di `<html>`. Proyek sudah punya
  `@custom-variant dark` di `index.css`, jadi komponen shadcn ikut. Token gelap ditulis di blok
  `.theme-portal.dark { … }`.
- **Bawaan selalu terang.** Tema gelap hanya aktif bila pengunjung memilihnya, bukan mengikuti
  setelan OS.
- Pilihan disimpan di `localStorage` (kunci `gmit-lahairoi:tema-portal`), dibungkus `try/catch`.
  Bila penyimpanan diblokir, halaman tetap terang.
- Skrip pendek di `index.html` memasang kelas sebelum React dimuat, supaya warna tidak berkedip.
  Skrip yang ada sekarang (tema portal) diperluas.
- Kelas `dark` dilepas saat masuk `/dashboard`, karena dashboard hanya punya tema terang.
- `/login` mengikuti pilihan tema portal.
- `<meta name="color-scheme">` dan `theme-color` disesuaikan dengan tema aktif.

### 3.2 Huruf

| Token | Huruf | Pemakaian |
| --- | --- | --- |
| `font-site-display` | Plus Jakarta Sans 600/700/800 | Judul, nama layanan, tombol |
| `font-site-serif` | Instrument Serif *italic* | Baris kedua judul dua nada, kutipan ayat, angka besar dekoratif |
| `font-site-body` | Inter 400/500 | Teks bacaan, formulir |
| `font-site-mono` | JetBrains Mono 400/500 | Jam, tanggal ringkas, kode registrasi, nomor rekening, label bilah jendela |

- Dimuat dari Google Fonts di `index.html` dengan `display=swap`, dan hanya bobot yang dipakai.
- Roundo milik dashboard tidak berubah.
- Plus Jakarta Sans dan Inter sudah dimuat; Instrument Serif dan JetBrains Mono ditambahkan.

### 3.3 Bentuk, jarak, bayangan

- **Radius:** pil 999 px; kartu 16–20 px; panel 24 px; panel persembahan 32 px.
- **Bayangan:**
  - `shadow-panel` (`0 32px 72px -16px rgb(0 0 0/.4)`): hanya hero dan panel gelap besar;
  - `shadow-broad`: kartu gelap di atas putih;
  - kartu terang tanpa bayangan, cukup tepi `site-rule`.
- **Ritme vertikal:** seksi `py-[140px]` di desktop, `py-20` di ponsel; lebar isi maksimal
  1180 px; teks pengantar maksimal 60ch.
- **Judul dua nada:** baris 1 sans 800 tracking −0,03em; baris 2 serif italic `site-muted`.
  - Ukuran: 60 px untuk seksi, 84 px untuk hero; 36–40 px di ponsel.
  - Komponen `TwoToneHeading` menjaga semantik satu `<h1>`/`<h2>`.

### 3.4 Gerak (dari [manifest.json](../design/stitch/manifest.json)) — wajib di semua halaman

Nilainya disalin persis dari rancangan kage, di desktop maupun ponsel.

| Gerak | Rincian | Dipakai di |
| --- | --- | --- |
| **Gulir halus Lenis** | `lenis` dari npm (rancangan memakai 1.3.11 lewat CDN; proyek memakai versi npm terbaru 1.3.x). Konfigurasi persis runnova.ai: `duration 1.1`, easing `t => min(1, 1.001 − 2^(−10t))`, `orientation 'vertical'`, `smoothWheel true`, `wheelMultiplier 1`, `touchMultiplier 1.5`, `anchors true`, loop rAF manual | Semua halaman portal (di `PublicLayout`) |
| **Parallax hero** | Foto `translateY 0→28%` dan `scale 1.02→1.15`; judul `translateY 0→10%` dan `opacity 1→0.15`; offset `["start start", "end start"]` | Hero Beranda dan hero ringkas semua halaman dalam |
| **Parallax foto latar** | Foto di-*pan* setinggi aslinya tanpa zoom: band ±340 px, footer ±420 px, kecepatan relatif ≈0,4; `min-height = 100% + 2×travel` agar tak ada celah; offset `["start end", "end start"]` | Band layanan di Beranda; footer di semua halaman; panel foto login |
| **Muncul (reveal)** | `[data-reveal]` naik 25 px dan memudar 0,6 s, sekali, `rootMargin −80px`; elemen yang sudah terlewati (lompatan jangkar) langsung tampil | Judul seksi dan kartu di semua halaman |
| **Melayang (float)** | Bergeser ±25–35 px mengikuti gulir (`data-float="a,b"`) | Panel jendela kecil warta dan chip tanggal di kartu berita (Beranda); chip kode tersimpan dan panel hasil (Sakramen) |

**Catatan Lenis di ponsel:**

- Seperti di rancangan, `syncTouch` tidak dinyalakan. Gulir sentuh tetap gulir asli ponsel
  (paling nyaman dan hemat baterai). Lenis tetap mengatur tautan jangkar dan memancarkan event
  gulir untuk parallax.
- Parallax tetap jalan di ponsel dengan nilai yang sama. Nilainya hanya disesuaikan bila uji
  kinerja di Tahap 2 menunjukkan patah-patah. Bila itu terjadi, penyesuaiannya dicatat di sini
  dan dilaporkan.

Semua gerak mati bila `prefers-reduced-motion: reduce` (sesuai rancangan). Isi tetap terlihat
bila IntersectionObserver tidak ada.

## 4. Arsitektur komponen

```text
src/client/
├── layouts/PublicLayout.tsx          # + SmoothScroll provider, header varian overlay/solid
├── lib/portal-motion.ts              # useLenis, useReveal, useParallax, useFloat (rAF, satu listener)
├── lib/portal-theme.ts               # diperluas: tema terang/gelap, simpan pilihan, lepas di dashboard
├── lib/navigation.ts                 # portalNav (menu induk & submenu), portalNavLinks, activePortalLink; dipakai header dan footer
└── components/portal/
    ├── site-header.tsx               # ditulis ulang: pil merek, pil nav bersubmenu, tombol tema, pil Masuk; menu ponsel (Sheet)
    ├── nav-menu.tsx                  # pil navigasi desktop: Radix NavigationMenu langsung, menu induk + panel submenu (hover, fokus, klik)
    ├── theme-toggle.tsx              # tombol ☼/☾ terang–gelap
    ├── site-footer.tsx               # ditulis ulang: foto + tepi gergaji, kolom tautan, legal
    ├── parts.tsx                     # diganti primitif kage (di bawah); bagian 08 dihapus di tahap akhir
    ├── worship-card.tsx              # diganti baris papan jadwal
    └── kage/                         # primitif bahasa desain baru
        ├── hero-panel.tsx            # panel membulat + foto + scrim + parallax; varian penuh (Beranda) & ringkas (halaman dalam)
        ├── two-tone-heading.tsx      # judul sans + serif italic
        ├── pill.tsx                  # PillLink/PillButton (putih, gelap, kaca)
        ├── window-panel.tsx          # panel gelap bergaya jendela: 3 titik, judul mono, badge, bilah bawah
        ├── schedule-board.tsx        # baris jadwal dikelompokkan per hari (dipakai Beranda & /jadwal)
        ├── photo-band.tsx            # band selebar layar di atas foto + kartu tembus pandang bernomor
        ├── ledger-table.tsx          # tabel lapang bergaris tipis (rayon, arsip)
        ├── copy-bar.tsx              # bilah mono gelap + tombol salin (rekening, kode registrasi)
        ├── faq-accordion.tsx         # FAQ (Radix Accordion langsung, gaya kage)
        └── reveal.tsx                # <Reveal> pembungkus data-reveal
```

**Aturan integrasi:**

- **Lenis dan React Router:**
  - Lenis dibuat sekali di `PublicLayout` dan dihancurkan saat pindah ke dashboard atau login.
  - Saat rute berganti, panggil `lenis.scrollTo(0, { immediate: true })`. `ScrollRestoration`
    di `RootLayout` tetap dipakai untuk tombol Kembali, lalu `lenis.resize()`.
- **Radix (Sheet menu, Dialog galeri):** konten yang bisa digulir diberi `data-lenis-prevent`.
  Saat dialog terbuka panggil `lenis.stop()`, dan `lenis.start()` saat ditutup.
- **Parallax:** satu listener `scroll` (pasif) dan satu `requestAnimationFrame` untuk semua
  elemen. Elemen didaftarkan lewat ref, tanpa `querySelectorAll` global. Lenis memancarkan event
  `scroll` asli, jadi parallax mengikuti gulir halus.
- **Submenu navigasi** memakai Radix NavigationMenu:
  - Terbuka saat kursor diarahkan (dengan jeda tutup ±150 ms agar tidak berkedip saat kursor
    melintas ke panel), saat fokus keyboard, dan saat ketuk/klik untuk layar sentuh.
  - Esc menutup; panah kiri/kanan berpindah menu induk; `aria-expanded` dikelola Radix.
  - Panel submenu diberi `data-lenis-prevent` bila bisa digulir.
- **Tema:** `theme-toggle.tsx` memanggil `setPortalTheme('light' | 'dark')`. Fungsi itu mengganti
  kelas `dark` di `<html>`, menyimpan pilihan, dan memperbarui `theme-color`. Label tombol:
  "Ganti ke tema gelap" / "Ganti ke tema terang", dengan `aria-pressed`.
- **Foto:**
  - `gereja-gmit-lahairoi.webp` disalin ke `public/images/` dalam beberapa lebar (640, 1254)
    lewat `srcset`;
  - foto hero di-*preload* hanya di Beranda;
  - halaman dalam memakai `loading="lazy"` kecuali hero.

## 5. Peta isi per halaman

Kolom "Slot kage" merujuk bagian di `10-portal-publik-kage.html`, dan kolom "Isi" merujuk portal
08. Teks bertanda kutip diambil apa adanya dari 08, kecuali ditandai *usulan*. Teks usulan adalah
judul dua nada baru yang tidak memuat klaim atau angka. Semua saringan, keadaan kosong, eror,
dan tombol 08 dibawa utuh; rinciannya di daftar periksa (bagian 6).

### 5.0 Pola bersama

- **Header.**
  - Di atas hero, header berupa pil-pil di atas foto:
    - pil merek: cincin sumur + "GMIT Lahairoi";
    - pil navigasi berkelompok (lihat di bawah);
    - tombol tema bundar (☼ di tema terang, ☾ di tema gelap);
    - pil gelap "Masuk Pengurus →" ke `/login`.
  - Setelah hero lewat, pil navigasi menempel di atas (putih 95 %, *backdrop blur*; di tema
    gelap memakai `site-paper` gelap 95 %). Dengan begitu navigasi tetap tersedia seperti header
    08 yang menempel.
- **Navigasi berkelompok (Keputusan K3).** Lima menu induk, sama jumlahnya dengan pil kage.
  Kesembilan halaman 08 tetap terjangkau, ditambah tiga tautan jangkar yang dulu hanya ada di
  footer.

  | Menu induk | Jenis | Isi submenu (judul · keterangan singkat dari pengantar 08) |
  | --- | --- | --- |
  | **Beranda** | tautan langsung `/` | – |
  | **Jadwal Ibadah** | tautan langsung `/jadwal` | – (halaman paling sering dibuka; tidak disembunyikan di submenu) |
  | **Kabar Jemaat ▾** | submenu | Warta Jemaat `/warta` · "Warta mingguan lengkap dalam PDF"<br>Renungan `/renungan` · "Renungan harian dan pembinaan iman"<br>Berita & Pengumuman `/berita` · "Kegiatan, dukacita, informasi pelayanan"<br>Galeri Kegiatan `/media` · "Foto dan video dokumentasi" |
  | **Pelayanan ▾** | submenu | Layanan Sakramen `/layanan-sakramen` · "Daftar baptis, sidi, dan nikah tanpa akun"<br>Cek Status Pendaftaran `/layanan-sakramen#cek-status` · "Lacak berkas dengan kode registrasi"<br>Persembahan `/persembahan` · "QRIS dan rekening tiap pos kas" |
  | **Tentang Jemaat ▾** | submenu | Profil & Sejarah `/profil` · "Sejarah, visi dan misi"<br>Lima Rayon Pelayanan `/profil#rayon` · "Wilayah dan koordinator rayon"<br>Pendeta & Majelis `/profil#majelis` · "Pelayan jemaat periode berjalan" |

  Perilaku navigasi:
  - **Submenu muncul saat kursor diarahkan** ke menu induk. Submenu juga terbuka dengan fokus
    keyboard (Enter/Spasi/panah) dan ketukan di layar sentuh, karena hover tidak ada di ponsel
    dan tablet.
  - **Panel submenu:** kartu putih membulat 16 px (gelap di tema gelap). Isinya satu baris per
    tautan: judul tebal + keterangan abu, dan penanda halaman aktif.
  - **Penanda aktif:** menu induk ditandai bila salah satu halaman di dalamnya sedang dibuka,
    mis. `/renungan/x` menandai "Kabar Jemaat".
  - **Lebar ≥1024 px:** pil navigasi lengkap (lima menu induk muat sampai 1024 px).
  - **Lebar <1024 px:** pil merek, tombol tema, dan tombol "Menu" yang membuka menu layar
    penuh. Menu ini dikelompokkan dengan judul grup yang sama (Kabar Jemaat, Pelayanan, Tentang
    Jemaat) dan berisi semua tautan, "Tutup", serta "Masuk Pengurus".
  - **Sumber data:** grup didefinisikan sekali di `portalNav` (`lib/navigation.ts`). Footer
    memakai judul tautan yang sama.
- **Hero halaman dalam** (`HeroPanel` ringkas):
  - Panel membulat 24 px setinggi ±44 vh di desktop, tinggi otomatis di ponsel.
  - Latarnya foto gereja dengan scrim lebih pekat. Galeri memakai foto dokumentasi terbaru,
    halaman baca memakai sampul artikel bila ada.
  - Isinya judul dua nada (H1), pengantar 08, dan aksi atau saringan utama halaman itu.
  - Label kicker kecil ("PAPAN JADWAL IBADAH", "PUBLIKASI MINGGUAN", …) **dihapus**; informasinya
    dilebur ke judul atau pengantar.
- **Footer** (foto + tepi gergaji):
  - Kolom merek: cincin sumur, "GMIT Lahairoi Tuak Sabu", "Gereja Masehi Injili di Timor, Jemaat
    Lahairoi Tuak Sabu. Bersekutu, bersaksi, dan melayani bersama jemaat di lima rayon pelayanan
    Lasiana.", dan "Lasiana, Kota Kupang, Nusa Tenggara Timur".
  - Kolom tautan memuat kesembilan tautan portal ditambah "Cek status pendaftaran"
    (`/layanan-sakramen#cek-status`). Susunannya:
    - **Jemaat:** Beranda, Jadwal Ibadah, Warta Jemaat, Renungan, Berita & Pengumuman, Galeri
      Kegiatan (Galeri dipindah dari Pelayanan agar sama dengan grup Kabar Jemaat di header).
    - **Pelayanan:** Layanan Sakramen, Cek status pendaftaran, Persembahan.
    - **Gereja:** Profil & Sejarah, Lima rayon pelayanan (`/profil#rayon`), Pendeta & Majelis
      (`/profil#majelis`), Masuk pengurus.
    - **Kontak:** hanya bila K1 disetujui.
  - Baris legal: "© {tahun} Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana" dan "Waktu di
    portal ini dalam WITA (UTC+8)".

### 5.1 Beranda `/`

Data utama dari `GET /api/public/home`. Tambahan: `/api/rayons`, 3 dokumentasi galeri, dan
hitungan jadwal 7 hari. Semuanya endpoint yang sudah ada.

| # | Slot kage | Isi |
| --- | --- | --- |
| 1 | **Hero sinematik** (92 vh, foto gereja, parallax) | Lihat rincian di bawah tabel. |
| 2 | **Jadwal ibadah** (`#jadwal`): judul dua nada, deretan kartu tab, panel jendela gelap | Lihat rincian di bawah tabel. |
| 3 | **Pernyataan masalah** ("Jemaat tidak lambat") | **Renungan hari ini** (`#renungan`). Lihat rincian di bawah tabel. |
| 4 | **Dua kartu terang/gelap** ("Tanpa/Dengan portal") | **Publikasi mingguan** (`#warta`). Lihat rincian di bawah tabel. |
| 5 | **Band fitur di atas foto** (3 kartu bernomor) | **Layanan jemaat.** Judul *usulan*: "Semua layanan jemaat. / *Dalam satu tempat.*" Tiga kartu bernomor:<br>01 Warta Jemaat → `/warta`, teks dari pengantar Warta 08.<br>02 Layanan Sakramen → `/layanan-sakramen`, dengan tautan kedua "Lacak status" → `#cek-status`.<br>03 Persembahan → `/persembahan`, teks "Nomor rekening tiap pos kas dan kode QRIS resmi jemaat, dengan tombol salin." |
| 6 | **Tabel perbandingan** ("Bukan sekadar pengumuman") | **Lima rayon pelayanan** dari `GET /api/rayons`. Tabel lapang bergaris tipis: Rayon *n* · Nama · Koordinator ("Koordinator belum diumumkan" bila kosong) · Wilayah. Penutupnya ajakan 08 "Baru di Lahairoi? Kenali sejarah, majelis, dan rayon Anda." → `/profil`. |
| 7 | **Testimoni** (dibuang) | **Galeri kegiatan:** sampai 3 dokumentasi terbaru dari `GET /api/public/contents?category=MEDIA&per_page=3&with_body=true`. Foto besar dengan judul dan keterangan, tautan ke `/media`. Seksi disembunyikan bila belum ada dokumentasi. |
| 8 | **Panel metrik & persembahan** | Lihat rincian di bawah tabel. |
| 9 | **FAQ** (akordeon) | Tiga tanya-jawab pendaftaran sakramen dari 08 ("Apa yang terjadi setelah formulir terkirim?", "Bagaimana jika berkas perlu diperbaiki?", "Kode registrasi hilang?"). Isinya dipindah ke konstanta bersama di `lib/sacraments.ts` supaya sama dengan halaman Sakramen. Penutup: tautan ke `/layanan-sakramen`. Label "TANYA JAWAB" dihapus. |
| 10 | **Footer foto** | Pola bersama 5.0. |

**1. Hero sinematik**

- **Pita pengumuman 08** menjadi pil kaca di atas judul: "Pengumuman terkini: {judul berita}"
  atau "Warta terbaru: {judul}". Sekarang berupa **tautan** ke berita atau warta itu.
- **Kalimat tampilan** "Allah yang hidup / *melihat kita.*" adalah makna nama Lahai-roi, isi kartu
  cadangan 08. Di bawahnya ada rujukan kecil "Kejadian 16:13–14".
- **H1** adalah nama gereja, "GMIT Jemaat Lahairoi Tuak Sabu Lasiana", di bilah bawah hero
  (24–28 px). Di bawahnya pengantar 08: "Wadah persekutuan, informasi ibadah, dan pelayanan…".
- **Aksi cepat 08** menjadi pil:
  - utama (putih): "Unduh Warta Jemaat · PDF {tanggal}", atau "Belum terbit" dengan cadangan
    ke `/warta`;
  - kaca: "Jadwal Ibadah" (`#jadwal`), "Beri Persembahan" (`/persembahan`), "Profil & 5 Rayon"
    (`/profil`).
- **Kartu "Tema kebaktian minggu ini"** jadi kartu kaca di kanan bawah: tema, bacaan, Pelayan
  Firman, waktu. Kartu ini tersembunyi bila tidak ada.
- **Kartu dokumentasi terbaru 08** pindah ke slot 7.

**2. Jadwal ibadah**

- **Judul:** *usulan* "Jadwal ibadah / *terdekat.*" (08: "Jadwal Ibadah Terdekat"), dengan
  pengantar "Terbuka untuk jemaat, keluarga, dan tamu. Semua waktu dalam WITA."
- **Kartu tab** berisi saringan jenis 08 beserta hitungannya: "Semua jadwal (n)", "Kebaktian
  Minggu (n)", "Ibadah rayon (n)", "Kategorial & khusus (n)". Kartu tab tidak memuat
  hari/jam/RT karangan.
- **Bilah jendela:** "jadwal — {tanggal pertama} s.d. {tanggal terakhir}". Badge "Klasis…"
  diganti "WITA".
- **Baris** dikelompokkan per hari ("Hari ini", "Besok", "Minggu, 1 Nov"). Isinya: judul, pil
  "Rayon X", Pelayan Firman, lokasi, Tema, Bacaan, jam (aksen jingga), dan "Tata ibadah ↓" bila
  ada PDF.
- **Bilah bawah:** "Semua jadwal ibadah →" ke `/jadwal`.
- **Keadaan** eror, memuat, kosong, dan saringan-kosong memakai teks 08.

**3. Renungan hari ini** (`#renungan`)

- **Judul dua nada:** judul renungan + *ayat* (`summary`) dalam serif miring.
- **Penanda:** "Renungan Hari Ini" atau "Renungan Terbaru" beserta tanggalnya, huruf biasa.
- **Isi:** sampul lebar; tiga paragraf pertama, 18 px, maksimal 62ch; tombol "Baca selengkapnya"
  / "Tampilkan lebih sedikit".
- **Kaki:** penulis ("Penulis renungan"), "Renungan lainnya →", dan pil "Bagikan" (perilaku
  share/salin 08).
- **Kosong:** "Renungan hari ini belum tersedia."

**4. Publikasi mingguan** (`#warta`)

- **Judul:** "Renungan Harian & Warta Jemaat" dengan pengantar 08.
- **Kartu terang — Berita & Pengumuman:** 3 terbaru (tanggal mono, judul bertaut, ringkasan
  3 baris), "Semua berita →". Kosong: "Belum ada berita atau pengumuman."
- **Kartu gelap — Warta Jemaat:**
  - judul, ringkasan, "Terbit {tanggal}" atau "Warta minggu ini belum diterbitkan.";
  - panel jendela kecil `{slug}.pdf` dengan "Unduh PDF";
  - "Arsip warta →".
- **Bila `/home` gagal:** tampil pesan eror dengan "Coba lagi". Di 08 kartu-kartu ini tertahan
  di kerangka muat.

**8. Panel metrik & persembahan**

- **Metrik** hanya angka yang bisa dihitung dari API: jumlah rayon dan jumlah ibadah publik
  7 hari ke depan (`/api/public/worships?to=…` `meta.total`). Baris disembunyikan bila tidak
  ada data.
- **Judul:** "Persembahan kasih. / *Lewat QRIS atau transfer bank.*"
- **Bilah rekening:** satu bilah mono gelap per rekening dari `payment_info`, data yang di 08
  diambil tetapi tidak pernah tampil. Isinya bank · keperluan · nomor dengan tombol
  "Salin No. Rek" (perilaku 08).
- **Tautan:** "Lihat rekening & QRIS →" ke `/persembahan`.
- **Catatan:** "Simpan bukti transfer Anda…".
- **Bila belum ada rekening:** teks 08 "Rekening dan QRIS persembahan belum diumumkan…".

### 5.2 Jadwal Ibadah `/jadwal`

- **Hero ringkas**
  - Judul: "Jadwal Ibadah / *mendatang.*" (*usulan*) dengan pengantar 08 "Kebaktian Minggu,
    ibadah rumah tangga di lima rayon…".
  - Di bilah bawah hero: saringan jenis berupa kartu tab ("Semua jenis", Kebaktian Minggu,
    Ibadah Rayon, Ibadah Kategorial, Ibadah Khusus).
  - Saringan rayon: pil di ≥640 px, pilihan *select* di ponsel. Isinya "Semua rayon" dan
    kelima rayon.
  - URL `?jenis=&rayon=&page=` tidak berubah.
- **Papan jadwal** (panel jendela gelap selebar isi)
  - Judul bilah: hitungan langsung 08 "{n} {jenis} mendatang{ di Rayon X}" ("Memuat jadwal…"
    saat memuat), dengan tombol "Tampilkan semua jadwal" bila ada saringan.
  - Kelompok per `dayLabel`, mis. "Hari ini · Rabu, 28 Oktober 2026".
  - Tiap baris: jam ("Jam menyusul"), judul, pil jenis/rayon, lokasi, Tema, Bacaan,
    **semua petugas** berurutan (Pelayan Firman, Liturgos, Majelis bertugas, Pemandu lagu,
    Pemusik, Multimedia), dan "Tata ibadah" (unduh `tata-ibadah-{tanggal}.pdf`).
  - Bilah bawah: pager "{a}–{b} dari {n} jadwal".
- **Keadaan:** eror + "Coba lagi", 6 baris kerangka, kosong dengan saran "Coba pilih jenis
  'Ibadah Rayon'", dan daftar meredup saat memuat ulang.

### 5.3 Warta Jemaat `/warta`

- **Hero ringkas:** "Warta Jemaat / *tiap Minggu, dalam PDF.*" (*usulan*) dengan pengantar 08.
- **Warta terbaru** (halaman 1, tanpa pencarian), berupa panel jendela gelap:
  - bilah `{slug}.pdf`;
  - "Warta terbaru · {tanggal}" (mono, huruf biasa), judul H2, ringkasan;
  - "Unduh PDF" dan "Baca di tab baru";
  - pratinjau PDF (iframe) di ≥1024 px.
- **Arsip**
  - Judul: "Arsip warta" (atau "Warta Jemaat").
  - Pencarian berupa pil (jeda 300 ms, `?q=`, placeholder "Cari judul warta"). Pencarian
    disembunyikan bila belum ada warta.
  - Tabel lapang: tanggal mono, judul + ringkasan 2 baris, tombol PDF. Lalu pager "warta".
- **Keadaan:** "Warta tidak dapat dimuat. Coba lagi", "Warta Jemaat belum diterbitkan.",
  "Tidak ada warta yang cocok dengan '{q}'.", "Belum ada warta sebelumnya."

### 5.4 Renungan & Berita (daftar dan baca)

- **Daftar** (`/renungan`, `/berita`)
  - Hero ringkas dengan judul dan pengantar per jenis dari 08 (tabel `KINDS`). Pencarian berupa
    pil kaca di bilah bawah hero; selalu tampil, dengan `?q=&page=`.
  - **Artikel unggulan** (halaman 1): kartu lebar dengan sampul membulat, "Terbaru · {tanggal}",
    judul, ayat (renungan) dalam serif miring, cuplikan 3 baris, "Baca selengkapnya →".
  - **Kartu lainnya:** kartu terang bertepi tipis tanpa bayangan; isinya sampul, "{tanggal} ·
    {ayat}", judul, cuplikan, "Baca →". Lalu pager.
  - **Keadaan:** teks 08 per jenis.
- **Baca** (`/renungan/:slug`, `/berita/:slug`)
  - Header solid tanpa hero foto, supaya fokus membaca.
  - Bagian atas: "← Semua {renungan|berita}"; label "{Renungan|Berita & Pengumuman} ·
    {tanggal}"; H1 besar; ayat serif miring (renungan); "Oleh {penulis | Majelis Jemaat}";
    pil "Bagikan".
  - Isi: sampul; ringkasan sebagai paragraf pembuka (berita); isi 18 px, maksimal 65ch;
    lampiran ("Buka lampiran PDF" / "Buka lampiran").
  - "{Renungan|Berita} lainnya": 3 kartu.
  - Perilaku dipertahankan: pengalihan kategori yang keliru dan halaman "… tidak ditemukan".
  - **Perbaikan:** judul tab kembali benar setelah meninggalkan halaman baca.

### 5.5 Galeri Kegiatan `/media`

- **Hero ringkas** berlatar foto dokumentasi terbaru (cadangan: foto gereja), dengan
  "Galeri Kegiatan / *ibadah dan pelayanan jemaat.*" (*usulan*) dan pengantar 08.
- **Kisi foto:**
  - ubin membulat 20 px tanpa bayangan, dengan zoom halus saat disorot;
  - pil kaca "Video" bila ada tautan video;
  - pratinjau YouTube atau ikon bila tak ada foto;
  - keterangan: tanggal, judul, ringkasan 2 baris. Lalu pager "dokumentasi".
- **Jendela galeri:** dialog panel gelap dengan `data-lenis-prevent`. Isinya video
  youtube-nocookie atau foto, tanggal, judul, keterangan (cadangan sr-only), foto di bawah video,
  cerita kegiatan, dan "Tonton video" untuk tautan non-YouTube. Esc/Tutup tetap berfungsi.
- **Keadaan:** teks 08.

### 5.6 Profil & Sejarah `/profil`

- **Hero ringkas:** "Profil & Sejarah / *GMIT Lahairoi Tuak Sabu.*" dengan pengantar 08. Pil
  lompat ke `#sejarah`, `#visi-misi`, `#rayon`, `#majelis`.
- **`#sejarah`:** tata letak editorial dua kolom berisi judul (konten tunggal) atau "Sejarah
  Jemaat Lahairoi", isi 18 px, dan foto besar. Kosong: "Sejarah jemaat sedang disusun pengurus."
- **`#visi-misi`:** pasangan kartu terang/gelap (motif kartu kage), Visi dan Misi
  berdampingan. Ini menghapus ruang kosong 691 px di 08. Kosong: teks 08.
- **`#rayon`:**
  - Judul "Lima Rayon Pelayanan" dengan pengantar 08.
  - Tabel lapang bergaya tabel perbandingan kage: Rayon *n* · Nama · Koordinator · Wilayah.
  - Eror: "Daftar rayon tidak dapat dimuat." Sekarang ada "Coba lagi".
- **`#majelis`:**
  - "Pendeta & Majelis Jemaat" / "Pelayan jemaat periode berjalan."
  - Foto bersama lebar dengan keterangan.
  - Kisi orang dengan avatar inisial (orang pertama ditonjolkan gelap), nama, dan jabatan; lalu
    catatan.
  - Kosong: teks 08.
- **Informasi lainnya:** konten yang tidak cocok dengan bagian mana pun.
- **Perbaikan:** lampiran konten Profil kini tampil sebagai tombol.

### 5.7 Persembahan `/persembahan`

- **Hero ringkas:** "Persembahan kasih. / *Dengan sukacita.*" dengan ayat 08: "'Allah mengasihi
  orang yang memberi dengan sukacita.' (2 Korintus 9:7)".
- **QRIS:** panel gelap berisi kartu putih dengan gambar QRIS besar, badge "QRIS",
  "{bank} · {keperluan}", petunjuk pindai, catatan, dan "Simpan gambar QRIS". Kosong: "Kode
  QRIS belum tersedia. Gunakan transfer bank di samping."
- **Rekening:** satu bilah salin mono gelap per rekening (pola kage). Isinya badge singkatan
  bank, keperluan, nama bank, nomor apa adanya, atas nama, catatan, dan tombol "Salin No. Rek"
  (toast, "Tersalin" 2,5 detik, aria-label 08). Kosong: teks 08. Deretan kartu berikon 08
  dihapus.
- **Catatan:** "Simpan bukti transfer Anda…".
- **Keadaan:** teks 08 (eror, memuat, belum diumumkan).

### 5.8 Layanan Sakramen `/layanan-sakramen`

- **Hero ringkas:** "Layanan Sakramen / *& pelacakan berkas.*" dengan pengantar 08 dan pil
  "Daftar sekarang" (`#formulir`) serta "Cek status pendaftaran" (`#cek-status`).
- **`#cek-status`:** panel jendela gelap bermotif terminal ("Dengan portal" milik kage).
  - Masukan kode mono berupa bilah salin, dengan placeholder "BPT-XXXX-XXXX" dan tombol
    "Lacak status" ("Memeriksa…").
  - Chip mono "Tersimpan di perangkat ini". **Perbaikan:** kode baru langsung muncul tanpa
    muat ulang.
  - Hasil di *live region*: pil jenis, kode, nama tersamar, "Diperbarui …", "Status: …";
    pelacak 5 langkah vertikal bernomor mono dengan teks dan status pembaca layar 08; "Catatan
    dari Majelis" beserta petunjuk revisi; "Berkas diterima: …".
  - Semua pesan eror tetap.
- **`#formulir`:**
  - Tab jenis menjadi kontrol pil tersegmentasi tiga kolom yang **membungkus di ponsel**, sehingga
    tidak lagi terpotong. `?layanan=` dan tombol panah tetap berfungsi.
  - Tiap formulir: kotak info, ringkasan eror, seksi berhuruf A–D dalam kartu terang.
  - Semua field, label, petunjuk, aturan, dan pesan validasi 08 tetap. Input 16 px agar iOS
    tidak memperbesar layar.
  - Ubin unggah tetap bergaris putus-putus (zona seret-lepas sungguhan).
  - "Kosongkan" dan "Kirim pendaftaran" (progres %).
- **Panel sukses:** jendela gelap dengan kode besar mono; "Salin kode", "Kirim ke WhatsApp/
  aplikasi lain", "Cek status sekarang", dan "Daftarkan layanan lain"; fokus dan gulir ke panel
  tetap.
- **FAQ:** akordeon kage dengan isi 08 (konstanta bersama, sama dengan Beranda).

### 5.9 Halaman 404, eror rute, dan login

- **404** (di dalam `PublicLayout`): hero ringkas "Alamat ini / *tidak ada.*" dengan teks 08 dan
  pil "Ke beranda".
- **`RouteErrorPage`**
  - Halaman ini juga dipakai dashboard, jadi tetap netral tanpa header/footer portal.
  - Hanya tipografinya diselaraskan.
  - Tiga varian pesan dan tombol "Muat ulang" / "Ke beranda" tetap.
- **`/login`**
  - Kiri: pil merek, "Masuk / *pengurus.*" (≤40 px, sebelumnya 118 px), pengantar, field
    "Email atau username" dan "Kata sandi" (dengan tombol lihat), pil gelap "Masuk"
    ("Memeriksa…"), catatan lupa kata sandi, "Kembali ke portal".
  - Kanan: panel foto gereja membulat berisi kartu kaca "Siapa yang bisa masuk" (empat peran)
    dan catatan untuk warga jemaat. Di ponsel panel foto menjadi pita pendek di atas.
  - Perilaku login tidak berubah.

### 5.10 Perbaikan kecil 08 yang ikut dikerjakan

Ditemukan saat inventaris dan diperbaiki di tahap halaman masing-masing:

1. Judul tab browser tidak kembali setelah meninggalkan halaman baca artikel.
2. Beranda: kartu publikasi tertahan di kerangka muat bila `/api/public/home` gagal.
3. Beranda: `payment_info` diambil tetapi tidak ditampilkan.
4. Pita pengumuman Beranda bukan tautan.
5. Profil: lampiran konten Profil tidak ditampilkan.
6. Profil: daftar rayon yang gagal dimuat tidak punya tombol "Coba lagi".
7. Sakramen: kode registrasi baru baru muncul di daftar tersimpan setelah muat ulang.
8. Sakramen: tab "3. Pemberkatan Nikah" terpotong di ponsel.
9. Beranda: kartu "Tema kebaktian minggu ini" hilang di pertengahan minggu.
   - Penyebabnya, kartu itu hanya mencari di 6 jadwal terdekat dari `/api/public/home`.
     Pada Rabu–Sabtu, keenamnya berisi ibadah rayon dan kategorial.
   - Ditemukan saat mengisi data uji di Tahap 0.
   - Di desain baru, kartu itu mengambil Kebaktian Minggu terdekat lewat
     `/api/public/worships?category=sunday_service&per_page=1`, endpoint yang sudah ada.

## 6. Daftar periksa isi 08

Syarat selesai tiap tahap halaman. Butir dicentang setelah diperiksa di browser dengan database
uji, di desktop dan di ponsel.

**Kerangka & global**

- [ ] Judul tab "{judul} · GMIT Lahairoi Tuak Sabu Lasiana" per rute; Beranda memakai nama situs; halaman baca memakai judul artikel
- [ ] Meta description di `index.html`; `/tentang` → `/profil`; `ScrollRestoration` + tombol Kembali
- [ ] Tautan "Lewati ke konten" → `#konten`; toaster portal di bawah tengah
- [ ] Sembilan tautan navigasi dengan penanda aktif (`/` hanya persis; `/renungan/x` menandai Renungan)
- [ ] Menu ponsel: judul lengkap, "Tutup", "Masuk Pengurus", tertutup setelah tautan diklik, judul sr-only "Menu navigasi"
- [ ] "Masuk Pengurus" → `/login`
- [ ] Isi footer: deskripsi gereja, lokasi, tautan portal dan jemaat (`/profil#rayon`, `/profil#majelis`, login), hak cipta tahun berjalan, catatan WITA

**Fitur baru dari keputusan K2, K3, dan gerak**

- [ ] Tombol tema di header (desktop dan ponsel); bawaan terang walau OS memakai mode gelap; pilihan diingat setelah muat ulang dan saat pindah halaman; tanpa kedip warna saat dimuat
- [ ] Tema gelap terbaca di semua halaman portal dan login; QRIS dan PDF tetap di atas putih; dashboard tetap terang setelah berpindah dari portal bertema gelap
- [ ] Lima menu induk; submenu Kabar Jemaat, Pelayanan, Tentang Jemaat terbuka saat hover, fokus keyboard, dan ketuk; Esc menutup; menu induk ditandai aktif untuk halaman di dalamnya
- [ ] Menu ponsel dikelompokkan dengan judul grup dan memuat semua tautan
- [ ] Gulir halus Lenis di semua halaman; tautan jangkar (`#jadwal`, `#cek-status`, `#rayon`, …) meluncur halus dan berhenti di bawah header
- [ ] Parallax hero di semua halaman, parallax foto band dan footer, reveal, dan float bekerja; semuanya mati saat reduced-motion
- [ ] Menu ponsel, submenu, dan jendela galeri bisa digulir di dalamnya (Lenis tidak membajak gulirannya)

**Beranda**

- [x] Pita pengumuman (berita terkini atau warta terbaru); disembunyikan saat memuat atau bila kosong
- [x] H1 nama gereja + pengantar
- [x] Kartu tema kebaktian minggu ini (tema, bacaan, Pelayan Firman, waktu); kerangka saat memuat; tersembunyi bila tidak ada
- [x] Empat aksi cepat dengan tujuan dan baris keterangannya, termasuk cadangan "Belum terbit" → `/warta`
- [x] Dokumentasi terbaru → `/media`; makna nama Lahai-roi + Kejadian 16:13–14
- [x] Ajakan "Baru di Lahairoi?" → `/profil`
- [x] `#jadwal`: saringan 4 jenis dengan hitungan; ≤6 jadwal; Pelayan Firman, tema, bacaan, lokasi, tata ibadah; "Semua jadwal ibadah" → `/jadwal`
- [ ] `#jadwal`: teks eror/coba lagi, kerangka, kosong, saringan-kosong
- [ ] `#renungan`: hari ini/terbaru, tanggal, ayat, judul bertaut, sampul, 3 paragraf + buka/tutup, penulis, "Renungan lainnya", Bagikan (share/salin + toast)
- [x] `#warta`: judul/ringkasan/terbit/belum terbit, "Arsip warta", "Unduh PDF" (`{slug}.pdf`)
- [x] Berita: 3 terbaru (tanggal, judul bertaut, ringkasan), "Semua berita", teks kosong
- [x] Ajakan persembahan → `/persembahan`; rekening dari `payment_info` dengan salin

**Jadwal Ibadah**

- [x] `?jenis=` (5 pilihan), `?rayon=` (pil ≥640 px, select di ponsel), `?page=`; nilai tidak sah diabaikan
- [x] Judul hitungan langsung + "Memuat jadwal…"; "Tampilkan semua jadwal"
- [x] Kelompok per hari ("Hari ini · …", "Besok · …"); jam atau "Jam menyusul"
- [x] Semua petugas berurutan, tema, bacaan, lokasi, pil jenis/rayon, unduh tata ibadah
- [ ] Eror/coba lagi, 6 kerangka, kosong + saran "Ibadah Rayon", daftar meredup saat memuat ulang, pager "jadwal"

**Warta**

- [x] Warta terbaru (halaman 1, tanpa `q`): tanggal, judul, ringkasan, Unduh PDF, Baca di tab baru, pratinjau PDF ≥1024 px
- [x] Arsip: pencarian (jeda 300 ms, `?q=`), baris tanggal/judul/ringkasan/PDF, pager "warta"
- [ ] Pesan eror, belum terbit (pencarian disembunyikan), tidak cocok "{q}", belum ada warta sebelumnya

**Renungan & Berita**

- [x] Teks pengantar per jenis; pencarian selalu tampil (`?q=`, `?page=`), jeda 300 ms
- [ ] Unggulan: sampul, "Terbaru · tanggal", judul, ayat, cuplikan, "Baca selengkapnya"
- [x] Kartu: sampul, "tanggal · ayat", judul, cuplikan, "Baca"; pager
- [ ] Halaman baca: kembali, label jenis + tanggal, H1, ayat, penulis, Bagikan (share/salin "Tautan disalin."), sampul, ringkasan berita, isi, lampiran, 3 artikel lainnya
- [x] Pengalihan kategori keliru (6 kategori); "… tidak ditemukan" + penjelasan; kerangka

**Galeri**

- [ ] Ubin: sampul / pratinjau YouTube / ikon; badge Video; tanggal, judul, ringkasan; pager "dokumentasi"
- [ ] Jendela galeri: YouTube nocookie, foto + alt, tanggal, judul, keterangan (cadangan sr-only), foto di bawah video, cerita, "Tonton video", Esc/Tutup
- [ ] Pesan eror, kerangka, kosong

**Profil**

- [ ] Pil lompat ke 4 bagian; anchor `#sejarah`, `#visi-misi`, `#rayon`, `#majelis`
- [ ] Pemetaan konten ke bagian menurut judul/slug (sejarah, visi/misi, majelis/pendeta, lainnya)
- [ ] Sejarah, Visi & Misi (satu atau banyak konten), gambar dan ringkasan, pesan "sedang disusun"
- [ ] Rayon: urutan, nama, koordinator atau "belum diumumkan", wilayah; eror, kerangka
- [ ] Majelis: foto bersama + keterangan, daftar "Jabatan: Nama" dengan inisial, catatan, kosong
- [ ] "Informasi Lainnya"; lampiran ditampilkan

**Persembahan**

- [ ] Ayat 2 Korintus 9:7
- [ ] QRIS: badge, judul bank · keperluan, petunjuk pindai, gambar + alt, catatan, "Simpan gambar QRIS" (`qris-{slug}.{ext}`)
- [ ] Rekening: singkatan bank, keperluan, bank, nomor, atas nama, catatan, "Salin No. Rek" (hanya digit, toast sukses/gagal, "Tersalin", aria-label)
- [ ] Satu konten boleh tampil di kedua kolom; pesan kosong per kolom; pesan belum diumumkan; catatan bukti transfer

**Layanan Sakramen**

- [ ] Pengantar + "Daftar sekarang" / "Cek status pendaftaran"
- [ ] Cek status: normalisasi kode, 3 pesan eror, chip tersimpan (≤5, localStorage), *live region*
- [ ] Hasil: jenis, kode, nama tersamar, diperbarui, status, pelacak 5 langkah + teks sr, catatan Majelis + petunjuk revisi, berkas diterima
- [ ] Tab 3 jenis + `?layanan=` + panah; nilai tetap saat pindah tab
- [ ] Seluruh field per jenis (bagian 11.3 inventaris) dengan label, wajib/opsional, placeholder, petunjuk, batas karakter, aturan tanggal
- [ ] Validasi klien = API, fokus ke field pertama yang salah, ringkasan eror, pesan server
- [ ] Unggah: seret-lepas, Ganti/Hapus, ukuran, penolakan klien dan server, teks keterangan berkas
- [ ] Kirim: progres "%", "Menyimpan…"; panel sukses dengan salin kode, share, cek status, daftarkan lain, catatan nomor HP
- [ ] FAQ 3 butir

**404, eror, login**

- [ ] 404: judul, teks, "Ke beranda"
- [ ] `RouteErrorPage`: 3 varian pesan, "Muat ulang", "Ke beranda"
- [ ] Login: field + pesan kosong, lihat/sembunyikan sandi, alert, "Memeriksa…", lupa sandi, kembali ke portal, daftar 4 peran + catatan jemaat, pengalihan bila sudah masuk, pemetaan eror 400, kosongkan sandi saat 401

## 7. Tahapan kerja

Setiap tahap berakhir dengan pemeriksaan wajib:

- `typecheck`, `lint`, `build`;
- inspector tiga lebar (tema terang);
- pengecekan di browser dengan database uji berisi konten portal, **di tema terang dan gelap**;
- gulir dengan roda tetikus (Lenis) dan pengecekan parallax di halaman yang diubah;
- satu kali uji dengan reduced-motion.

Setelah itu ada penjelasan perubahan, lalu commit setelah persetujuan. Selama di branch, halaman
08 dan kage boleh hidup berdampingan. Yang wajib: setiap commit tetap ter-build dan setiap
halaman tetap berfungsi.

| Tahap | Isi | Hasil yang bisa diperiksa |
| --- | --- | --- |
| **0. Persiapan** | Database uji portal (konten semua kategori, jadwal minggu ini/depan, rekening + QRIS, pendaftaran sakramen); tangkapan layar dasar 08 di tiga lebar; daftar periksa isi (bagian 6) | Baseline 08 tersimpan di `.taste-skill/inspect-portal-08-baseline/` |
| **1. Fondasi** | Token `site-*` terang **dan gelap** (`.theme-portal.dark`) beserta validasi kontrasnya; pemetaan shadcn di `.theme-portal`; mekanisme tema (`portal-theme.ts`, skrip anti-kedip di `index.html`, bawaan terang); huruf; aset foto + `srcset`; komponen shadcn `navigation-menu` dan `accordion`; primitif `kage/` (heading, pill, window-panel, copy-bar, accordion, reveal) | Primitif lolos typecheck/lint dan diperiksa di halaman uji lokal yang tidak ikut di-commit, di kedua tema; tampilan publik belum berubah |
| **2. Lapisan gerak** | `npm i lenis`; `lib/portal-motion.ts` (Lenis dengan konfigurasi manifest, parallax hero/latar, reveal, float); integrasi rute, Radix, reduced-motion; uji kinerja di ponsel (emulasi CPU 4×) | Gulir halus di semua halaman, parallax berjalan, tombol Kembali memulihkan posisi, menu/galeri bisa digulir, tanpa patah-patah |
| **3. Kerangka** | `SiteHeader` (overlay di atas hero, menempel setelah hero; navigasi berkelompok dengan submenu hover/fokus/ketuk; tombol tema; menu ponsel berkelompok), `SiteFooter` (foto + gergaji + parallax), tautan lewati-ke-konten, toaster | Semua halaman 08 sudah memakai header/footer baru; submenu dan tombol tema berfungsi |
| **4. Beranda** | Bagian 5.1 | Beranda lengkap sesuai peta isi |
| **5. Jadwal & Warta** | `/jadwal` (papan jadwal + saringan di URL), `/warta` (warta terbaru + PDF + arsip) | |
| **6. Renungan & Berita** | Daftar dan halaman baca keduanya, termasuk Bagikan dan pengalihan kategori | |
| **7. Galeri & Profil** | `/media` (kisi foto + jendela galeri + YouTube), `/profil` (sejarah, visi-misi, 5 rayon, Pendeta & Majelis) | |
| **8. Persembahan & Sakramen** | `/persembahan` (QRIS + rekening + salin), `/layanan-sakramen` (cek status, formulir 3 jenis, unggah berkas, FAQ) | Tab nikah tidak lagi terpotong di ponsel |
| **9. 404, eror, login** | `NotFoundPage`, `RouteErrorPage`, `/login` diselaraskan (judul ≤40 px, panel foto) | |
| **10. Rapikan & QA** | Hapus token `portal-*` dan komponen 08 yang tak terpakai; README & KONTEKS; audit akhir (inspector, kedua tema, keyboard termasuk submenu, pembaca layar dasar, reduced-motion, ukuran bundle, Lighthouse ponsel); centang daftar periksa isi | Siap merge |
| **11. Merge** | `git merge --no-ff feat/redesign-portal-kage` ke `main` (Keputusan K6: *merge commit*); push bila diminta | Riwayat per tahap tetap terbaca di `main` |

## 8. Pengecualian inspector yang disengaja

Inspector `design-taste-frontend` punya aturan bawaan yang sebagian bertabrakan dengan bahasa
kage. Yang dipertahankan dari kage, dengan alasan:

- **Pil berbayang di atas foto** (`shadow`): bayangan memisahkan pil dari foto. Hanya di hero.
- **Bayangan panel gelap** (`shadow-panel`): panel memang melayang di atas kanvas putih.
- **Label mono di bilah jendela panel:** bagian dari motif jendela. Ukurannya ≥13 px, huruf
  kecil kecuali singkatan.
- **Huruf mono** (`mono`, ditambahkan di Tahap 4): hanya untuk bilah jendela, jam di papan
  jadwal, nomor rekening, kode registrasi, dan nama berkas PDF. Teks bacaan tidak pernah mono.
  Peringatan bila mono melebihi 15 % teks tetap aktif sebagai pengaman.
- **Angka 01–03 di kartu band layanan** (`numbering`, Tahap 4): angka serif besar khas kage,
  disembunyikan dari pembaca layar dan hanya tampil mulai lebar tablet.
- **Empat keluarga huruf** (`font-count`, Tahap 4): sistem huruf kage di bagian 3.2.

Peringatan (WARN) yang dipertahankan dengan alasan:

- `mixed-font-headline`: judul dua nada sans + serif miring adalah ciri kage.
- `small-title`: H1 Beranda adalah nama gereja; kalimat besar di hero adalah makna nama
  Lahai-roi (ayat), bukan judul halaman.
- `no-footage`: belum ada video kegiatan dari pengurus (Keputusan K5).

Yang **tidak** dikecualikan: teks di bawah 13 px, teks bacaan di bawah 16 px, label kicker
huruf kapital di atas judul, gradien selain scrim foto, dan gulir menyamping.

Semua pengecualian dicatat dengan alasannya di `allowReasons`. Tahap 1 juga memperbarui [.taste-skill/direction.json](../.taste-skill/direction.json), yang saat
ini masih memuat arah lama dengan huruf Roundo. Isinya diganti huruf kage dan daftar `allow`
untuk pengecualian di atas. Dengan begitu inspector tidak lagi melaporkan `font-not-dealt`, dan
pengecualian yang disengaja tercatat di satu tempat.

## 9. Keputusan (dikonfirmasi 28 Oktober 2026)

| No | Keputusan | Hasil |
| --- | --- | --- |
| K1 | Kontak & alamat lengkap di footer (alamat jalan, email, telepon, WA, jam kantor TU, klasis) | **Sesuai usulan.** Footer memakai isi 08 saja. Kolom "Kontak" baru ditambahkan bila pengurus memberikan datanya |
| K2 | Tombol tema (☼) di header kage | **Tombol tema dibuat**, dengan tema **bawaan terang** (tidak mengikuti setelan OS). Rincian di 3.1a dan bagian 4 |
| K3 | Navigasi: kage 5 tautan, 08 punya 9 tautan | **Sesuai usulan, ditambah pengelompokan.** Kesembilan halaman tetap ada. Halaman yang serumpun dikelompokkan ke menu induk yang submenunya muncul saat kursor diarahkan: Kabar Jemaat, Pelayanan, Tentang Jemaat (bagian 5.0) |
| K4 | Testimoni, metrik fiktif, perbandingan "cara lama" | **Sesuai usulan:** dibuang; slotnya diisi isi 08 (bagian 5) |
| K5 | Foto: hanya satu foto gedung (1254 px persegi) | **Sesuai usulan:** dipakai sekarang. Foto ≥2400 px dan foto kegiatan dari pengurus bisa menggantikannya kelak tanpa mengubah kode |
| K6 | Cara merge ke `main` | **Sesuai usulan:** *merge commit* (`--no-ff`) |

Penegasan pengguna: **efek parallax dan gulir halus Lenis tetap dipakai**, di semua halaman portal
(bagian 3.4).

## 10. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Lenis bentrok dengan `ScrollRestoration`, jangkar, atau Radix scroll-lock | Integrasi terpusat di `portal-motion.ts`; uji tombol Kembali, `#cek-status`, menu ponsel, submenu, dan galeri di setiap tahap |
| Parallax berat di ponsel kelas bawah | Satu loop rAF untuk semua elemen; hanya `transform`; `will-change` hanya pada elemen yang bergerak; uji dengan perlambatan CPU 4× di Tahap 2. Penyesuaian nilai hanya bila terbukti patah-patah, dan dicatat |
| Teks di atas foto kurang kontras | Scrim 75/45/85 (hero), 60 % (band), 90/70/40 (footer) dari manifest; diperiksa inspector di kedua tema |
| Tema gelap: kedip warna terang saat halaman dimuat | Skrip di `index.html` memasang kelas `dark` sebelum CSS dan React dimuat |
| Tema gelap: kontras atau gambar yang tidak cocok | Token gelap divalidasi rumus WCAG di Tahap 1; QRIS, PDF, dan gambar CMS tetap di atas putih; setiap tahap halaman diperiksa di kedua tema |
| Tema gelap bocor ke dashboard | Kelas `dark` dilepas saat masuk `/dashboard`; diuji dengan berpindah dari portal gelap ke dashboard |
| Submenu yang hanya bergantung pada hover tidak bisa dibuka di layar sentuh/keyboard | Radix NavigationMenu: hover, fokus, dan ketuk; Esc menutup; jeda tutup agar kursor sempat masuk panel; diuji dengan keyboard dan emulasi sentuh |
| Muatan huruf bertambah (4 keluarga) | Hanya bobot yang dipakai, `display=swap`, preconnect sudah ada |
| Foto tunggal terasa berulang (hero, band, footer) | Band dan footer memakai potongan/posisi berbeda; foto Galeri terbaru dari CMS mengisi bagian galeri dan hero `/media` |
| Isi 08 terlewat | Daftar periksa isi (bagian 6) jadi syarat selesai tiap tahap |
| Gaya shadcn portal berubah untuk formulir sakramen | Formulir diuji penuh (validasi, unggah, kirim, kode registrasi) di tahap 8, di kedua tema |

## 11. Catatan pelaksanaan

### Tahap 0 — Persiapan (28 Oktober 2026)

**Data uji portal.** Data disimpan di D1 scratch sesi (di luar repo) dan diisi lewat API
sebagai Admin dan Pendeta, sehingga semuanya lolos aturan validasi yang sama dengan CMS. Dasarnya
database uji audit (jemaat, keuangan, sakramen, surat, inventaris), lalu ditambah:

| Isi | Jumlah | Catatan |
| --- | --- | --- |
| Warta | 16 terbit (+1 draf, +1 terjadwal) | 19 Juli – 1 November; PDF berisi teks |
| Renungan | 15 terbit (+1 draf, +1 terjadwal) | Satu untuk hari ini; 14 renungan harian ditulis akun Pendeta; sebagian bersampul |
| Berita | 14 terbit (+1 draf, +1 terjadwal) | Ringkasan dan isi; sebagian bersampul; judul panjang |
| Galeri | 8 | Dua dengan tautan YouTube (satu tanpa foto) |
| Profil | 4 | Sejarah (berfoto), Visi dan Misi, Pendeta & Majelis (9 orang + foto), "Makna Nama Lahai-roi" (bagian lainnya) |
| Rekening & QRIS | 4 | Dua bergambar QRIS |
| Rayon | 5 | Koordinator dan wilayah terisi; Rayon 5 sengaja tanpa koordinator |
| Jadwal ibadah publik | 25 | 28 Oktober – 15 November: ibadah rayon (hari ini, besok, …), kategorial, Kebaktian Minggu pagi/sore dengan 6 petugas dan tata ibadah PDF, satu Perjamuan Kudus, satu ibadah khusus |

- **Gambar uji:** potongan foto gedung gereja (menara, jendela kaca patri, serambi, atap) dalam
  WebP. Tidak ada foto karangan.
- **Pengisi data:** skrip `seed-portal.mjs` di folder scratch.

**Baseline inspector portal 08.** Disimpan di `.taste-skill/inspect-portal-08-baseline/` (tidak
di-commit), pada lebar 1440/768/390 px:

| Halaman | FAIL | WARN | FAIL yang muncul |
| --- | --- | --- | --- |
| Beranda | 10 | 6 | eyebrow, micro-label, gradient, shadow, hairline, icon-cards, body-size, few-pictures, small-text (46 blok), focal-point |
| Jadwal | 10 | 6 | eyebrow, shadow, hairline, icon-cards, body-size, few-pictures, small-text (68 blok), focal-point, off-centre, still-page |
| Jadwal (saring rayon) | 8 | 6 | eyebrow, shadow, hairline, body-size, few-pictures, small-text, focal-point, still-page |
| Warta | 6 | 4 | eyebrow, shadow, body-size, few-pictures, small-text, still-page |
| Renungan | 6 | 4 | eyebrow, shadow, body-size, small-text, focal-point, still-page |
| Renungan (baca) | 7 | 4 | + few-pictures |
| Berita | 6 | 4 | eyebrow, shadow, body-size, small-text, focal-point, still-page |
| Berita (baca) | 7 | 4 | + few-pictures |
| Galeri | 6 | 4 | eyebrow, shadow, body-size, small-text, focal-point, still-page |
| Profil | 7 | 4 | eyebrow, micro-label, shadow, few-pictures, small-text, focal-point, lopsided |
| Persembahan | 9 | 3 | eyebrow, micro-label, shadow, icon-cards, body-size, few-pictures, small-text, focal-point, still-page |
| Layanan Sakramen (baptis, nikah) | 8 | 6 | eyebrow, micro-label, shadow, body-size, few-pictures, small-text, focal-point, still-page; WARN side-scroll di 390 px |
| 404 | 7 | 4 | eyebrow, shadow, body-size, few-pictures, small-text, focal-point, still-page |
| Login | 1 | 3 | few-pictures |

**Temuan baru:**

- **Bug API, di luar cakupan redesign:**
  - Pembuatan alamat konten otomatis (`uniqueSlug` di `src/worker/routes/contents.ts`) memakai
    pola `LIKE '{slug}-%'`.
  - D1 membatasi pola LIKE 50 byte, sehingga **judul yang alamatnya ≥49 karakter gagal disimpan
    dengan eror 500**. Contoh: "Sekolah Minggu Mengadakan Lomba Cerdas Cermat Alkitab".
  - Hal yang sama berlaku untuk **kata pencarian ≥49 karakter** di semua kotak cari
    (`containsPattern`), termasuk pencarian portal: `/api/public/contents?q=<60 huruf>` →
    500.
  - Skrip data uji sementara mengirim alamat eksplisit. Perbaikannya diusulkan sebagai commit
    terpisah.
- **Kartu tema hilang di pertengahan minggu:** kartu "Tema kebaktian minggu ini" di Beranda
  tidak tampil pada Rabu–Sabtu. Masuk ke daftar perbaikan 5.10 butir 9.
- **Arah desain inspector:** `.taste-skill/direction.json` masih memuat arah lama dengan huruf
  Roundo, sehingga semua halaman mendapat WARN `font-not-dealt`. Diperbarui di Tahap 1 (bagian 8).

### Tahap 1 — Fondasi (28 Oktober 2026)

**Yang ditambahkan (tampilan portal 08 belum berubah):**

- **Token kage** di [index.css](../src/client/index.css):
  - warna `site-*`, huruf `font-site-*`, bayangan `shadow-site-*`;
  - nilainya dibaca dari variabel di `.theme-portal` (terang) dan `.theme-portal.dark` (gelap),
    termasuk `color-scheme`;
  - di tema gelap, variabel shadcn ikut dipetakan agar dialog dan sheet ikut gelap.
- **Mekanisme tema:**
  - [lib/portal-theme.ts](../src/client/lib/portal-theme.ts): `setPortalTheme`,
    `usePortalThemeValue`, dan `usePortalTheme` yang melepas `theme-portal` dan `dark` saat
    meninggalkan portal;
  - skrip anti-kedip di `index.html`;
  - `meta theme-color`;
  - kunci penyimpanan `gmit-lahairoi:tema-portal`.
- **Tombol tema:** [theme-toggle.tsx](../src/client/components/portal/theme-toggle.tsx), dibuat
  lebih awal dari rencana. Pemasangannya di header tetap di Tahap 3.
- **Huruf:** Instrument Serif *italic*, JetBrains Mono 400/500, dan Plus Jakarta Sans 800
  ditambahkan ke tautan Google Fonts.
- **Foto:** `public/images/gereja-gmit-lahairoi-{640,960,1254}.webp` (45/82/121 KB) untuk
  `srcset`.
- **Komponen shadcn:** `navigation-menu` (Radix NavigationMenu).
- **Primitif** di `components/portal/kage/`:
  - `TwoToneHeading`: hero/page/section/card, `onDark`, `inline`;
  - `PillLink` dan `PillButton`: light/dark/glass/outline/panel;
  - `WindowPanel`: penuh/compact, judul, badge, kaki;
  - `CopyBar`;
  - `FaqAccordion`;
  - `Reveal`.
- **[.taste-skill/direction.json](../.taste-skill/direction.json):**
  - huruf diganti huruf kage, sehingga `font-not-dealt` kini memeriksa Plus Jakarta Sans dan
    Inter;
  - `allow: ["shadow"]` beserta `allowReasons`.

**Penyimpangan dari rencana:**

- **Pemetaan variabel shadcn tema terang ke nilai kage diundur ke Tahap 3.** Kalau dipetakan
  sekarang, tombol dan input di halaman 08 langsung berubah warna sebelum halamannya dirombak.
- **`FaqAccordion` memakai Radix Accordion langsung.** Pemicu dan ikon +/− kage berbeda sama
  sekali dari pembungkus shadcn, jadi `ui/accordion.tsx` tidak disimpan.

**Pemeriksaan:**

- `typecheck`, `lint`, dan `build` bersih.
- Primitif diperiksa di halaman uji sementara (tidak di-commit), di tema terang dan gelap, pada
  1280 dan 375 px:
  - tombol tema mengganti kelas, penyimpanan, `theme-color`, dan `color-scheme`; pilihan bertahan
    setelah muat ulang (kelas sudah terpasang sebelum React dimuat);
  - `CopyBar` menyalin, menampilkan toast, dan menampilkan "Tersalin";
  - `FaqAccordion` hanya membuka satu butir.
- **Perbaikan yang ditemukan saat uji:** judul mono panjang di `WindowPanel` sempat melebarkan
  kolom grid di ponsel (gulir menyamping 52 px). Judulnya kini `w-0 flex-1 truncate`, dan
  tidak ada lagi gulir menyamping di 375 px.

### Tahap 2 — Lapisan gerak (29 Oktober 2026)

**Yang ditambahkan:**

- `lenis` 1.3.27 (npm).
- [lib/portal-motion.ts](../src/client/lib/portal-motion.ts), dipasang di `PublicLayout`, berisi:
  - **Lenis** dengan konfigurasi persis manifest (`duration 1.1`, easing ekspo, `smoothWheel`,
    `touchMultiplier 1.5`, `anchors`) dan loop rAF manual;
  - **satu loop** baca-lalu-tulis untuk semua elemen bergerak;
  - **`useHeroParallax`**: foto 0→28 % dan 1,02→1,15; judul 0→10 % dan opacity 1→0,15;
  - **`useBackgroundParallax`**: travel ±px; tinggi minimum 100 % + 2×travel;
  - **`useFloat`**;
  - **`registerReveal`**: IntersectionObserver dengan margin −80px; elemen yang sudah
    terlewati langsung tampil;
  - **`scrollToElement`**: gulir halus lewat Lenis bila aktif.
- **Integrasi:**
  - Radix mengunci gulir (`body[data-scroll-locked]`) → Lenis berhenti.
  - Isi `role=dialog`/`menu` dan popover Radix dikecualikan dari Lenis (opsi `prevent`).
  - Setiap pindah rute, Lenis disamakan dengan posisi dari `ScrollRestoration`.
  - Semuanya mati saat `prefers-reduced-motion`.
- **CSS:** `html.portal-motion [data-reveal]` hanya tersembunyi selama lapisan gerak aktif, dan
  `[data-parallax-bg]` mengatur posisi diam foto latar. `Reveal` kini mendaftarkan diri lewat
  ref.
- **Ukuran bundle utama:** 381,5 → 402,0 KB (gzip 119,7 → 125,3 KB, +5,6 KB).

**Pemeriksaan di portal 08 dengan data uji:**

| Uji | Hasil |
| --- | --- |
| Gulir roda tetikus | Halus: 300px dalam ±1 detik mengikuti kurva easing |
| Jangkar di halaman yang sama (`#jadwal`, `#formulir`, `#cek-status`) | Meluncur halus tanpa loncatan awal, berhenti tepat di `scroll-margin-top` (96px) |
| Tombol Kembali | Posisi dipulihkan; Lenis langsung selaras |
| Menu ponsel (Sheet) | Lenis berhenti; roda tetikus tidak menggulir halaman; posisi tetap; gulir kembali normal setelah ditutup |
| Jendela galeri | Roda tetikus sungguhan menggulir isi dialog (42px), halaman tetap |
| Halaman uji sementara (tidak di-commit): hero, 3 seksi reveal, chip float, band ±340, footer ±420 | Semua bergerak sesuai nilai manifest; foto latar tidak pernah memperlihatkan tepinya saat masuk, tengah, dan keluar layar |

Catatan pemeriksaan:

- **Pemulihan posisi saat Kembali:** sesudah dipulihkan, posisi bergeser +176px karena isi
  Beranda selesai dimuat di atas layar (*scroll anchoring* browser). Perilaku ini sudah ada di
  08.
- **Loncatan saat menu ponsel dibuka:** loncatan ke 226px yang sempat terlihat ternyata
  berasal dari alat klik pengujian. Dengan klik JavaScript, posisinya tetap 600px.

**Kinerja** (Chrome headless lewat DevTools Protocol, roda tetikus sungguhan 24 kali):

| Skenario | Median frame | p95 | Frame > 33ms |
| --- | --- | --- | --- |
| Desktop 1440, CPU 1× | 16,7ms | 17,1ms | 0 |
| Desktop 1440, CPU 4× | 16,7ms | 16,8ms | 0 |
| Ponsel 390 (DPR 3), CPU 4×, halaman uji | 16,7ms | 16,8ms | 1 (366ms, sekali) |
| Ponsel 390, CPU 4×, Beranda 08 | 16,7ms | 16,8ms | 0 |
| `prefers-reduced-motion` | Lenis dan gerak mati; 7/7 elemen reveal langsung terlihat | | |

- **Satu frame lambat di ponsel** kemungkinan besar berasal dari dekode foto 1254px saat band
  pertama kali masuk layar. Komponen foto di Tahap 3 memakai `decoding="async"` dan
  `loading="lazy"` (kecuali hero).
- **Nilai parallax tidak diubah untuk ponsel**, karena tidak ada patah-patah yang terukur.
- **Jangkar lintas halaman** (`/profil#rayon` dari Beranda) berhenti di 110px, sama persis
  dengan dan tanpa Lenis. Penyebabnya isi Profil yang dimuat setelah gulir; perilaku ini sudah
  ada di 08 dan diperbaiki saat halaman Profil dirombak (Tahap 7): gulir ulang ke jangkar
  setelah data tiba.

### Tahap 3 — Kerangka (29 Oktober 2026)

**Yang dibangun:**

- **Navigasi bergrup** di [lib/navigation.ts](../src/client/lib/navigation.ts):
  - `portalNav` berisi lima menu induk, tiga di antaranya bersubmenu dengan keterangan
    singkat;
  - `portalNavLinks` adalah daftar datarnya;
  - `activePortalLink(pathname, hash)` memilih satu tautan aktif: `/` hanya persis,
    `/renungan/x` menandai Renungan, dan tautan berjangkar hanya bila jangkarnya sama.
  - `portalLinks` lama dihapus.
- **[site-header.tsx](../src/client/components/portal/site-header.tsx):**
  - Satu header `fixed` berisi pil-pil yang melayang: pil merek (cincin sumur + "GMIT
    Lahairoi"), pil navigasi, tombol tema, dan "Masuk Pengurus →" (di 1024–1279 px tertulis
    "Masuk", dengan nama aksesibel tetap "Masuk Pengurus").
  - Celah antarpil tidak menangkap klik (`pointer-events-none`).
  - Saat diam, header berjarak `--site-inset` dari tepi (32/48/64 px di ponsel/tablet/desktop
    lebar), nilai yang sama dengan bantalan hero kage. Begitu halaman digulir, header naik
    merapat ke 12 px dari atas (transform, tanpa transisi saat kurangi gerak).
- **[nav-menu.tsx](../src/client/components/portal/nav-menu.tsx):**
  - Memakai Radix NavigationMenu langsung (tanpa pembungkus shadcn), agar gaya fokus dan panel
    tidak bertabrakan dengan kelas bawaan shadcn. `components/ui/navigation-menu.tsx` dari
    Tahap 1 dihapus.
  - Submenu terbuka saat kursor diarahkan (jeda buka 120 ms, jeda tutup bawaan Radix 150 ms),
    saat Enter/Spasi, dan saat diketuk.
  - Panel: kartu kanvas membulat 16 px, satu baris per tautan (judul tebal + keterangan),
    penanda aktif berupa titik jingga. Panel terakhir dirapatkan ke kanan.
  - Menu induk yang memuat halaman aktif berwarna gelap dan diberi `aria-current="true"`.
- **Menu ponsel (<1024 px):**
  - Sheet layar penuh. Bilah atasnya berada di posisi yang sama dengan header (diam atau
    merapat), dan berisi pil merek, tombol tema, serta "Tutup".
  - Beranda dan Jadwal Ibadah di atas, lalu tiga grup berjudul. Di ≥640 px tampil dua kolom.
  - "Masuk Pengurus" di bawah. Isinya bisa digulir (`data-lenis-prevent`).
- **[site-footer.tsx](../src/client/components/portal/site-footer.tsx):**
  - Foto gereja (`srcset` 640/960/1254, `loading="lazy"`, `decoding="async"`) dengan
    parallax ±420 px, scrim, dan tepi gerigi berwarna kanvas (gigi 28×16 px lewat `mask`,
    jadi ukurannya tetap di semua lebar).
  - Kolom merek, tiga kolom tautan (Jemaat, Pelayanan, Gereja), baris hak cipta dan WITA.
- **[PublicLayout.tsx](../src/client/layouts/PublicLayout.tsx):**
  - Kanvas `site-canvas`, huruf Inter, tautan "Lewati ke konten" bergaya pil.
  - `main` diberi ruang atas hanya bila halaman belum punya hero (`:not(:has([data-hero]))`),
    jadi halaman 08 tidak tertutup header. Hero kage di tahap berikutnya memasang
    `data-hero`.
  - Toaster mengikuti tema portal.
- **Variabel shadcn tema terang** dipetakan ke kage: `--primary` `#111113`, garis `#E7E7E7`,
  permukaan `#F6F6F4`, `--ring` `#C2620A`. Tombol shadcn di halaman 08 (formulir sakramen,
  login) kini hitam.
- **Primitif kage:** cincin fokus memakai `ring-ring` (sebelumnya jingga 60 % yang hanya
  ±1,8:1 di putih), dan panah "→" tidak lagi memakai huruf mono.

**Penyesuaian setelah inspector:**

| Temuan | Tindakan |
| --- | --- |
| `gradient` (scrim footer) | Scrim teal `#07151A` dianggap gradien hias karena selisih kanalnya 19 (batas scrim netral 14). Diganti `rgb(8 18 21)`, teal sangat gelap yang nyaris netral |
| Kontras teks footer | Scrim manifest 90/70/40 hanya ±50 % di baris teks pertama, sehingga teks putih jatuh di atas dinding gereja putih. Scrim kini 45 % di pita teratas, 78 % mulai 88 px, 82 % di tengah, 92 % di bawah; tautan memakai `white/85` |
| `mono` | Baris hak cipta dan panah pil memakai Inter. Mono tetap untuk jam, kode, dan nomor rekening |
| `hairline` | Garis di atas baris hak cipta dihapus; pemisahnya jarak |
| `glass` | Blur hanya pada pil navigasi. Pil lain sudah 95 % pekat, jadi blur tidak menambah keterbacaan |

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| Lebar 1024 px | Pil merek 144 + navigasi 586 + aksi 152 px muat dalam 913 px |
| Submenu dengan tetikus | Terbuka saat disorot; kursor bisa pindah ke panel; klik "Renungan" membuka halaman, panel menutup, "Kabar Jemaat" menjadi gelap |
| Submenu dengan keyboard | Enter membuka; panah bawah masuk ke tautan pertama; Tab berpindah tautan; Esc menutup dan fokus kembali ke menu induk; panah kanan pindah ke menu induk berikutnya |
| Jangkar dari submenu di halaman yang sama (`/layanan-sakramen#cek-status`) | Meluncur halus lewat Lenis (0→320px) dan berhenti di 96px; panel menutup |
| Menu ponsel | Bisa digulir dengan roda tetikus (433px) sementara halaman tetap di 0 dan Lenis berhenti; "Cek Status Pendaftaran" menutup menu, lalu halaman lompat ke `#cek-status` di 96px dan fokus kembali ke "Menu" |
| Tema gelap | Tombol di header dan di menu ponsel berfungsi, dan pilihan tersimpan. Header, menu, dan footer gelap; seksi halaman 08 masih terang sampai dirombak |
| Footer | Foto menutupi bingkai di posisi paling bawah halaman (desktop dan ponsel); tidak ada gulir menyamping di 390px |
| Kurangi gerak | Lenis mati, foto footer diam di tengah dan tetap menutupi bingkai, header tetap merapat ke atas |
| Login | Tetap tampil benar; tombol utama hitam |
| Inspector | Tidak ada temuan dari header dan footer. Beranda 8 FAIL (baseline 10), Sakramen 6 FAIL (baseline 8); sisanya berasal dari isi halaman 08 |

- **Ukuran bundle utama:** 402,0 → 393,3 KB (gzip 125,3 → 122,4 KB), diukur dengan build
  commit Tahap 2 dan build Tahap 3.
- **Tautan berjangkar dari menu ponsel lompat tanpa animasi.** Saat menu terbuka, Lenis
  berhenti, sehingga yang bekerja `ScrollRestoration`. Ini disengaja: halaman tertutup menu
  saat lompatan terjadi.

### Tahap 4 — Beranda (29 Oktober 2026)

**Komponen kage baru** (dipakai ulang di tahap berikutnya):

- [hero-panel.tsx](../src/client/components/portal/kage/hero-panel.tsx): panel membulat 24 px
  dengan foto, scrim, dan parallax hero. Ukuran `full` (Beranda) dan `page` (halaman dalam).
  Pembungkusnya memasang `data-hero`, sehingga `main` tidak lagi memberi ruang atas.
  Bantalannya (`.site-hero-pad`) memakai `--site-inset`, jadi isi hero sejajar dengan pil
  header.
- [schedule-board.tsx](../src/client/components/portal/kage/schedule-board.tsx): papan jadwal
  dalam panel jendela. Jadwal dikelompokkan per hari, jam mono jingga, satu pil jenis/rayon,
  dan rincian petugas dua kolom. Menerima `PublicWorship` (Pelayan Firman) maupun
  `PublicWorshipItem` (semua petugas, untuk `/jadwal`).
- [site-section.tsx](../src/client/components/portal/kage/site-section.tsx): `SiteSection`
  (kanvas/putih tulang, 120 px), `SectionIntro` (judul dua nada + pengantar), dan `LoadError`
  (pesan + "Coba lagi").
- [photo-band.tsx](../src/client/components/portal/kage/photo-band.tsx): band foto selebar
  layar dengan parallax ±340 px.
- **Helper:**
  - `CHURCH_PHOTO`, `addDays`, `dateRange`, `compactPublishedDate`, dan `mediaCover` di
    `lib/portal.ts`. `mediaCover` dipindah dari `MediaPage`, dan footer kini memakai
    `CHURCH_PHOTO`.
  - `SACRAMENT_FAQ` di modul kecil `lib/sacrament-faq.ts` (bukan `lib/sacraments.ts`), agar
    Beranda tidak ikut memuat formulir dan pengunggah sakramen. Halaman Sakramen 08 memakai
    konstanta yang sama.
- **Preload foto hero:** skrip di `index.html` meminta foto hero sejak awal, hanya di `/`.

**Beranda** ([HomePage.tsx](../src/client/pages/public/HomePage.tsx)), urutannya:

1. hero (kalimat besar, rujukan ayat, H1, pengantar, pil pengumuman, empat aksi cepat, kartu
   tema);
2. jadwal ibadah terdekat;
3. renungan hari ini;
4. warta & berita;
5. band layanan;
6. lima rayon;
7. galeri;
8. persembahan;
9. tanya-jawab sakramen.

Perbaikan kecil 08 di bagian 5.10 yang selesai di tahap ini:

- **#2:** bila `/api/public/home` gagal, jadwal, renungan, warta & berita, dan persembahan
  masing-masing menampilkan pesan dengan "Coba lagi", bukan kerangka muat yang tertahan.
- **#3:** rekening dari `payment_info` tampil sebagai bilah salin.
- **#4:** pil pengumuman menjadi tautan ke berita, atau ke `/warta` bila yang tampil warta.
- **#9:** kartu tema mengambil Kebaktian Minggu terdekat dari
  `/api/public/worships?category=SUNDAY_SERVICE&per_page=1`, sehingga tetap tampil di
  pertengahan minggu.

Penyesuaian terhadap peta isi 5.1, sebagian karena temuan inspector:

- **Judul usulan dipendekkan** agar muat dua baris di ponsel: "Layanan jemaat. / *Dalam satu
  tempat.*", "Lima rayon, / *satu jemaat.*", "Warta & berita / *untuk jemaat.*".
- **Letak label:** pil pengumuman berada di antara pengantar dan aksi cepat, bukan di atas
  kalimat besar. Tanggal renungan berada di bawah judul, dan label "Tema kebaktian minggu ini"
  di bawah kutipan tema. Sebelumnya ketiganya terbaca sebagai label kicker di atas judul.
- **Permukaan tanpa garis tepi:** kotak aksi cepat, kartu tema, kartu band, saringan, FAQ, dan
  bilah salin. Bilah atas/bawah panel jendela memakai beda warna, bukan garis. Tepi panel gelap
  hanya di tema gelap.
- **Ukuran dan tinta:** ukuran huruf disatukan menjadi 10 tingkat. Teks bacaan memakai tinta
  80 %, dan abu-abu hanya untuk keterangan.
- **Ponsel:** kalimat besar hero dan judul seksi memakai ukuran cair (`clamp`) agar baris
  pertamanya muat sampai lebar 360 px. Angka 01–03 band hanya tampil mulai tablet. Rincian
  petugas di papan jadwal tetap dua kolom.
- **Lainnya:**
  - Ritme seksi 120 px (rancangan 140 px), untuk menghindari celah kosong antara seksi yang
    berlatar sama.
  - Persembahan berlatar kanvas.
  - Float hanya pada panel jendela warta: chip tanggal berita yang melayang sendiri-sendiri
    akan terpisah dari beritanya.

**Lapisan gerak** ([portal-motion.ts](../src/client/lib/portal-motion.ts)):

- **Masalah:** Lenis hanya menyelaraskan gulir asli saat diam. Saat meluncur, ia menimpa
  gulir dari keyboard (End, PageDown), bilah gulir, `scrollTo`, dan Cari di halaman.
- **Perbaikan:** gulir dari luar Lenis kini menghentikan luncuran di posisi baru itu.
  Lompatan asli browser ke jangkar menuju sasaran yang sama dengan Lenis, jadi tetap ditimpa
  agar jangkar meluncur halus.
- **Akibat ke inspector:** masalah yang sama membuat inspector (`scrollTo` lalu roda tetikus)
  memotret layar yang sama berulang kali, sehingga muncul temuan palsu "celah kosong" dan
  "teks menempel 10 layar".

**Pemeriksaan** (database uji, Chrome):

| Uji | Hasil |
| --- | --- |
| Jangkar "Jadwal Ibadah" di hero | Meluncur 0→764 px dalam ±1 detik dan berhenti dengan seksi tepat di 96 px |
| Roda tetikus lalu tombol End saat Lenis meluncur | Langsung ke dasar halaman (8552 px); sebelumnya ditimpa Lenis |
| Parallax hero | Pada gulir 400 px: foto 13 %, skala 1,08, kalimat besar opacity 0,39 |
| Float warta | +22 → +3 → −16 px selama seksi melintas |
| Tombol Kembali dari berita | Posisi 3400 px dipulihkan tepat |
| `/api/public/home` digagalkan (CDP) | Empat pesan "… tidak dapat dimuat. Coba lagi", tanpa kerangka tertahan; satu klik memuat 6 jadwal, 3 rekening, dan renungan |
| Ponsel 390 px, DPR 3, CPU 4×, roda tetikus 40 kali | Median frame 16,7 ms, p95 16,8 ms, tidak ada frame >33 ms |
| Kurangi gerak | Lenis mati, 18/18 elemen reveal terlihat, hero diam |
| Tema gelap | Hero, papan jadwal (bertepi), kartu warta, panel persembahan, salin rekening + toast gelap terbaca |
| Galeri dan Sakramen 08 | Tetap tampil; pratinjau YouTube dan FAQ dari konstanta bersama |
| Inspector Beranda | 1 FAIL, 5 WARN (baseline 08: 10 FAIL, 6 WARN). FAIL tersisa: judul renungan dari CMS tiga baris di 390 px. WARN tersisa dijelaskan di bagian 8 |

- **Belum diperiksa di browser:**
  - keadaan kosong papan jadwal dan saringan-kosong (data uji selalu berisi);
  - sampul, tombol buka/tutup, dan Bagikan renungan (renungan uji hanya satu paragraf tanpa
    sampul; Bagikan membuka dialog berbagi Windows).
  - Kodenya mengikuti 08, dan diperiksa lagi di Tahap 10.
- **Ukuran bundle utama:** 393,3 → 417,3 KB (gzip 122,4 → 129,8 KB). Beranda dimuat langsung
  (bukan lazy), sehingga komponen kage dan Radix Accordion untuk FAQ masuk bundle utama.

### Tahap 5 — Jadwal & Warta (29 Oktober 2026)

**Komponen kage baru**, di
[list-controls.tsx](../src/client/components/portal/kage/list-controls.tsx), dipakai ulang di
Renungan, Berita, dan Galeri:

- `PhotoFilterPill`: pil saringan di atas foto hero. Yang aktif putih dengan titik jingga,
  sisanya kaca.
- `SearchField`: kolom cari berbentuk pil, jeda 300 ms, ikut berubah bila `?q=` berubah dari
  luar. Tepinya `site-muted` (5,3:1) agar batas kolom terlihat.
- `SitePager`: "1–12 dari 16 warta" dengan pil Sebelumnya/Berikutnya; varian gelap untuk
  bilah bawah panel jendela.

**Penyesuaian bersama:**

- `HeroPanel` ukuran `page` menyejajarkan isinya dengan kolom isi 1180 px di bawahnya.
- `SiteSection` boleh tanpa `labelledBy` (untuk pesan status).
- `useUrlFilters().update(…, { keepScroll: true })` memakai `preventScrollReset`.
  - Tanpa opsi ini, setiap ganti saringan atau ketikan pencarian membuat `ScrollRestoration`
    mengembalikan halaman ke atas (600 → 0 px). Perilaku ini sudah ada di 08.
  - Halaman portal memakai opsinya; dashboard tidak diubah.
- `worship-card.tsx` (kartu jadwal 08) dan `WORSHIP_TONE` dihapus, karena sudah tidak dipakai
  sejak Beranda dan Jadwal memakai `ScheduleBoard`.

**Jadwal Ibadah** ([SchedulePage.tsx](../src/client/pages/public/SchedulePage.tsx)):

- **Hero ringkas:** "Jadwal Ibadah / *mendatang.*" dengan pengantar 08, lalu saringan jenis dan
  rayon (pil ≥640 px, *select* bertema gelap di ponsel) di atas foto.
- **Judul hitungan** 08 ("24 jadwal ibadah mendatang", "2 Ibadah Rayon mendatang di Rayon
  Golgota") berupa H2 di atas papan, bersama "Tampilkan semua jadwal". Judul ini tidak ditaruh
  di bilah jendela, karena di ponsel akan terpotong.
- **Papan jadwal:** `ScheduleBoard` dengan semua petugas berurutan, bilah judul rentang tanggal,
  dan pager di bilah bawah bila lebih dari 30 jadwal.
- **Keadaan:** 6 baris kerangka, pesan eror dengan "Coba lagi", kosong dengan saran "Ibadah
  Rayon", dan papan meredup saat memuat ulang.

**Warta Jemaat** ([WartaPage.tsx](../src/client/pages/public/WartaPage.tsx)):

- **Hero ringkas:** "Warta Jemaat / *tiap Minggu.*". Usulan "tiap Minggu, dalam PDF."
  dipendekkan agar dua baris di ponsel; kata "PDF" sudah ada di pengantar.
- **Warta terbaru:** panel jendela dengan judul H2, "Warta terbaru · tanggal" di bawahnya,
  ringkasan, dan pratinjau PDF putih (≥1024 px). Nama berkas `{slug}.pdf`, "Unduh PDF", dan
  "Baca di tab baru" ada di bilah bawah.
- **Arsip:** judul "Arsip warta" (atau "Warta Jemaat" saat mencari/halaman 2), kolom cari, baris
  bertanah putih tulang (tanggal di kolom kiri ≥768 px, di bawah judul di ponsel), tombol PDF
  tanpa ikon, dan pager.

**Penyesuaian karena inspector:**

| Temuan | Tindakan |
| --- | --- |
| `eyebrow` | Nama berkas dan badge "PDF" di bilah atas warta terbaru terbaca sebagai label di atas judul, jadi dipindah ke bilah bawah |
| `icon-cards` | Ikon di tombol baris arsip dihapus |
| `headline-lines` | Aksen judul Warta dipendekkan |
| `still-page` | Judul daftar, papan jadwal, dan baris arsip memakai reveal |

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| Saringan jenis, lalu rayon | `?jenis=rayon` → "14 Ibadah Rayon mendatang"; + Golgota → "2 … di Rayon Golgota" |
| Kombinasi kosong | "Belum ada Kebaktian Minggu di Rayon Golgota yang diumumkan. Coba pilih jenis “Ibadah Rayon”." |
| "Tampilkan semua jadwal" | Kembali ke 24 jadwal, tombol hilang |
| Nilai tidak sah | `?jenis=xyz&page=abc` diabaikan: 24 jadwal, "Semua jenis" aktif |
| Tombol Kembali setelah dua saringan | `?jenis=rayon&rayon=3` → `?jenis=rayon`, pil ikut |
| Ganti saringan / cari setelah menggulir | Posisi tidak lagi kembali ke atas; fokus tetap di kolom cari |
| Pencarian warta | `oktober` → 4 hasil tanpa warta unggulan; `zzzz` → "Tidak ada warta yang cocok dengan “zzzz”."; dikosongkan → warta unggulan kembali |
| Pager warta | Halaman 2: "13–16 dari 16 warta", judul "Warta Jemaat", halaman ke atas |
| Kurangi gerak | Lenis mati; reveal 2/2 (Jadwal) dan 13/13 (Warta) terlihat |
| Kinerja ponsel 390 px | Tidak ada frame panjang. Pengukuran kali ini dibatasi 30 fps oleh Chrome karena laptop berjalan dengan baterai (halaman kosong pun 33,3 ms); Jadwal, Warta, dan Beranda sama-sama p95 33,5 ms. Pengukuran 60 fps diulang di Tahap 10 dengan daya listrik |
| Tema gelap | Hero, saringan, papan jadwal, warta terbaru (pratinjau PDF tetap putih), dan baris arsip terbaca |
| Inspector | Jadwal 2 FAIL (baseline 10), Warta 1 FAIL (baseline 6) |

- **FAIL yang tersisa:**
  - `few-pictures`: satu foto saja, Keputusan K5.
  - `off-centre` di Jadwal 390 px: inspector membandingkan tepi teks judul di luar panel
    (24 px) dengan teks di dalam panel berbantalan (44 px). Kotak panelnya sendiri simetris.
- **Belum diperiksa di browser:**
  - pager papan jadwal (data uji hanya 24 jadwal, batas per halaman 30);
  - keadaan eror kedua halaman.
  - Kodenya mengikuti 08.

### Tahap 6 — Renungan & Berita (29 Oktober 2026)

**Daftar** (`/renungan`, `/berita`, [ArticlesPage.tsx](../src/client/pages/public/ArticlesPage.tsx)):

- **Hero ringkas:** "Renungan / *harian.*" dan "Berita & / *pengumuman.*" (judul dua nada usulan
  yang muat dua baris di ponsel), pengantar 08, dan kolom cari kaca di atas foto
  (`SearchField onPhoto`, tepi `white/50`). Pencarian memakai `keepScroll`.
- **Artikel unggulan** (halaman 1, tanpa pencarian): kartu lebar putih tulang dengan sampul,
  judul, ayat, "Terbaru · tanggal", cuplikan 3 baris, dan "Baca selengkapnya →".
  - Kartu ini tidak memakai lapisan tautan selebar kartu, karena lapisan itu menutupi baris
    ayat (temuan `covered-text`).
  - Judul adalah tautan utama. Sampul dan "Baca selengkapnya" juga tautan, tetapi tidak masuk
    urutan Tab dan disembunyikan dari pembaca layar.
- **Kartu lainnya:** putih tulang tanpa garis tepi, berisi sampul, judul, "tanggal · ayat" (di
  bawah judul), cuplikan, dan "Baca →". Seluruh kartu bisa diklik lewat tautan judul.
- **Keadaan:** teks 08 per jenis; daftar meredup saat memuat ulang; pager kage.

**Baca** (`/renungan/:slug`, `/berita/:slug`):

- **Tanpa hero foto,** agar fokus membaca. Judul H1 68 px di desktop (28 px di ponsel) dalam
  kolom 1040 px, sehingga judul panjang tetap dua baris. Teks bacaan 18 px, maksimal 65
  karakter.
- **Ayat** renungan di baris serif miring tersendiri (`AccentLine`), bukan bagian dari judul.
- **Baris keterangan** di bawah judul: "{Jenis} · tanggal · Oleh {penulis}", tombol
  "← Semua {jenis}", dan "Bagikan".
  - Rencana awal menaruh tombol kembali dan label jenis di atas judul. Inspector membacanya
    sebagai label kicker.
- **Isi:** sampul, ringkasan berita sebagai paragraf pembuka, lampiran, lalu seksi "{Jenis}
  lainnya" (3 kartu di atas putih tulang).
- **Perbaikan 08 #1 (judul tab):** halaman baca mengembalikan judul tab sebelumnya saat
  ditinggalkan. Judul rute `/renungan` dan `/renungan/:slug` sama, sehingga `RootLayout`
  tidak memasangnya ulang dan judul artikel tertinggal di tab.

**Bersama:**

- `AccentLine` di
  [two-tone-heading.tsx](../src/client/components/portal/kage/two-tone-heading.tsx): baris
  serif miring yang menyertai judul tanpa menjadi bagiannya.
- Renungan Beranda juga memakai `AccentLine`. Dengan begitu FAIL terakhir Beranda (judul tiga
  baris di ponsel) hilang: inspector Beranda kini 0 FAIL.

**Pemeriksaan:**

| Uji | Hasil |
| --- | --- |
| Kartu → halaman baca → "Semua renungan" | Judul tab "Pelita bagi Kakiku · …" lalu kembali menjadi "Renungan · …" |
| `/berita/pelita-bagi-kakiku` | Dialihkan ke `/renungan/pelita-bagi-kakiku` |
| `/renungan/tidak-ada-renungan-ini` | "Renungan tidak ditemukan" dengan penjelasan 08 |
| Bagikan (Web Share dimatikan, klik sungguhan) | Toast "Tautan disalin." |
| Pencarian renungan | `kasih` → 1 hasil tanpa unggulan; `qqqq` → "Tidak ada renungan yang cocok dengan “qqqq”."; dikosongkan → unggulan kembali |
| Urutan Tab di kartu unggulan | Judul `tabIndex` 0; sampul dan "Baca selengkapnya" −1 |
| Ponsel 390 px, tema gelap | Daftar dan halaman baca terbaca, tanpa gulir menyamping |
| Inspector | Daftar Renungan dan Berita 0 FAIL (baseline 6); halaman baca 1 FAIL (baseline 7), yaitu `few-pictures` (K5); Beranda 0 FAIL |

- **Belum terlihat di browser:**
  - sampul pada artikel unggulan (renungan dan berita terbaru di data uji tanpa sampul);
  - ringkasan berita sebagai paragraf pembuka, dan lampiran artikel (tidak ada di data uji).
  - Kodenya mengikuti 08.
