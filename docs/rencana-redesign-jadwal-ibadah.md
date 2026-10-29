# Rencana Implementasi: Kalender Jadwal Ibadah (Portal Publik)

Disusun 30 Oktober 2026. Status: **disetujui** 30 Oktober 2026 (keputusan J1–J9 semua sesuai
usulan, bagian 8). Tahap 0–2 (persiapan, API, lapisan data klien) selesai di branch
`feat/kalender-jadwal-ibadah` (bagian 10).

## 1. Tujuan

Halaman Jadwal Ibadah (`/jadwal`) menjadi kalender jemaat. Jemaat cepat menemukan jadwal yang
dicari tanpa menggulir panjang:

- melihat satu pekan sekaligus di satu layar;
- melompat ke tanggal mana pun;
- menyaring menurut jenis ibadah dan rayon;
- mencari nama pelayan, judul, tema, atau tempat.

Informasinya tetap lengkap, yaitu semua yang tampil sekarang: jam, tempat, rayon, tema, bacaan,
seluruh petugas, dan tata ibadah PDF.

**Pertanyaan utama layar ini:** "Ibadah apa saja pekan ini, kapan, di mana, dan siapa yang
melayani?"

**Pertanyaan berikutnya, sesuai urutan kepentingan:**

1. Kapan ibadah rayon saya?
2. Kapan saya (atau seseorang) bertugas?
3. Apa tema dan bacaan Minggu depan?
4. Tata ibadahnya di mana?

## 2. Temuan

### 2.1 Halaman sekarang

Diukur 30 Oktober 2026 dengan data demo lokal:

| | Desktop 1440×900 | Ponsel 390×844 |
| --- | --- | --- |
| Tinggi halaman | 5.872 px (6,5 layar) | 9.442 px (11,2 layar) |
| Tinggi hero | 436 px | 627 px |
| Jadwal pertama mulai di | y 619 | y 849 (di bawah layar pertama) |
| Jadwal per halaman | 30 dari 76 (3 halaman) | 30 dari 76 |

**Masalah:**

- **Daftar panjang.** Jadwal tampil sebagai daftar memanjang per hari dengan paging 30.
  - Satu pekan (±11 ibadah) sudah memakan lebih dari satu layar.
  - Tidak ada gambaran pekan atau bulan.
- **Tidak bisa melompat ke tanggal.** Jadwal selalu mulai dari hari ini, dan jadwal yang sudah
  lewat tidak bisa dibuka.
- **Tidak ada pencarian.** Jemaat tidak bisa mencari nama pelayan, judul, atau tempat. Seorang
  majelis atau pemusik yang ingin tahu kapan ia bertugas harus membaca semua jadwal.
- **Saringan di dalam hero.**
  - Saringan jenis dan rayon ada di hero foto, jauh dari daftar yang disaringnya.
  - Hanya satu pilihan per kelompok.
  - Memilih rayon menyembunyikan Kebaktian Minggu, karena kebaktian tidak terikat rayon.
- **Ponsel.** Hero setinggi 627 px mendorong jadwal pertama keluar dari layar pertama.

### 2.2 Data jadwal

Data demo, sesuai pola jemaat nyata, 1 September–31 Desember 2026:

- **Kepadatan.** ±10–11 ibadah per pekan, ±45 per bulan, paling banyak 3 per hari.
  - Desember akan lebih padat (rangkaian Natal), jadi tampilan harus tahan 6–8 ibadah per hari.
- **Jam.** Hanya beberapa jam yang dipakai:

  | Jam | Jumlah | Jenis ibadah |
  | --- | --- | --- |
  | 18.00 | 89 | ibadah rumah tangga rayon |
  | 07.00, 09.00, 17.00 | 18, 15, 18 | kebaktian |
  | 16.00 | 19 | kategorial |
  | 10.00, 19.00 | 4, 2 | – |

- **Tidak ada jam selesai.** Skema hanya menyimpan `worship_time` (jam mulai, migrasi 0006).
  - Kisi jam berdurasi seperti referensi 1 dan 3 akan mengarang lama ibadah.
  - Tampilan pekan karena itu memakai baris per jam yang benar-benar dipakai (seperti jadwal
    pelajaran), bukan kisi 24 jam.
- **Isi tiap jadwal.**
  - Paling banyak 6 petugas, dan judul paling panjang 47 karakter.
  - 82 tempat berbeda, kebanyakan alamat rumah keluarga ("Rumah Kel. Wadu-Logo, RT 026/RW 005").
