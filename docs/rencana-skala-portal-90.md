# Rencana Implementasi: Skala Portal Publik 90%

Disusun 29 Oktober 2026. Status: **selesai** 29 Oktober 2026 (keputusan S1–S4 di bagian 8),
dikerjakan langsung di `main` dan di-push ke `origin/main` (`14449e0..f2b4ed5`) atas permintaan
pengguna. Uji Safari macOS menunggu pengguna (bagian 10, Tahap 3).

## 1. Tujuan

Seluruh Portal Publik bergaya kage tampil 90% dari ukurannya sekarang, seperti membuka portal
dengan zoom browser 90%. Komposisi, warna, isi, dan perilaku tidak berubah.

**Yang mengecil 10%:**

- huruf;
- jarak;
- tombol dan pil;
- panel, kartu, dan foto;
- header dan footer;
- jarak tepi (`--site-inset`).

**Yang tidak berubah:**

- dashboard pengurus (selalu 100%);
- isi dan fitur halaman;
- lapisan gerak (Lenis, parallax, reveal);
- tema terang/gelap;
- elemen yang memang setinggi layar (hero, halaman login, jendela galeri) tetap memenuhi layar,
  tetapi isinya ikut 90%.

## 2. Temuan

### 2.1 Cara ukuran portal didefinisikan sekarang

| Sumber ukuran | Jumlah | Contoh |
| --- | --- | --- |
| Utilitas Tailwind berbasis `rem` | sebagian besar | `text-sm`, `h-11`, `px-6`, `py-20`, `gap-8` |
| Kelas piksel tetap | 101 | `text-[13px]` (23×), `text-[84px]`, `max-w-[1180px]`, `py-[120px]`, `rounded-[32px]` |
| Piksel di CSS | ±10 | `--site-inset` 32/48/64 px, bantalan hero 84 px, scrim footer 88 px |
| Piksel di JS gerak | 4 | parallax ±340/420/120 px, margin reveal −80 px |
| Satuan layar | 6 tempat | hero `92svh`/`48svh`, `min-h-svh` (layout portal, login), menu ponsel `h-svh`, jendela galeri `100svh`/`70svh` |

Akibatnya, mengecilkan ukuran font dasar (`rem`) saja **tidak** menghasilkan 90% yang seragam.
101 kelas piksel dan nilai piksel di CSS/JS akan tetap 100%, sehingga proporsinya rusak.

### 2.2 Uji coba CSS `zoom: 0.9`

Gaya disuntikkan ke `html.theme-portal` pada lebar ≥1024 px lewat Chrome headless, tanpa
mengubah kode (1440 × 900):

| Pemeriksaan | 100% | 90% | Catatan |
| --- | --- | --- | --- |
| Tinggi pil header | 44 px | 40 px | Seragam 90% |
| Tinggi header | 108 px | 97 px | |
| Jarak tepi pil merek | 64 px | 58 px | Header dan isi hero tetap sejajar |
| Jangkar `#jadwal` (Lenis) | 96 px | 86 px | = 96 × 0,9, sesuai header yang ikut mengecil; luncuran tetap halus |
| Foto parallax band dan footer | tanpa celah | tanpa celah | Geometri JS tetap benar di Chrome |
| Submenu "Pelayanan" | di bawah pemicu | di bawah pemicu | Posisi Radix benar |
| Jendela galeri | muat di layar | muat di layar | |
| Lebar 1023 px | — | tetap 100% | Ambang bekerja |
| Gulir menyamping | tidak ada | tidak ada | |
| **Tinggi hero Beranda** | 828 px (92% layar) | **745 px (83% layar)** | Muncul pita putih ±140 px di bawah hero |
| **Halaman login** | sampai 900 px | **berhenti di 810 px** | Pita kosong 90 px di bawah |
| Login dengan kompensasi `calc(100svh / 0.9)` | — | sampai 900 px | Pita kosong hilang |

Kesimpulan: `zoom` mengecilkan semuanya secara seragam dan tidak merusak lapisan gerak. Satu
efek samping yang wajib ditangani: satuan layar (`svh`) ikut dikali 0,9. Elemen yang seharusnya
setinggi layar perlu kompensasi `÷ 0,9`.

## 3. Pendekatan

**Dipilih: CSS `zoom` pada `html.theme-portal`, dengan kompensasi satuan layar.**

| Pendekatan | Kelebihan | Kekurangan | Keputusan |
| --- | --- | --- | --- |
| **A. `zoom: 0.9` di `html.theme-portal`** | Satu aturan CSS, 90% tepat untuk semua sumber ukuran (rem, px, CSS, JS). Isi Radix di `<body>` (menu, dialog, toast) ikut. Dashboard tidak tersentuh. Didukung Chrome/Edge, Safari, dan Firefox ≥126 | Satuan layar ikut mengecil, jadi perlu kompensasi di 6 tempat. Ukuran terhitung (`getComputedStyle`) tetap 100%, sehingga inspector mengukur ukuran sebelum zoom. Perilaku geometri di Safari belum teruji | **Dipakai** |
| B. Font dasar portal 90% + ubah semua piksel ke `rem`/variabel | Tidak bergantung pada `zoom` | Mengubah ±115 nilai di ±25 berkas; risiko regresi besar; nilai JS perlu dikali manual | Cadangan bila Safari bermasalah |
| C. `transform: scale(0.9)` | — | Merusak `position: fixed`/`sticky`, tinggi halaman, dan gulir | Ditolak |

**Cakupan yang diusulkan (keputusan S1):** layar ≥1024 px yang memakai tetikus/trackpad
(`(min-width: 64rem) and (pointer: fine)`).

Ponsel dan tablet tetap 100%, karena di sana 90% berarti:

- tombol 44 px menjadi 39,6 px, di bawah target sentuh 44 px;
- teks isi 16 px menjadi 14,4 px di layar kecil;
- iPad dengan layar ≥1024 px juga tetap 100%, karena pointer-nya kasar.

## 4. Rincian perubahan

### 4.1 Token skala — [src/client/index.css](../src/client/index.css)

```css
.theme-portal {
  --site-zoom: 1;
}
@media (width >= 64rem) and (pointer: fine) {
  .theme-portal {
    --site-zoom: 0.9;
  }
  html.theme-portal {
    zoom: var(--site-zoom);
  }
}
```

- Kelas `theme-portal` dipasang skrip di `index.html` sebelum React dimuat, jadi zoom berlaku
  sejak cat pertama, tanpa lompatan ukuran.
- Kelas itu dilepas saat pindah ke dashboard, sehingga dashboard kembali 100%.

### 4.2 Kompensasi satuan layar

Setiap tinggi relatif layar dibagi `--site-zoom`, termasuk batas atasnya. Hasilnya, tinggi di layar
sama persis dengan sebelum zoom, sementara isinya 90%. Saat `--site-zoom` bernilai 1
(ponsel/tablet), hasilnya identik dengan sebelumnya.

| Berkas | Sebelum | Sesudah |
| --- | --- | --- |
| [hero-panel.tsx](../src/client/components/portal/kage/hero-panel.tsx) (hero penuh) | `min-h-[min(92svh,880px)]` | `min-h-[calc(min(92svh,880px)/var(--site-zoom,1))]` |
| hero-panel.tsx (hero ringkas) | `min-h-[min(48svh,440px)]` | `min-h-[calc(min(48svh,440px)/var(--site-zoom,1))]` |
| [PublicLayout.tsx](../src/client/layouts/PublicLayout.tsx) | `min-h-svh` | `min-h-[calc(100svh/var(--site-zoom,1))]` |
| [LoginPage.tsx](../src/client/pages/LoginPage.tsx) | `min-h-svh` | sama seperti di atas |
| [MediaPage.tsx](../src/client/pages/public/MediaPage.tsx) (jendela) | `max-h-[calc(100svh-2rem)]` | `max-h-[calc((100svh_-_2rem)/var(--site-zoom,1))]` |
| MediaPage.tsx (foto di jendela) | `max-h-[70svh]` | `max-h-[calc(70svh/var(--site-zoom,1))]` |
| [site-header.tsx](../src/client/components/portal/site-header.tsx) (menu ponsel) | `data-[side=top]:h-svh` | Tetap; hanya tampil di bawah 1024 px (zoom 1) |