- **API sekarang.** `GET /api/public/worships` sudah menerima `from`, `to`, `category`, `rayon_id`,
  `page`, dan `per_page` (maks. 100). Yang belum ada:
  - pencarian `q`;
  - satu jadwal per id.
- **Bug yang terkait.** D1 membatasi pola `LIKE` 50 byte (KONTEKS bagian 2). Pencarian baru tidak
  boleh memakai `containsPattern` apa adanya.

### 2.3 Referensi (gambar dari pengguna)

| Referensi | Diambil | Tidak diambil |
| --- | --- | --- |
| TaskTrak (pekan berkisi jam) | sisi kiri berisi kalender mini dan daftar saringan; kartu bertepi warna per jenis; kolom hari ini ditandai | kisi jam berdurasi (tidak ada jam selesai), avatar, tombol tambah melayang (portal hanya membaca) |
| Milao (bulan) | kisi bulan dengan label acara berwarna; titik di kalender mini; saringan bergaya label berwarna | daftar akun, "Add New Tag" |
| Kalender tim (pekan + rincian) | daftar kartu hari ini; panel rincian berisi chip jenis dan daftar anggota (bagi kita: petugas) | membuat rapat, saringan tim |

Bahasa visual tetap kage (dan Glassmorphism bila dipilih Admin). Yang ditiru dari referensi
adalah susunan dan pola kerjanya, bukan tampilannya.

## 3. Pendekatan

**Satu panel kalender** menggantikan papan daftar. Bagiannya:

- **Hero ringkas.** Judul, satu kalimat, dan satu temuan: ibadah berikutnya.
- **Panel kalender** selebar panel hero, dengan:
  - sisi kiri: kalender mini, kolom cari, saringan;
  - bilah alat: navigasi periode dan pilihan tampilan;
  - area tampilan: **Pekan**, **Agenda**, atau **Bulan**.
- **Panel rincian** di kanan (desktop) atau lembar bawah (ponsel) saat sebuah jadwal dipilih.

**Prinsip:**

- **Satu pekan muat satu layar.** Di 1440×900, tampilan Pekan memperlihatkan seluruh ±11 ibadah
  tanpa gulir.
- **Saringan instan.** Satu periode (pekan atau bulan) dimuat utuh. Saringan jenis dan rayon
  disaring di browser, tanpa menunggu server, dan hitungan di tiap saringan mengikuti periode.
- **Cari menembus periode.** Kata cari mencari di server, di seluruh jadwal mendatang, dan hasilnya
  tampil sebagai daftar. Kebutuhan utamanya: "kapan saya bertugas" melintasi bulan.
- **Tautan bisa dibagikan.** Tampilan, tanggal, saringan, kata cari, dan jadwal terpilih tersimpan
  di URL.
  - Contohnya untuk grup WhatsApp rayon: `/jadwal?tampilan=pekan&tanggal=2026-11-02&rayon=2`.
  - Tautan lama `?jenis=rayon&rayon=2` tetap berfungsi.
- **Tanpa pustaka kalender.** Kisi dibuat sendiri dengan CSS grid dan tabel, memakai pembantu
  tanggal WITA yang sudah ada. Bundel tidak membengkak.

## 4. Rincian

### 4.1 Tata letak

**Desktop ≥1024 px** (portal tampil 90%):