*Penyesuaian saat implementasi:* rencana awal memakai token kedua `--site-svh` dan membiarkan batas
880/440 px ikut 90%. Akibatnya, di layar 900 px hero hanya 792 px (88% layar). Membagi seluruh
nilai dengan zoom lebih sederhana (satu token) dan menjaga komposisi layar pertama persis seperti
sebelumnya.

### 4.3 Lantai ukuran teks (bila keputusan S3 = b)

Pada 90%, teks kecil menyusut di bawah aturan rumah "tidak ada teks di bawah 13 px":

| Ukuran sekarang | Pada 90% | Dipakai untuk |
| --- | --- | --- |
| 84 / 60 / 40 px | 75,6 / 54 / 36 px | Judul hero, seksi, kartu |
| 18 px | 16,2 px | Isi renungan dan artikel, pengantar |
| 16 px | 14,4 px | Teks isi, isian formulir |
| 14 px (`text-sm`) | 12,6 px | Label isian, keterangan, tautan footer |
| 13 px (`text-[13px]`) | 11,7 px | Pil kecil, label jendela, nomor rayon, hak cipta |

Lantai yang dipasang (Tahap 2):

- **Teks kecil** tetap ≥13 px di layar.
  - `--site-text-xs: calc(13px / var(--site-zoom))`: tetap 13 px di layar (14,44 px sebelum
    zoom). `text-[13px]` (23 tempat) diganti `text-(length:--site-text-xs)`.
  - `--text-sm: max(0.875rem, calc(13px / var(--site-zoom)))` didefinisikan ulang di
    `.theme-portal`: 14 px tanpa zoom, 13 px di layar dengan zoom 0,9 (lantai, bukan 12,6 px).
  - Toast `sonner` (13 px dan 12 px bawaan pustaka) memakai `--site-text-xs` lewat aturan
    `html.theme-portal [data-sonner-toast]…`.
- *Penyesuaian saat implementasi:* rencana awal mengganti 68 `text-sm` dengan token baru. Tailwind
  v4 menulis `text-sm` sebagai `font-size: var(--text-sm)`, jadi mendefinisikan ulang variabel itu
  di `.theme-portal` cukup. Tinggi barisnya tetap, komponen shadcn di portal ikut, dan dashboard
  tidak tersentuh.
  - Utilitas bernama seperti `text-site-sm` tidak dipakai, karena penggabung kelas `cn`
    menganggapnya warna dan membuangnya bila bertemu `text-site-muted`.
  - Bentuk `text-(length:…)` dikenali `cn` sebagai ukuran font.
- **Teks bacaan panjang** (isi renungan dan artikel, `text-lg` 18 px) tetap ≥16 px di layar,
  karena hasil 90%-nya 16,2 px. Tidak perlu diubah.
- **Teks isi lain** (16 → 14,4 px) ikut 90%, seperti zoom browser 90%.

### 4.4 Lapisan gerak — [src/client/lib/portal-motion.ts](../src/client/lib/portal-motion.ts)

- `getBoundingClientRect`, `innerHeight`, parallax, dan reveal tetap konsisten di bawah zoom
  (Chrome, zoom terstandar sejak Chrome 128). Jarak parallax dan margin reveal ikut mengecil 90%
  secara visual, sesuai tujuan.
- **Ternyata perlu dua penyesuaian** (ditemukan saat verifikasi Tahap 1, lihat bagian 10):
  `scroll-margin-top` dibaca dalam px CSS, sedangkan posisi elemen dalam px layar.
  - `landedOnAnchor()` mengalikan margin dengan zoom.
  - `scrollTo` milik Lenis dibungkus agar selisih zoom ditambahkan sebagai offset.

### 4.5 Dokumentasi

README bagian Desain, KONTEKS_PROJECT, dan bagian 8 rencana redesign kage (pengecualian
inspector). Catatannya: ukuran yang dilaporkan inspector adalah ukuran sebelum zoom.

## 5. Yang tidak berubah

- Dashboard dan semua halamannya, termasuk setelah berpindah dari portal.
- Portal di ponsel dan tablet (keputusan S1).
- Logika halaman, API, data, dan konfigurasi Lenis.
- Gambar: pemilihan `srcset` tetap mengikuti lebar layar.

## 6. Pemeriksaan

Di Chrome headless (CDP) dengan database uji, memakai skrip QA Tahap 10 yang sudah ada:

1. **Ukuran:** pada 1440 × 900 dan 1280 × 800, pil 40 px, header 97 px, dan jarak tepi
   58 px.
2. **Ambang:** 1023 px dan perangkat sentuh ≥1024 px (emulasi `pointer: coarse`) tetap 100%.
3. **Satuan layar:** hero Beranda tetap 92% tinggi layar, hero ringkas 48%, login penuh satu
   layar, jendela galeri muat.
4. **Lapisan gerak:** jangkar sehalaman dan lintas halaman berhenti di 86 px, parallax tanpa
   celah, reveal, dan float. Kurangi gerak tetap mematikan semuanya.
5. **Navigasi:** submenu (hover, keyboard, Esc) tepat di bawah pemicu, menu ponsel di 1023 px,
   jendela galeri dan fokusnya, toast di bawah tengah.
6. **Dashboard:** setelah portal → login → dashboard, `zoom` dashboard 1. Tidak ada lompatan
   ukuran di halaman mana pun saat dimuat.
7. **Teks** (bila S3 = b): tidak ada teks di bawah 13 px secara visual. Diukur dengan ukuran
   terhitung × zoom.
8. **Tema gelap:** lembar kontak semua halaman pada 1440 px.
9. **Inspector:** 13 halaman × tiga lebar, dibandingkan dengan hasil Tahap 10.
10. **Kinerja:** 60 fps di desktop (median 16,7 ms), Lighthouse desktop dan ponsel tidak turun.
11. **Safari dan Firefox:** pemeriksaan manual oleh pengguna di Safari macOS dan Firefox (lihat
    risiko R1). Lingkungan ini hanya punya Chrome.

## 7. Risiko & mitigasi

| No | Risiko | Mitigasi |
| --- | --- | --- |
| R1 | Safari belum teruji. Bila `getBoundingClientRect` di Safari mengembalikan nilai sebelum zoom, jangkar meleset ±10% dan parallax sedikit bergeser | Uji manual di Safari macOS sebelum di-push. Bila meleset, pakai pendekatan B untuk Safari atau batasi zoom ke mesin yang lolos uji |
| R2 | Ukuran berubah mendadak di ambang 1024 px saat jendela diubah ukurannya | Hanya terlihat saat jendela ditarik melewati ambang; tata letak di sana sudah berpindah antara menu ponsel dan navigasi desktop |
| R3 | Teks isi 14,4 px terasa kecil bagi sebagian pengguna | Lantai teks (S3 = b). Pengguna tetap bisa memperbesar lewat zoom browser, karena zoom CSS dan zoom browser saling mengalikan |
| R4 | Inspector dan `getComputedStyle` melaporkan ukuran sebelum zoom, sehingga pemeriksaan "teks < 13 px" tidak melihat 11,7 px | Pemeriksaan teks memakai ukuran terhitung × zoom (bagian 6 butir 7), dan tangkapan layar ditinjau langsung |
| R5 | Komponen baru di masa depan memakai `vh`/`svh` tanpa kompensasi | Catatan di README dan komentar di `index.css`: pakai `--site-svh` untuk tinggi relatif layar di portal |

## 8. Keputusan (dikonfirmasi 29 Oktober 2026)

| No | Pertanyaan | Usulan | Keputusan |
| --- | --- | --- | --- |
| S1 | Di layar mana skala 90% berlaku? | Desktop dengan tetikus/trackpad ≥1024 px; ponsel dan tablet tetap 100% | **Sesuai usulan** |
| S2 | Halaman login ikut 90%? | Ya | **Ya** |
| S3 | Teks kecil ikut 90% murni? | Tidak: 90% dengan lantai 13 px untuk teks kecil | **Sesuai usulan** |
| S4 | Cara kerja | Branch `feat/skala-portal-90`, merge `--no-ff` | **Langsung di `main`**, tanpa branch. Commit per tahap setelah disetujui |