```
┌ hero ringkas ±240 px ────────────────────────────────────────────────────────┐
│ Jadwal Ibadah  mendatang.                                                    │
│ Berikutnya: Ibadah Rumah Tangga · Rayon Kapernaum · hari ini 18.00 WITA  →   │
└──────────────────────────────────────────────────────────────────────────────┘
┌ panel kalender (selebar hero) ──────────────────────────────────────────────┐
│ ┌ sisi kiri 280 ─┐ ┌ ‹ › Hari ini   2–8 November 2026   [Agenda|Pekan|Bulan] ┐ │
│ │ November 2026 ‹›│ ├──────────────────────────────────────────────────────┤ │
│ │ S S R K J S M   │ │        Sen 2   Sel 3   Rab 4   Kam 5   Jum 6   Sab 7   Min 8 │
│ │ kalender mini   │ │ 07.00                                          ▌Keb. Pagi │
│ │ (titik per jenis)│ │ 09.00                                          ▌Keb. PAR  │
│ │ ⌕ Cari nama…    │ │ 16.00                  ▌K. Ibu                            │
│ │ Jenis ibadah    │ │ 17.00                                          ▌Keb. Sore │
│ │ ☑ ▌Keb. Minggu 4│ │ 18.00  ▌Getsemani ▌Golgota ▌Tiberias ▌Galilea ▌Kapernaum   │
│ │ ☑ ▌Ibadah Rayon 5│ │                                                          │
│ │ ☑ ▌Kategorial  2│ │ 11 ibadah · Rayon: semua                                  │
│ │ ☑ ▌Khusus      0│ └──────────────────────────────────────────────────────┘ │
│ │ Rayon: Semua ▾  │                                                          │
│ └─────────────────┘                     (+ panel rincian 384 px di kanan)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Tablet 768–1023 px:**

- sisi kiri dilipat menjadi tombol "Saring" (lembar);
- tampilan Pekan tetap tujuh kolom;
- kartu memendek menjadi jam, jenis/rayon, dan judul.

**Ponsel <768 px:**

```
Jadwal Ibadah  mendatang.            (hero ringkas, tanpa foto tinggi)
Berikutnya: … hari ini 18.00 →
┌ bilah lengket ─────────────────────────────┐
│ November 2026 ‹ ›  Hari ini  [Agenda|Bulan]│
│ ⌕ Cari nama…                    Saring (2) │
│ Sen2 Sel3 Rab4 Kam5 Jum6 Sab7 [Min8]       │  ← pita pekan, titik per jadwal
└────────────────────────────────────────────┘
[Rayon Golgota ×] [Kategorial ×]                ← saringan aktif
Hari ini · Jumat, 30 Oktober
 18.00  Ibadah Rumah Tangga             ›
        ▌Rayon Kapernaum · Rumah Kel. Wadu-Logo
        Pnt. Ester Djami