## 9. Tahapan

| Tahap | Isi | Hasil yang bisa diperiksa |
| --- | --- | --- |
| 1. Skala + kompensasi | Token `--site-zoom`/`--site-svh` dan aturan `zoom` (4.1); enam kompensasi satuan layar (4.2) | Portal desktop 90%, hero dan login tetap setinggi layar, ponsel 100% |
| 2. Lantai teks | Token teks kecil dan penggantian kelas (4.3), bila S3 = b | Tidak ada teks visual < 13 px |
| 3. QA & dokumentasi | Pemeriksaan bagian 6, README/KONTEKS, uji Safari dan Firefox oleh pengguna | Selesai; uji Safari menunggu pengguna |

Setiap tahap memakai pola kerja yang sama dengan redesign kage: implementasi, verifikasi,
penjelasan, lalu commit setelah "Ya, commit".

## 10. Catatan pelaksanaan

### Tahap 1 — Skala + kompensasi (29 Oktober 2026)

**Perubahan:**

- [index.css](../src/client/index.css): token `--site-zoom` (1) dan aturan
  `@media (width >= 64rem) and (pointer: fine)` yang memasang `--site-zoom: 0.9` serta
  `zoom: var(--site-zoom)` pada `html.theme-portal`.
- Enam tinggi relatif layar dibagi `--site-zoom` (bagian 4.2).
- **Lapisan gerak** ([portal-motion.ts](../src/client/lib/portal-motion.ts)):
  - **Masalah:** di bawah zoom, `landedOnAnchor()` membandingkan posisi layar (86 px) dengan
    `scroll-margin-top` dalam px CSS (96 px). Luncuran Lenis ke jangkar sehalaman berubah menjadi
    lompatan (0 → 770 px seketika).
  - **Perbaikan:** margin kini dikali zoom, dan luncurannya kembali halus.
  - Lenis sendiri memakai px CSS itu sebagai px layar, sehingga luncurannya berhenti di 96 px,
    sedangkan lompatan asli berhenti di 86 px. `scrollTo` milik Lenis dibungkus untuk menambahkan
    selisihnya sebagai offset, jadi semua jalur kini berhenti di tempat yang sama.
- **Ubin unggah sakramen** ([SacramentPage.tsx](../src/client/pages/public/SacramentPage.tsx)):
  garis putus-putus 2 px × 0,9 dibulatkan Chrome menjadi 1 px. Lebarnya kini
  `calc(2px / var(--site-zoom))`, sehingga tetap 2 px di layar.
- **Perbaikan bawaan Tahap 7** ([ProfilePage.tsx](../src/client/pages/public/ProfilePage.tsx)):
  - **Masalah:** membuka `/profil#rayon` dengan cache font kosong mendarat di 67 px, bukan 96 px,
    juga tanpa zoom. Font web selesai dimuat setelah koreksi jangkar dan mengubah tinggi isi di
    atasnya.
  - **Perbaikan:** koreksi diulang sekali setelah `document.fonts.ready`, kecuali pengunjung
    sudah mulai menggulir atau berpindah jangkar.

**Pemeriksaan** (Chrome headless, 1440 × 900 kecuali disebut lain):

| Uji | Hasil |
| --- | --- |
| Ukuran desktop | `zoom` 0,9; pil header 40 px (dari 44), jarak tepi 58 px (dari 64) |
| Hero Beranda | 828 px, sama dengan sebelum zoom (92% layar) |
| Hero ringkas (Jadwal, Persembahan) | Minimum 432 px, sama dengan sebelum zoom |
| Login | Penuh satu layar (bawah 900 px; tanpa kompensasi 810 px) |
| Jendela galeri | Tinggi 868 px = layar − 32 px, sama dengan sebelum zoom |
| Jangkar sehalaman (Lenis) | `#jadwal` meluncur 0 → 402 → 575 → … → 770 px, berhenti di 87 px |
| Jangkar lintas halaman | `/profil#majelis`, `/#jadwal`, `/layanan-sakramen#cek-status` di 86–87 px, dengan dan tanpa Lenis |
| `/profil#rayon`, cache kosong | 90%: 87 px (sebelumnya 60); 100%: 96 px (sebelumnya 67) |
| "Cek status sekarang" | Meluncur 961 → 392 px, seksi di 87 px; kurangi gerak langsung ke 392 px |
| Parallax band dan footer | Foto selalu menutupi bingkainya |
| Submenu | Tautan "Persembahan" tepat di bawah pemicu "Pelayanan" |
| Dashboard setelah masuk | `zoom` 1, kelas tema portal dilepas |
| Ambang | 1023 px: `zoom` 1 (pil 44 px). Layar sentuh 1366 px (`pointer: coarse`): `zoom` 1. Ponsel 390 px: `zoom` 1, tanpa gulir menyamping |
| Kurangi gerak | `zoom` tetap 0,9, hero 828 px |
| 60 fps desktop | Median 16,7 ms, p95 ≤ 17,3 ms. Satu frame panjang hanya pada kunjungan pertama Sakramen dengan cache dingin; ulangan bersih (maks 17 ms) |
| Inspector | Beranda 0 FAIL, Profil 0 FAIL (WARN baru `lopsided` di "Informasi lainnya": ruang desktop terasa lebih lebar), Jadwal 2 (`few-pictures`, `off-centre` 390 px, sama dengan Tahap 10), Sakramen 1 (`few-pictures`), Login 1 (`few-pictures`) |

### Tahap 2 — Lantai teks (29 Oktober 2026)

**Perubahan** ([index.css](../src/client/index.css) dan 11 berkas portal):

- `--text-sm` didefinisikan ulang di `.theme-portal` dengan lantai 13 px.
- Token `--site-text-xs` (13 px di layar) menggantikan 23 `text-[13px]`.
- Toast `sonner` di portal ikut `--site-text-xs`.
- Lihat bagian 4.3 untuk alasan penyesuaiannya.

**Pemeriksaan:** ukuran di layar (ukuran terhitung × zoom) dihitung untuk setiap elemen berteks
di 12 halaman, sambil menggulir dari atas ke bawah.

| Uji | Hasil |
| --- | --- |
| Desktop 1440 px, 12 halaman | Teks terkecil 13 px; tidak ada yang di bawah 13 px. Sebaran umum: 13 / 14,4 / 16,2 px (sebelumnya 11,7 / 12,6 / 14,4 / 16,2) |
| Submenu, jendela galeri | Terkecil 13 px |
| Toast (salin nomor rekening) | 13 px di desktop (sebelumnya 11,7) dan 13 px di ponsel |
| Ponsel 390 px, 12 halaman dan menu | Tidak berubah: 13 / 14 / 16 px seperti sebelum skala |
| Typecheck, lint | Bersih |

### Tahap 3 — QA & dokumentasi (29 Oktober 2026)

**Firefox 150** (asli, lewat WebDriver BiDi, profil sementara terpisah):

| Uji | Hasil |
| --- | --- |
| Ukuran | `zoom` 0,9, pil header 40 px, jarak tepi 58 px, hero 828 px, tanpa gulir menyamping |
| Jangkar sehalaman (Lenis) | `#jadwal` meluncur 0 → 209 → 553 → … → 770 px, berhenti di 86 px; `#cek-status` meluncur 1600 → 392 px, berhenti di 87 px |
| Jangkar muat langsung | `/profil#majelis` dan `/profil#rayon` 86 px, `/layanan-sakramen#cek-status` 87 px |
| Parallax | Foto band dan footer selalu menutupi bingkainya |
| Tinggi layar | Login penuh 900 px; jendela galeri 16–884 px |
| Teks | Terkecil 13 px (Jadwal) |
| Ambang | 1023 px: `zoom` 1, pil 44 px |

Kesimpulan: geometri `zoom` di Firefox sama dengan Chrome, jadi risiko R1 tertutup untuk Firefox.

**Chrome** (pada skala 90%):