```

### 4.2 Tampilan

**Pekan** (bawaan desktop dan tablet, J1):

- **Bentuk.** Tabel jadwal pelajaran: kolom Senin–Minggu, baris per jam yang dipakai pekan itu,
  ditambah baris "Jam menyusul" bila ada.
- **Penanda kolom.**
  - Minggu diberi latar sedikit berbeda (hari kebaktian).
  - Hari ini ditandai.
  - Hari yang sudah lewat dipudarkan.
- **Kartu ringkas.** Garis warna jenis, judul (maks. 2 baris), rayon atau jenis, tempat (1 baris),
  dan Pelayan Firman. Seluruh kartu adalah tombol yang membuka rincian.
- **Sel padat.** Sel yang berisi lebih dari 3 jadwal menampilkan "+N lainnya", yang membuka Agenda
  hari itu.

**Agenda** (bawaan ponsel):

- **Bentuk.** Daftar per hari untuk satu pekan.
- **Baris ringkas** (±72 px): jam mono | judul + chip jenis/rayon + tempat | Pelayan Firman dan
  Liturgos | ikon tata ibadah | tanda ›.
- **Lanjutan.** "Tampilkan pekan berikutnya" menambah satu pekan di bawahnya. Pengguna yang
  memutuskan menggulir lebih jauh, bukan halaman.
- **Pita pekan.** Di ponsel, mengetuk hari di pita pekan melompat ke hari itu.

**Bulan:**

- **Bentuk.** Kisi 6×7.
- **Isi sel.** Tiap sel memuat sampai 3 label "18.00 Rayon Golgota" dengan garis warna jenis,
  lalu "+N lainnya".
- **Sel hari.** Mengetuk nomor tanggal membuka Agenda hari itu. Hari di luar bulan dipudarkan.
- **Ponsel.** Kisi hanya berisi titik, dan daftar hari terpilih tampil di bawahnya.

**Hasil pencarian** (saat `cari` terisi, menggantikan tampilan aktif):

- Judulnya "6 jadwal mendatang untuk ‘ester’".
- Daftar per hari dari hari ini ke depan, dengan nama yang cocok ditebalkan di daftar petugas.
- "Muat lebih banyak" per 50.
- Tombol "Kembali ke kalender" mengosongkan kata cari.

### 4.3 Saringan dan navigasi

- **Kalender mini.**
  - Bulan berjalan dengan titik berwarna di tanggal yang berjadwal (paling banyak 3 titik, sesuai
    jenis).
  - Hari ini dilingkari, dan pekan/tanggal terpilih disorot.
  - Panah mengganti bulan, dan mengetuk tanggal melompat ke sana.
- **Jenis ibadah.**
  - Kotak centang dengan garis warna, label, dan jumlah di periode aktif.
  - Semua tercentang berarti tidak menyaring.
  - Pilihannya bisa lebih dari satu, mis. Kebaktian Minggu + Ibadah Rayon.
- **Rayon** (J3): pilihan tunggal "Semua rayon / Getsemani / …".
  - Rayon hanya menyaring ibadah yang terikat rayon.
  - Kebaktian Minggu, kategorial, dan ibadah khusus untuk seluruh jemaat tetap tampil. Jemaat
    Golgota melihat ibadah Golgota ditambah ibadah seluruh jemaat.
  - Kalimat kecil menjelaskan: "Ibadah rayon lain disembunyikan."
- **Cari** (J4):
  - satu kolom "Cari nama pelayan, judul, tema, atau tempat", ditunda 300 ms;
  - maks. 100 karakter, 5 kata, setiap kata harus cocok.
- **Bilah alat.**
  - ‹ › pindah satu periode, dan "Hari ini" kembali ke pekan/bulan berjalan.
  - Label periode berbunyi "2–8 November 2026".
  - Pilihan tampilan memakai komponen segmen.
- **Hitungan.**
  - "11 ibadah" di bawah area tampilan, dihitung dari jadwal yang lolos saringan.
  - Hitungan yang berubah diumumkan ke pembaca layar (`aria-live`).
- **Saringan aktif.** Chip yang bisa dilepas, ditambah "Hapus semua saringan".
- **Ponsel.** Saringan (jenis, rayon) ada di lembar bawah "Saring". Angka di tombolnya adalah
  jumlah saringan aktif.

### 4.4 Rincian jadwal (J7)

Panel kanan 384 px di desktop, lembar bawah di ponsel (Radix Dialog: fokus terkunci, Esc menutup,
fokus kembali ke kartu).

**Isi:**

- chip jenis dan rayon;
- judul;
- hari, tanggal, dan jam (mis. "Besok · Sabtu, 31 Oktober 2026 · 17.00 WITA");
- tempat;
- tema dan bacaan;
- seluruh petugas, urut seperti tata ibadah;
- tombol "Unduh tata ibadah (PDF)" bila ada.

**Aksi:**

- "Salin tautan", yang menghasilkan alamat `?jadwal=<id>`;
- "Bagikan" (Web Share API di ponsel, bila tidak ada jatuh ke salin tautan).

**Tautan langsung.** `?jadwal=123` membuka panel ini saat halaman dimuat, termasuk bila jadwalnya
di luar periode yang tampil. Untuk itu dibutuhkan `GET /api/public/worships/:id`.

**Di luar lingkup rencana ini:**

- "Tambah ke kalender" (.ics), karena tanpa jam selesai acaranya tidak berdurasi (J8);
- tautan peta, karena kebanyakan tempat adalah alamat rumah keluarga yang tidak bisa dicari di
  peta (J9).

### 4.5 URL

| Parameter | Nilai | Bawaan |
| --- | --- | --- |
| `tampilan` | `pekan`, `agenda`, `bulan` | `pekan` (desktop/tablet), `agenda` (ponsel) |
| `tanggal` | `YYYY-MM-DD`, jangkar periode | hari ini (WITA) |
| `jenis` | `sunday_service`, `rayon`, `categorical`, `special`, dipisah koma | semua |
| `rayon` | id rayon | semua |
| `cari` | teks | – |
| `jadwal` | id jadwal yang dibuka | – |

**Cara kerja URL:**

- Navigasi periode memakai `replace`, sehingga riwayat tidak penuh oleh klik ‹ ›.
- Membuka dan menutup rincian memakai `push`, sehingga tombol Kembali di ponsel menutup lembar.
- Nilai yang tidak sah diabaikan dan memakai bawaan.

### 4.6 API — [src/worker/routes/public.ts](../src/worker/routes/public.ts)

Bentuk respons tetap `ApiPage<PublicWorshipItem>`, jadi Beranda tidak terpengaruh.

- **`q` di `GET /api/public/worships`.**
  - Tiap kata harus cocok dengan salah satu kolom:
    - judul, tempat, tema, bacaan;
    - nama rayon;
    - nama petugas (`EXISTS` ke `worship_servants`).
  - Pencocokannya memakai `instr(lower(kolom), lower(?)) > 0`, tanpa batas 50 byte `LIKE`.
  - Hasilnya urut tanggal dan jam.
- **Mode rentang.** Bila `from` dan `to` diisi dan rentangnya ≤ 42 hari (kisi bulan), `per_page`
  boleh sampai 300.
  - Satu permintaan memuat seluruh periode.
  - Paging biasa tetap maks. 100.
- **`GET /api/public/worships/:id`.**
  - Satu jadwal publik beserta petugasnya.
  - `404` untuk jadwal yang tidak ada atau tidak publik (`is_public = 0`).
- **Validasi.**
  - `q` lebih dari 100 karakter → `400` dengan `details`.
  - Rentang lebih dari 42 hari dengan `per_page` lebih dari 100 → `400`.
- **Usulan terpisah.** Pembantu pencocokan yang sama dipakai untuk memperbaiki bug `LIKE` 50 byte
  di kotak cari lain (`containsPattern`). Ini bukan bagian rencana ini; bisa satu commit sendiri
  bila disetujui.

### 4.7 Berkas

| Berkas | Isi |
| --- | --- |
| `src/client/lib/schedule-calendar.ts` (baru) | Hitungan tanggal WITA (awal pekan Senin, kisi bulan 6×7, rentang per tampilan), baca/tulis URL, saringan di browser, hitungan per jenis/rayon/hari, baris jam pekan, pengelompokan per hari |
| `src/client/lib/use-schedule-calendar.ts` (baru) | Hook halaman: keadaan dari URL, data kisi bulan, pencarian, rincian per id, `update()` |
| `src/client/components/portal/schedule/` (baru) | `calendar-panel.tsx` (bingkai, bilah alat), `mini-month.tsx`, `schedule-filters.tsx` (+ lembar ponsel), `week-table.tsx`, `month-grid.tsx`, `agenda-list.tsx`, `week-strip.tsx`, `worship-card.tsx`, `worship-detail.tsx` |
| `src/client/pages/public/SchedulePage.tsx` | Disusun ulang dari komponen di atas |
| `src/client/components/portal/kage/hero-panel.tsx` | Ukuran baru `compact` (±240 px desktop, ±200 px ponsel) |
| `src/client/index.css` | Token warna jenis ibadah `--site-kind-*` (terang/gelap), varian kaca untuk panel kalender |
| `src/worker/routes/public.ts`, `src/shared/types.ts` | `q`, mode rentang, `/:id` |
| `README.md`, `KONTEKS_PROJECT.md` | Rute, API, desain |

`ScheduleBoard` tetap dipakai Beranda dan tidak diubah.

### 4.8 Warna, tema, dan aksesibilitas

**Warna jenis ibadah:** empat token `--site-kind-*`, divalidasi di Tahap 0 (bagian 10).

| Jenis ibadah | Terang | Gelap |
| --- | --- | --- |
| Kebaktian Minggu | biru `#2a78d6` | `#3987e5` |
| Ibadah Rayon | hijau `#008300` | `#008300` |
| Ibadah Kategorial | kuning `#eda100` | `#c98500` |
| Ibadah Khusus | magenta `#e87ba4` | `#d55181` |

- Warna hanya untuk garis tepi kartu, titik kalender, dan kotak saringan.
- Teks selalu memakai token tinta (`text-site-ink`, `text-site-muted`), bukan warna jenis.
- Warna tidak pernah berdiri sendiri; selalu ada label teksnya. Label ini juga yang membuat
  kuning dan magenta di permukaan terang (kontras <3:1) dan pemisahan buta warna mode gelap
  (rentang batas 6–8) sah.

**Tema:**

- Bawaan: panel kalender terang (J6) di atas kanvas, sisi kiri `bg-site-paper`.
- Glassmorphism: panel `glass:glass-card` dan kartu kaca tipis.
- Terang/gelap mengikuti token yang ada.
- Skala 90% dan tinggi berbasis `--site-zoom` dipatuhi.

**Aksesibilitas:**

- Tampilan Pekan adalah `<table>` dengan `<caption>`, judul kolom hari, dan judul baris jam.
- Tombol tanggal berlabel lengkap, mis. "Senin, 2 November 2026, 3 ibadah", dengan
  `aria-current="date"` untuk hari ini.
- Kalender mini bisa dijalankan dengan tombol panah.
- Target sentuh ≥44 px di ponsel, dan teks memenuhi lantai `--text-sm`.
- Bila pengguna meminta kurangi gerak, tidak ada animasi. Isi panel kalender tidak memakai `Reveal`
  agar langsung tampil.
- Lembar dan panel yang bisa digulir memakai `data-lenis-prevent`.

**Keadaan:**

- **Memuat:** kerangka setinggi ukuran aslinya.
- **Kosong:** "Belum ada ibadah di pekan ini" beserta tautan ke pekan berikutnya yang berjadwal.
- **Gagal:** pesan dan "Coba lagi".
- **Saringan menyisakan nol:** pesan dan "Hapus saringan".

## 5. Yang tidak berubah