| Uji | Hasil |
| --- | --- |
| Inspector, 13 halaman × 3 lebar | Sama dengan Tahap 10. Warta dan Galeri berkurang satu temuan (`off-centre`, `still-page`). Profil mendapat WARN `lopsided`. Halaman baca renungan: `still-page` naik dari WARN (9 elemen bergerak) ke FAIL (6), karena halaman 19% lebih pendek di layar; jumlah reveal (4) dan parallax sama |
| Navigasi dan keyboard | Penanda aktif, submenu (hover, Enter, Spasi, panah, Tab, Esc mengembalikan fokus, ketuk), menu ponsel (13 tautan, gulir di dalam), "Lewati ke konten" memindahkan fokus |
| Pembaca layar dasar | 13 halaman: satu h1, tanpa lompatan judul, tanpa gambar tanpa `alt`, tanpa tombol/tautan/isian tanpa nama |
| Tema | Bawaan terang walau OS gelap, tanpa kedip, pilihan diingat; semua halaman terbaca di tema gelap pada 1440 px |
| Kurangi gerak | Lenis, parallax, dan reveal mati; isi tampil |
| Cat pertama | `zoom` sudah 0,9 sejak bingkai pertama (Beranda, Jadwal, Login): tanpa lompatan ukuran |
| Lighthouse desktop | Beranda kinerja 99, Sakramen 97; aksesibilitas 100; LCP 0,8–1,0 s |
| Lighthouse ponsel | Beranda 87 (Tahap 10: 86), aksesibilitas 100: tidak terpengaruh |
| Footer, toast | Footer lengkap; toast di bawah tengah, 13 px |

**Uji Safari macOS (oleh pengguna).** Safari tidak tersedia di lingkungan ini. Di Mac, buka
portal di jendela Safari selebar ≥1024 px, lalu periksa:

1. Ukuran portal tampak lebih kecil daripada di jendela kurang dari 1024 px; kecilkan jendela
   untuk membandingkan.
2. Beranda: hero memenuhi layar pertama tanpa pita putih di bawahnya.
3. Klik "Jadwal Ibadah" di hero Beranda: halaman meluncur halus (bukan melompat), dan judul
   "Jadwal ibadah terdekat" berhenti tepat di bawah header, tidak tertutup.
4. Ketik `/profil#rayon` langsung di bilah alamat: judul "Lima rayon" berhenti tepat di bawah
   header.
5. Gulir ke footer: foto footer bergeser pelan tanpa celah di tepi atas/bawahnya.
6. `/login`: halaman penuh satu layar tanpa pita putih di bawah.
7. Galeri: buka satu dokumentasi; jendelanya muat di layar.

Bila poin 3–5 meleset (posisi berhenti terlalu tinggi/rendah ±10%, atau foto bercelah), catat
halaman dan tangkapan layarnya; perbaikannya memakai pendekatan cadangan R1.

### Penyesuaian sesudahnya — jarak atas header (29 Oktober 2026)

Permintaan pengguna: navigasi terlalu jauh dari tepi atas halaman.

- **Masalah:** jarak atas header memakai `--site-inset` (32 / 48 / 64 px), token yang sama dengan
  jarak tepi kiri/kanan, mengikuti rancangan kage.
- **Perbaikan:** token baru `--site-header-top` (24 / 32 / 40 px) di
  [index.css](../src/client/index.css) untuk header, menu ponsel, header login, ruang atas halaman
  tanpa hero, dan bantalan atas isi hero. Jarak tepi kiri/kanan tidak berubah. Isi hero ikut naik
  sejauh yang sama, sehingga jarak navigasi ke judul hero tetap.

| Lebar | Pil dari atas layar | Tepi kiri | Header saat digulir |
| --- | --- | --- | --- |
| Desktop 1440 (zoom 0,9) | 58 → 36 px | 58 px (tetap) | 11 px (tetap) |
| Tablet 768 | 48 → 32 px | 48 px (tetap) | 12 px (tetap) |
| Ponsel 390 | 32 → 24 px | 32 px (tetap) | 12 px (tetap) |

Login (36 / 32 / 24 px) dan menu ponsel (24 px) sejajar dengan header.