- Papan jadwal di Beranda (`ScheduleBoard`) dan tautan "Semua jadwal ibadah" ke `/jadwal`.
- Dashboard Jadwal Ibadah, skema database (tanpa migrasi), dan data apa saja yang publik. Nama
  petugas sudah tampil di portal sekarang.
- Pengaturan tema portal (Bawaan/Glassmorphism) dan terang/gelap.

## 6. Pemeriksaan

- **Uji API.**
  - `q` cocok di nama petugas, tempat, nama rayon, dan tema.
  - Kata ≥49 karakter tidak memicu `500`.
  - Batas mode rentang dan `400`-nya.
  - `/:id` untuk jadwal publik, jadwal tidak publik (`404`), dan id yang salah.
- **Uji layar** (Chrome headless, data demo lokal):
  - Pekan 1440×900 memuat seluruh pekan tanpa gulir, dan jadwal pertama di ponsel ada di layar
    pertama.
  - Ketiga tampilan.
  - Saringan dan hitungannya.
  - Cari lintas bulan.
  - Tautan langsung `?jadwal=`, tautan lama `?jenis=&rayon=`, dan tombol Kembali menutup lembar.
  - Jadwal tanpa jam.
  - Hari dengan lebih dari 3 jadwal (data uji Desember).
- **Tema.** Bawaan dan Glassmorphism × terang dan gelap, desktop 90% dan ponsel 100%, juga dengan
  kurangi gerak.
- **Aksesibilitas.**
  - Keyboard: Tab, panah di kalender mini, Esc menutup panel.
  - Pembaca layar dasar.
  - Lighthouse aksesibilitas 100.
- **Inspector skill** `design-taste-frontend` untuk halaman, dan aturan layar aplikasi untuk panel
  kalender.

## 7. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Pekan padat (Natal) membuat sel penuh | "+N lainnya" membuka Agenda hari itu; kartu ringkas maks. 2 baris judul |
| Tujuh kolom sempit di tablet | Kartu tablet hanya jam, jenis, judul; rincian lewat panel |
| Jemaat terbiasa dengan daftar lama | Agenda tetap tersedia dan menjadi bawaan ponsel; tautan lama tetap berlaku |
| Pencarian `instr` lebih lambat dari indeks | Data jadwal kecil (ratusan per tahun); dibatasi `from` hari ini dan paging 50 |
| Gulir halus Lenis mengganggu panel bergulir | `data-lenis-prevent` di panel rincian, lembar saring, dan sel padat |

## 8. Keputusan (dikonfirmasi 30 Oktober 2026: semua sesuai usulan)

| # | Keputusan | Usulan |
| --- | --- | --- |
| J1 | Tampilan bawaan | Pekan di desktop/tablet, Agenda di ponsel |
| J2 | Hero | Dipadatkan (±240 px) dengan kalimat "Berikutnya: …"; saringan pindah ke panel kalender |
| J3 | Arti saringan rayon | Hanya menyaring ibadah rayon; ibadah seluruh jemaat tetap tampil |
| J4 | Cakupan cari | Judul, tempat, tema, bacaan, nama rayon, dan nama semua petugas; hanya jadwal mendatang |
| J5 | Jadwal yang sudah lewat | Bisa dibuka dengan navigasi mundur (mis. melihat tema dan tata ibadah Minggu lalu) |
| J6 | Warna panel kalender | Terang (seperti referensi); papan gelap tetap di Beranda |
| J7 | Bentuk rincian | Panel kanan (desktop) / lembar bawah (ponsel), bukan popover |
| J8 | Tambah ke kalender (.ics) | Ditunda; tanpa jam selesai acaranya tidak berdurasi |
| J9 | Tautan peta | Tidak; kebanyakan tempat adalah alamat rumah keluarga |

## 9. Tahapan

Dikerjakan di branch `feat/kalender-jadwal-ibadah` dari `main`, sesudah branch
`feat/tema-portal-glassmorphism` di-merge (halaman ini harus mendukung kedua tema). Setiap tahap
diakhiri tangkapan layar dan menunggu persetujuan sebelum commit.

| Tahap | Isi | Hasil yang diperiksa |
| --- | --- | --- |
| 0 | Persiapan: konfirmasi J1–J9, validasi palet jenis ibadah, data uji hari padat | Palet lolos validator |
| 1 | API: `q`, mode rentang, `/:id`, uji API | Semua uji API lolos |
| 2 | Lapisan data klien: `schedule-calendar.ts`, URL, saringan dan hitungan | Uji unit hitungan tanggal (awal pekan, kisi bulan, WITA) |
| 3 | Kerangka: hero ringkas, panel kalender, bilah alat, kalender mini, saringan, lembar saring ponsel | Tangkapan layar desktop/ponsel |
| 4 | Tampilan Pekan dan Agenda, kartu ringkas, pita pekan | Satu pekan muat satu layar desktop |
| 5 | Tampilan Bulan dan hasil pencarian | Cari lintas bulan, "+N lainnya" |
| 6 | Panel rincian, tautan langsung, salin/bagikan | Tautan `?jadwal=` dan tombol Kembali |
| 7 | Tema dan keadaan, aksesibilitas, QA penuh, dokumentasi | Daftar bagian 6 |

## 10. Catatan pelaksanaan

### Tahap 0 — Persiapan (30 Oktober 2026)

**Keputusan.** J1–J9 disetujui pengguna, semua sesuai usulan.

**Palet jenis ibadah** divalidasi dengan validator skill `dataviz`:

- **Cara uji.**
  - Ada empat jenis yang bisa bersebelahan dalam urutan apa pun, jadi diuji `--pairs all`.
  - Kandidat diambil dari palet kategori yang terdokumentasi (8 keluarga warna, nilai terang dan
    gelap); tidak ada warna yang dikira-kira.
- **Usulan awal gugur.** Biru `site-blue` `#00236f` terlalu gelap untuk rentang terang palet
  kategori.
- **Set lain yang gugur:**
  - biru + jingga + aqua + ungu: biru dan ungu terlalu mirip di penglihatan normal (ΔE 10,5);
  - biru + kuning + aqua + merah: lolos terang, tetapi merah dan kuning gelap terlalu mirip
    (ΔE 13,0 < 15).
- **Pencarian menyeluruh.** Ke-70 kombinasi 4 dari 8 keluarga warna diuji di kedua mode. Hanya dua
  yang lolos keduanya:
  - biru + kuning + magenta + hijau (dipilih);
  - kuning + magenta + hijau + ungu.

  Biru dipertahankan untuk Kebaktian Minggu.
- **Hasil set terpilih** di semua permukaan portal (putih `#ffffff`, kertas `#f6f6f4`, kaca terang
  `#f3eee8`; gelap `#0a1215`, kertas gelap `#111b1f`, kaca gelap `#061317`): **lolos semua**.

  | Pemeriksaan | Terang | Gelap |
  | --- | --- | --- |
  | Rentang terang (L) dan kroma | lolos | lolos |
  | Pemisahan buta warna (ΔE, target ≥8) | 13,0 | 6,9 (rentang batas, sah dengan label) |
  | Penglihatan normal (ΔE, min. 15) | 19,6 | 19,3 |
  | Kontras ke permukaan (≥3:1) | kuning 1,9–2,2 dan magenta 2,3–2,7 dengan label | semua ≥3:1 |

**Sisa Tahap 0.** Data uji hari padat (6–8 ibadah per hari, pola Natal) disiapkan di database uji
scratch pada awal Tahap 1, bukan di database lokal pengguna.

### Tahap 1 — API (30 Oktober 2026)

Dikerjakan di branch `feat/kalender-jadwal-ibadah` dari `main` (`0c56522`). Rinciannya ada di
README bagian "Konten Portal Publik (CMS)".

- **Pencarian `q`** di `GET /api/public/worships`.
  - Setiap kata harus cocok di salah satu kolom: judul, sebutan jenis, tempat, tema, bacaan,
    nama rayon, atau nama petugas.
  - Sebutan jenis ikut dicari agar "rayon golgota" dan "kebaktian" menemukan jadwalnya: judul ibadah
    rayon sendiri tidak memuat kata "rayon" ("Ibadah Rumah Tangga").
  - Pencocokan memakai `instr(lower(kolom), kata)`, bukan `LIKE`: tidak terkena batas pola 50 byte
    D1, dan `%`/`_` dibaca harfiah. Kotak cari lain masih memakai `containsPattern` (usulan
    terpisah, bagian 4.6).
- **Mode rentang.** `from` + `to` paling lama 42 hari boleh `per_page` sampai 300.
  - `readPaging` mendapat batas opsional; rute lain tetap maks. 100.
- **`GET /api/public/worships/:id`** (`PublicWorshipResponse`).
  - Bentuknya sama persis dengan item daftar, termasuk jadwal yang sudah lewat.
  - `404` untuk jadwal internal dan id yang salah.
  - Pengurutan petugas dipakai bersama dengan daftar (`sortServants`).
- **Data uji** di D1 scratch `kalender-test`, bukan database lokal pengguna:
  - 10 jadwal sekitar hari ini dengan petugas yang dicari;
  - satu rapat internal dan satu jadwal tanpa jam;
  - hari padat Natal: 7 ibadah pada 24 Desember dan 4 pada 25 Desember;
  - 126 ibadah dalam rentang 42 hari (1 Februari–14 Maret 2027) untuk mode rentang.

  Ini sekaligus menutup sisa Tahap 0.
- **Uji API: 48/48 lolos.**
  - Regresi saringan, paging, dan cache.
  - Pencarian per kolom, termasuk kata 60 karakter tanpa `500` serta `%` dan `_` harfiah.
  - Batas mode rentang: 42 hari lolos, 43 hari ditolak, `per_page` 301 ditolak.
  - Hari padat urut jam.
  - Rincian per id dan `404`.
- **Regresi lain.** Batas 100 per halaman tetap di `/api/public/contents`, Beranda normal, halaman
  Jadwal lama tetap jalan. Typecheck dan lint lolos.

### Tahap 2 — Lapisan data klien (30 Oktober 2026)

**[src/client/lib/schedule-calendar.ts](../src/client/lib/schedule-calendar.ts)**: fungsi murni
tanpa React. Semua tanggal YYYY-MM-DD (WITA) dihitung di UTC, jadi zona waktu perangkat tidak
menggeser hari.

- **Tanggal.**
  - Awal pekan Senin, tanggal sepekan, kisi bulan 6×7.
  - Geser periode: ±7 hari, atau ke hari pertama bulan sebelum/berikutnya.
  - Label periode: "2–8 November 2026", "26 Oktober–1 November 2026",
    "28 Desember 2026–3 Januari 2027", dan "November 2026".
- **Data dimuat per kisi bulan** (`loadRange`, 42 hari, di dalam batas mode rentang API).
  - Pekan jangkar selalu berada di dalam kisi bulannya; ini diperiksa untuk setiap hari
    2026–2028.
  - Akibatnya, berpindah pekan di bulan yang sama atau berganti tampilan tidak memuat ulang data.
  - Kalender mini di sisi kiri mendapat titiknya dari data yang sama.
- **URL** (`parseCalendarParams`, `calendarParams`): parameter `tampilan`, `tanggal`, `jenis`,
  `rayon`, `cari`, `jadwal`.
  - Nilai yang tidak sah memakai bawaan.
  - Keempat jenis sekaligus berarti tanpa saringan.
  - Nilai bawaan tidak ditulis, jadi tautan tanpa `tanggal` selalu berarti "pekan ini" bagi
    penerimanya.
  - Tautan lama `?jenis=rayon&rayon=2` tetap terbaca; `page` dari daftar lama dibuang.
- **Saringan dan hitungan.**
  - Jenis (pilih banyak) dan rayon dengan arti J3: ibadah tanpa rayon selalu ikut.
  - Hitungan per jenis mengabaikan saringan jenis tetapi mengikuti rayon. Hitungan per rayon
    hanya menghitung ibadah yang terikat rayon dan mengikuti saringan jenis.
  - Pengelompokan per tanggal, ringkasan titik per hari, dan baris jam Pekan (jadwal tanpa jam di
    baris terakhir).

**[src/client/lib/use-schedule-calendar.ts](../src/client/lib/use-schedule-calendar.ts)**: keadaan
dari URL, dengan bawaan Agenda di bawah 768 px dan Pekan di atasnya.

- **Data.**
  - Kisi bulan dimuat dengan `per_page` 300.
  - Pencarian (`q`, 50 per halaman) hanya saat `cari` terisi.
  - Rincian per id hanya bila jadwalnya tidak ada di data yang sudah dimuat.
- **`update()`.**
  - Dibangun dari URL saat ini.
  - Periode dan saringan memakai `replace`; membuka rincian memakai `push`.
  - Hook ini baru dipakai halaman di Tahap 3.

**Uji unit: 55/55 lolos** di empat zona waktu yang benar-benar aktif (Asia/Makassar,
America/Los_Angeles, Pacific/Kiritimati, UTC).

- Uji dibundel esbuild dengan `tsconfig.app.json`, karena proyek belum punya test runner.
- Isinya:
  - awal pekan, termasuk pergantian tahun;
  - kisi bulan, termasuk bulan yang mulai hari Minggu;
  - geser bulan dari tanggal 31;
  - label lintas bulan dan tahun;
  - URL bolak-balik di desktop dan ponsel, tautan lama;
  - saringan J3 dan hitungan.
- Typecheck dan lint lolos.
