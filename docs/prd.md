# Sistem Informasi GMIT Lahairoi

## Ringkasan
Sistem Informasi GMIT Lahairoi adalah platform manajemen gereja terpadu dan portal informasi publik yang dirancang khusus untuk GMIT Jemaat Lahairoi Tuak Sabu Lasiana. Aplikasi ini ditujukan bagi pengurus gereja (Admin, Bendahara, Pendeta, Majelis) serta sekitar 1.200 warga jemaat untuk memodernisasi pengelolaan administrasi, layanan sakramen, dan penyebaran informasi. Sistem ini menggantikan pencatatan manual berbasis Excel menjadi database digital terpusat dengan sistem akuntansi multi-pos dan anggaran (RAPBJ) yang transparan.

## Asumsi
- Pembagian wilayah pelayanan jemaat menggunakan sistem **5 Rayon** dengan penamaan wilayah Alkitabiah yang dimuat sebagai data awal (*seed data*): **1. Getsemani**, **2. Golgota**, **3. Tiberias**, **4. Galilea**, dan **5. Kapernaum** (dengan tetap mendukung penambahan/pengubahan rayon ke depannya). Struktur kategorial meliputi PAR (Pelayanan Anak & Remaja), Pemuda, Kaum Ibu, Kaum Bapak, dan Lansia.
- Struktur kode mata anggaran RAPBJ dirancang sepenuhnya fleksibel (dapat dikustomisasi kode dan namanya oleh Bendahara/Admin) tanpa terikat pada satu format kaku, dengan beberapa contoh pos dasar yang dapat diedit.
- Pencetakan sertifikat/surat sakramen (Baptis, Sidi, Nikah) mendukung dua mode cetak sekaligus: (1) Cetak lengkap beserta desain bingkai dan kop surat resmi GMIT Jemaat Lahairoi di atas kertas kosong, serta (2) Cetak teks isian saja (*text-only overlay*) untuk dicetak langsung di atas kertas blangko sertifikat fisik milik gereja.
- Penyimpanan file dokumen (bukti kuitansi keuangan, PDF Warta Jemaat, tata ibadah/liturgi, foto dokumentasi, dan berkas pendaftaran sakramen) menggunakan penyimpanan objek berbasis cloud atau enkoding yang terintegrasi dengan ekosistem Cloudflare.
- QRIS dan rekening persembahan di Portal Publik bersifat informatif (statis); verifikasi mutasi tetap dicatat oleh Bendahara ke dalam modul keuangan melalui unggah bukti atau rekap mingguan.
- Jemaat umum tidak memerlukan akun login pada rilis ini; seluruh interaksi jemaat (baca warta, lihat jadwal, daftar baptis/sidi/nikah) dilakukan langsung melalui Portal Publik dengan pelacakan menggunakan kode registrasi unik.

## Target Pengguna
1. **Administrator / Tata Usaha Gereja**: Membutuhkan sistem untuk migrasi data 1.200 jemaat dari Excel, mengelola Kartu Keluarga & Rayon, memperbarui konten portal publik (warta, jadwal, renungan), serta mengelola surat-menyurat dan pendaftaran sakramen.
2. **Bendahara Jemaat**: Membutuhkan sistem akuntansi multi-pos (Kas Umum, Pembangunan, Diakonia, dll.), penyusunan anggaran tahunan (RAPBJ), pencatatan transaksi kas masuk/keluar beserta bukti kuitansi, serta pencetakan laporan keuangan mingguan untuk Warta Jemaat.
3. **Pendeta**: Membutuhkan akses ke profil demografi jemaat, jadwal pelayanan & khotbah, verifikasi layanan pastoral (baptis, sidi, nikah), serta ringkasan analitik perkembangan jemaat dan keuangan.
4. **Majelis Gereja (Penatua & Diaken)**: Membutuhkan akses informasi anggota jemaat di rayon masing-masing, jadwal tugas pelayanan hari Minggu/rayon, serta pencatatan kehadiran ibadah dan peminjaman inventaris.
5. **Warga Jemaat & Masyarakat Umum (Pengunjung Portal Publik)**: Membutuhkan akses cepat tanpa login untuk membaca Warta Jemaat, jadwal ibadah, renungan harian, informasi rekening/QRIS persembahan, dan formulir pendaftaran sakramen online.

---

## Fitur

### Autentikasi & Manajemen Hak Akses (Fase 1)
**Deskripsi**: Sistem keamanan masuk dan pembagian wewenang khusus untuk staf internal dan majelis gereja guna menjaga kerahasiaan data jemaat dan validitas pencatatan keuangan.

**User Story**: Sebagai Admin Gereja, saya ingin mengelola akun pengurus dan membatasi hak akses berdasarkan peran (Admin, Bendahara, Pendeta, Majelis), supaya data sensitif seperti keuangan hanya dapat diubah oleh pihak yang berwenang.

**Sub-fitur**:
- **Login Multi-Peran**: Halaman login aman menggunakan email/username dan kata sandi untuk Admin, Bendahara, Pendeta, dan Majelis Gereja.
- **Pengaturan Hak Akses (RBAC)**: Pembatasan akses menu dan aksi (lihat, tambah, ubah, hapus) berdasarkan peran; modul transaksi keuangan hanya dapat diedit oleh Bendahara, sedangkan Pendeta dan Majelis memiliki akses baca (read-only) pada laporan.
- **Manajemen Akun Pengurus**: Fitur bagi Admin untuk menambah akun baru, menonaktifkan akun majelis yang purna-tugas, atau mengatur ulang kata sandi.
- **Log Aktivitas Pengguna**: Pencatatan otomatis setiap riwayat perubahan data penting (siapa mengubah apa dan kapan) di dalam dashboard untuk menjaga transparansi.

**Kriteria Penerimaan**:
- [ ] Pengguna dengan peran `Bendahara` dapat membuat dan mengedit transaksi keuangan, sedangkan peran `Majelis` hanya dapat melihat laporan keuangan tanpa tombol tambah/edit/hapus.
- [ ] Pengguna dengan peran selain `Admin` tidak dapat mengakses halaman Manajemen Akun Pengurus.
- [ ] Akun yang statusnya dinonaktifkan oleh Admin otomatis ditolak saat mencoba login dan sesi aktifnya dihentikan.
- [ ] Setiap aksi penambahan, pengeditan, atau penghapusan pada data Jemaat dan Keuangan tercatat di tabel Log Aktivitas dengan informasi nama pengguna, waktu, jenis aksi, dan entitas yang diubah.

---

### Database Jemaat & Kepala Keluarga (Fase 1)
**Deskripsi**: Pengelolaan terpusat untuk sekitar 1.200 jiwa anggota jemaat GMIT Lahairoi yang terstruktur berdasarkan Kartu Keluarga (KK) gereja dan pengelompokan 5 Rayon pelayanan (Getsemani, Golgota, Tiberias, Galilea, Kapernaum).

**User Story**: Sebagai Admin dan Majelis Gereja, saya ingin mengelola data kepala keluarga dan anggota jemaat per rayon serta mengimpor data lama dari Excel, supaya seluruh data 1.200 jiwa jemaat tersimpan rapi dan mudah dicari berdasarkan kategori pelayanan.

**Sub-fitur**:
- **Manajemen Kartu Keluarga (KK) Gereja**: Pencatatan nomor KK gereja, kepala keluarga, alamat, penempatan Rayon (Getsemani, Golgota, Tiberias, Galilea, Kapernaum), dan hubungan tiap anggota keluarga (Kepala Keluarga, Istri, Anak, Tanggungan).
- **Profil Lengkap Anggota Jemaat**: Pendataan biodata individu meliputi NIK/Nomor Induk Gereja, tanggal lahir, jenis kelamin, golongan darah, pendidikan, pekerjaan, status baptis, status sidi, status pernikahan, dan kategori pelayanan (PAR, Pemuda, Kaum Ibu, Kaum Bapak, Lansia).
- **Impor & Ekspor Data Excel/CSV**: Fitur migrasi cepat menggunakan template CSV/Excel untuk mengunggah data jemaat lama sekaligus, serta mengekspor hasil filter ke file CSV/Excel.
- **Pencarian & Filter Demografi**: Pencarian cepat anggota jemaat berdasarkan nama, nomor KK, rayon, kategori usia/kategorial, golongan darah, atau status sakramen (belum/sudah baptis/sidi).

**Kriteria Penerimaan**:
- [ ] Sistem telah memiliki 5 Rayon bawaan (`Getsemani`, `Golgota`, `Tiberias`, `Galilea`, `Kapernaum`), dan Admin dapat membuat Kartu Keluarga baru, menetapkan Rayon, serta menambahkan beberapa anggota jemaat ke dalam KK tersebut.
- [ ] Sistem dapat memproses unggahan file CSV/Excel berisi ratusan baris data jemaat, mencocokkan nama Rayon secara otomatis, menampilkan pratinjau validasi, dan menyimpannya ke database tanpa duplikasi Nomor Induk.
- [ ] Filter pencarian dapat mengombinasikan minimal 3 parameter sekaligus (contoh: Rayon "Getsemani" + Kategori "Pemuda" + Status Sidi "Belum").
- [ ] Tombol Ekspor mengunduh data jemaat sesuai filter yang sedang aktif dalam format CSV/Excel yang rapi.

---

### Manajemen Keuangan Multi-Pos & Anggaran (Fase 1)
**Deskripsi**: Sistem akuntansi gereja berbasis multi-pos yang fleksibel untuk mengelola kas, menyusun Rencana Anggaran Pendapatan dan Belanja Jemaat (RAPBJ) tahunan, serta mencatat penerimaan dan pengeluaran di berbagai pos pelayanan.

**User Story**: Sebagai Bendahara Gereja, saya ingin mengatur kode mata anggaran secara fleksibel, mencatat transaksi kas masuk dan keluar pada pos-pos anggaran yang berbeda, serta mencetak rekapitulasi mingguan, supaya laporan keuangan gereja akurat, sesuai RAPBJ, dan siap dilampirkan pada Warta Jemaat setiap hari Minggu.

**Sub-fitur**:
- **Pengaturan Pos Akun & Anggaran (RAPBJ) Fleksibel**: Pembuatan dan pengelolaan kode serta nama pos keuangan (Kas Umum/Sinode, Kas Pembangunan, Kas Diakonia, Kas Kategorial, dll.) dan mata anggaran penerimaan/pengeluaran yang dapat disesuaikan secara bebas oleh Bendahara beserta penetapan target anggaran tahunan.
- **Pencatatan Transaksi Kas Masuk & Keluar**: Input pemasukan (kolekte ibadah minggu, kolekte rayon, persepuluhan, nazar/syukur, donasi) dan pengeluaran operasional lengkap dengan tanggal, pos kas, mata anggaran, nominal, keterangan, dan unggah foto/file bukti kuitansi.
- **Monitoring Realisasi Anggaran**: Pelacakan otomatis persentase serapan anggaran pengeluaran dan pencapaian target penerimaan dibanding realisasi aktual pada setiap pos secara real-time.
- **Laporan Keuangan & Cetak Warta**: Pembuatan rekapitulasi laporan keuangan mingguan (kas masuk, kas keluar, saldo awal, saldo akhir per pos), bulanan, dan tahunan dalam tampilan siap cetak (print-friendly) atau ekspor untuk lampiran Warta Jemaat.

**Kriteria Penerimaan**:
- [ ] Bendahara dapat menambah, mengubah, atau menonaktifkan Pos Kas dan kode/nama mata anggaran RAPBJ secara fleksibel tanpa terkunci pada struktur kode statis.
- [ ] Setiap input transaksi Kas Masuk atau Kas Keluar secara otomatis memperbarui saldo Pos Kas terkait dan persentase realisasi mata anggaran RAPBJ.
- [ ] Transaksi dapat dilampiri bukti gambar/PDF kuitansi dan dapat dilihat kembali dari detail transaksi.
- [ ] Sistem dapat menghasilkan Laporan Keuangan Mingguan dengan rentang tanggal tertentu yang menampilkan saldo awal, rincian pemasukan, rincian pengeluaran, dan saldo akhir untuk setiap Pos Kas.

---

### Portal Informasi Publik & Warta (Fase 1)
**Deskripsi**: Halaman depan situs web resmi GMIT Lahairoi Tuak Sabu Lasiana yang dapat diakses oleh seluruh jemaat dan masyarakat umum tanpa perlu login.

**User Story**: Sebagai Warga Jemaat, saya ingin mengakses jadwal ibadah, membaca warta jemaat mingguan, renungan harian, serta melihat nomor rekening/QRIS gereja melalui ponsel saya, supaya saya tetap terhubung dengan kegiatan dan pelayanan gereja kapan saja.

**Sub-fitur**:
- **Profil, Sejarah & Struktur GMIT Lahairoi**: Halaman statis yang menampilkan sejarah Jemaat Lahairoi Tuak Sabu Lasiana, visi misi, informasi 5 Rayon pelayanan, serta daftar dan foto Pendeta serta Majelis Jemaat periode berjalan.
- **Warta Jemaat Digital & Artikel Rohani**: Publikasi pengumuman mingguan dan fitur unduhan dokumen Warta Jemaat lengkap dalam format PDF.
- **Papan Jadwal Ibadah & Kegiatan Publik**: Tampilan jadwal kebaktian Minggu, ibadah rumah tangga per rayon (Getsemani, Golgota, Tiberias, Galilea, Kapernaum), ibadah kategorial, dan acara gerejawi mendatang.
- **Informasi Rekening Persembahan & QRIS**: Halaman khusus yang menampilkan daftar nomor rekening bank resmi gereja (per pos kas jika ada) dan gambar kode QRIS resmi untuk persembahan syukur/persepuluhan digital.
- **Renungan Harian dan Artikel Rohani**: Halaman daftar dan bacaan renungan harian serta artikel pembinaan iman yang ditulis oleh Pendeta/Majelis.
- **Berita dan Pengumuman**: Publikasi berita kegiatan jemaat, pengumuman dukacita, atau informasi pelayanan klasis/sinode.
- **Media dan Dokumentasi**: Galeri foto dan tautan video dokumentasi kegiatan gereja dan hari raya gerejawi.

**Kriteria Penerimaan**:
- [ ] Seluruh halaman Portal Publik dapat diakses tanpa login dan responsif di layar perangkat mobile maupun desktop.
- [ ] Pengunjung dapat melihat dan mengunduh file PDF Warta Jemaat terbaru langsung dari halaman Warta.
- [ ] Halaman Jadwal Ibadah menampilkan daftar ibadah terdekat yang dapat difilter berdasarkan jenis ibadah (Kebaktian Minggu, Ibadah Rayon, Kategorial) dan nama Rayon.
- [ ] Halaman Persembahan menampilkan gambar QRIS dengan jelas beserta tombol salin (copy-to-clipboard) untuk nomor rekening bank gereja.
- [ ] Admin dapat menambah, mengedit, dan mempublikasikan konten Renungan, Berita, Warta PDF, dan Galeri Media dari dalam Dashboard.

---

### Penjadwalan Ibadah, Pelayan & Kehadiran (Fase 2)
**Deskripsi**: Pengaturan jadwal tugas pelayanan kebaktian (pengkhotbah, majelis bertugas, pemusik) serta pencatatan statistik kehadiran jemaat di setiap sesi ibadah.

**User Story**: Sebagai Pendeta dan Admin, saya ingin menyusun jadwal pelayan kebaktian, mengunggah tata ibadah, dan mencatat jumlah kehadiran jemaat di setiap ibadah, supaya tidak terjadi bentrok jadwal tugas majelis dan gereja memiliki data partisipasi ibadah yang akurat.

**Sub-fitur**:
- **Manajemen Jadwal Kebaktian**: Pembuatan jadwal ibadah rutin (Kebaktian Minggu Pagi/Sore, Ibadah Kategorial, Ibadah Rayon Getsemani/Golgota/Tiberias/Galilea/Kapernaum) beserta lokasi/rumah keluarga, tema khotbah, dan bacaan Alkitab.
- **Penugasan Pelayan, Majelis & Pemusik**: Penjadwalan nama Pengkhotbah/Pelayan Firman, Penatua/Diaken bertugas (Liturgos, Pembaca Warta, Kolektan), Pemandu Lagu (Kantoria/Prokantor), Organis/Pemusik, dan Operator Multimedia.
- **Pencatatan Absensi Kehadiran Ibadah**: Input jumlah kehadiran jemaat yang terbagi atas Pria, Wanita, dan Anak/Pemuda pada setiap sesi ibadah yang telah berlangsung.
- **Pengelolaan Dokumen Tata Ibadah (Liturgi)**: Penyimpanan dan lampiran file dokumen/PDF tata ibadah mingguan pada jadwal kebaktian terkait agar dapat diunduh oleh pelayan dan jemaat.

**Kriteria Penerimaan**:
- [ ] Admin/Pendeta dapat membuat jadwal ibadah lengkap dengan daftar petugas pelayanan dan melampirkan file PDF Tata Ibadah.
- [ ] Sistem memberikan peringatan visual jika seorang Pelayan/Majelis ditugaskan pada dua ibadah berbeda di tanggal dan jam yang sama.
- [ ] Jadwal ibadah yang berstatus "Publik" otomatis tampil di Papan Jadwal Ibadah pada Portal Publik beserta tautan unduh Tata Ibadah (Liturgi).
- [ ] Majelis atau Admin dapat menginput angka kehadiran (Pria, Wanita, Anak/Pemuda) setelah ibadah selesai dan sistem otomatis menghitung total kehadiran.

---

### Layanan Sakramen & Arsip Persuratan (Fase 2)
**Deskripsi**: Digitalisasi pendaftaran layanan gerejawi dari portal publik serta pengelolaan buku induk sakramen dan arsip surat-menyurat gereja dengan dukungan dua format cetak sertifikat.

**User Story**: Sebagai Warga Jemaat, saya ingin mendaftarkan Baptisan, Sidi, atau Pernikahan secara online melalui situs gereja, dan sebagai Admin/Pendeta, saya ingin memverifikasi berkas tersebut serta mencetak sertifikat sakramen (baik dengan desain penuh maupun untuk kertas blangko) dari buku induk digital.

**Sub-fitur**:
- **Formulir Pendaftaran Online (Baptis, Sidi, Nikah)**: Formulir di Portal Publik bagi jemaat untuk mengajukan pendaftaran Baptisan Anak, Katekisasi/Sidi, atau Pemberkatan Nikah beserta unggah berkas persyaratan (akta lahir, surat baptis/sidi, foto) dan pemberian kode lacak pendaftaran.
- **Verifikasi & Antrean Layanan Pastoral**: Dashboard bagi Admin dan Pendeta untuk memeriksa kelengkapan berkas pendaftar, mengubah status (Menunggu Verifikasi, Revisi Berkas, Jadwal Konseling/Penggembalaan, Disetujui, Selesai), dan menetapkan tanggal pelaksanaan.
- **Register & Cetak Surat Sakramen (2 Mode Cetak)**: Database buku induk Baptis, Sidi, dan Nikah yang terhubung dengan profil jemaat, dilengkapi fitur pencetakan Surat Baptis, Surat Sidi, atau Surat Nikah Gereja dalam dua pilihan format:
  1. **Mode Desain Lengkap (Kertas Kosong)**: Mencetak dokumen utuh lengkap dengan kop surat GMIT Jemaat Lahairoi Tuak Sabu Lasiana, bingkai sertifikat, dan blok tanda tangan.
  2. **Mode Blangko Fisik (Teks Isian Saja)**: Hanya mencetak variabel teks data (nomor surat, nama, tempat/tanggal lahir, nama orang tua/pasangan, tanggal sakramen, nama pendeta) tanpa bingkai/kop agar pas saat dicetak di atas kertas blangko sertifikat fisik.
- **Buku Agenda Surat Masuk & Keluar**: Pengarsipan surat-menyurat administrasi gereja (surat pindah jemaat/atestasi masuk & keluar, surat tugas pelayanan, surat keputusan, undangan klasis/sinode) beserta unggah salinan digital surat.

**Kriteria Penerimaan**:
- [ ] Pengunjung Portal Publik dapat mengisi formulir pendaftaran Baptis/Sidi/Nikah, mengunggah berkas syarat, dan mendapatkan kode registrasi unik untuk mengecek status pengajuan.
- [ ] Admin dan Pendeta dapat melihat daftar antrean pendaftar baru di Dashboard, memeriksa lampiran berkas, dan memperbarui status verifikasi.
- [ ] Saat layanan sakramen berstatus "Selesai", data otomatis tercatat di Buku Induk Sakramen (nomor register, tanggal pelaksanaan, pendeta yang melayani) dan status sakramen pada profil jemaat terkait otomatis diperbarui.
- [ ] Pada halaman cetak sertifikat sakramen, Admin dapat memilih toggle antara **"Format Desain Lengkap (Kop & Bingkai)"** dan **"Format Blangko (Hanya Teks Isian)"** sebelum memicu dialog cetak browser, serta dapat mencatat surat masuk/keluar pada Buku Agenda.

---

### Manajemen Aset & Inventaris Gereja (Fase 3)
**Deskripsi**: Pendataan dan pemantauan kondisi harta milik gereja, mulai dari peralatan musik, sound system, perabotan ibadah, hingga properti tanah dan gedung.

**User Story**: Sebagai Admin dan Majelis Gereja, saya ingin mencatat daftar inventaris gereja, memantau kondisi kelayakannya, dan mencatat peminjaman barang oleh rayon atau jemaat, supaya aset gereja terpelihara dan tidak hilang saat dipinjam.

**Sub-fitur**:
- **Katalog Aset & Barang Inventaris**: Pencatatan daftar barang milik gereja lengkap dengan kode inventaris otomatis/manual, kategori aset, jumlah unit, lokasi penyimpanan, sumber/tahun perolehan, dan estimasi nilai aset.
- **Pemantauan Status & Kondisi Barang**: Pembaruan berkala kondisi fisik aset (`Baik`, `Rusak Ringan`, `Rusak Berat`, `Dalam Perbaikan`) beserta catatan riwayat pemeliharaan.
- **Pencatatan Peminjaman Inventaris**: Log peminjaman fasilitas atau peralatan gereja (kursi, tenda, alat musik, sound system) oleh pengurus rayon atau warga jemaat, mencakup nama peminjam, rayon peminjam, tanggal pinjam, tanggal kembali, dan kondisi saat dikembalikan.

**Kriteria Penerimaan**:
- [ ] Admin dapat menambah, mengedit, dan memfilter daftar aset berdasarkan kategori, lokasi penyimpanan, dan kondisi barang.
- [ ] Pencatatan peminjaman inventaris mengurangi jumlah stok unit yang tersedia untuk dipinjam pada tanggal tersebut dan mengembalikannya saat status diubah menjadi "Sudah Dikembalikan".
- [ ] Sistem menampilkan daftar peminjaman yang sedang aktif dan menandai peminjaman yang melewati batas tanggal pengembalian (terlambat).

---

### Dashboard Eksekutif & Analitik Gereja (Fase 3)
**Deskripsi**: Ringkasan visual interaktif bagi Pendeta, Majelis, dan Bendahara untuk memantau kesehatan finansial, demografi jemaat di 5 rayon, dan tingkat kehadiran ibadah dalam satu layar.

**User Story**: Sebagai Pendeta dan Majelis Jemaat, saya ingin melihat grafik statistik demografi jemaat per rayon, tren kehadiran ibadah, dan ringkasan arus kas per pos anggaran, supaya majelis dapat mengambil keputusan pelayanan dan evaluasi program secara tepat berbasis data.

**Sub-fitur**:
- **Grafik Demografi & Statistik Jemaat**: Visualisasi total jiwa dan kepala keluarga, distribusi jumlah jemaat di 5 Rayon (Getsemani, Golgota, Tiberias, Galilea, Kapernaum), komposisi kelompok kategorial (PAR, Pemuda, Kaum Ibu, Kaum Bapak, Lansia), persentase cakupan sakramen, serta daftar warga jemaat yang berulang tahun pada minggu/bulan berjalan.
- **Visualisasi Arus Kas & Pos Anggaran**: Grafik batang perbandingan pemasukan vs pengeluaran bulanan, proporsi saldo pada masing-masing Pos Kas, serta indikator persentase realisasi RAPBJ.
- **Tren Kehadiran Ibadah**: Grafik garis rata-rata tingkat kehadiran jemaat dari minggu ke minggu pada kebaktian utama maupun kategorial/rayon.

**Kriteria Penerimaan**:
- [ ] Halaman utama Dashboard menampilkan kartu ringkasan metrik utama (Total Jiwa, Total KK, Saldo Kas Total, Kehadiran Minggu Terakhir) dan grafik visual yang dihitung langsung dari data riil di database.
- [ ] Widget "Ulang Tahun Jemaat Minggu Ini" menampilkan daftar nama jemaat, tanggal lahir, usia, dan nama rayon secara akurat untuk keperluan doa syafaat/warta jemaat.
- [ ] Pengguna dapat memfilter grafik keuangan dan tren kehadiran berdasarkan tahun anggaran atau rentang bulan.

---

## Spesifikasi Teknis

### Tumpukan Teknologi (Stack)
- **Frontend**: **React (Vite) + TypeScript + Tailwind CSS v4 + shadcn/ui** — Memberikan antarmuka pengguna yang cepat, modern, responsif untuk perangkat seluler jemaat, dan komponen tabel/formulir yang konsisten untuk dashboard administrasi.
- **Backend**: **Hono di Cloudflare Workers** — Framework web ringan dan sangat cepat yang berjalan di edge network Cloudflare, mendukung pembuatan REST API yang terstruktur dengan middleware autentikasi dan RBAC.
- **Database**: **Cloudflare D1 (SQLite di Edge)** — Database relasional serverless yang sangat cocok untuk struktur data berelasi seperti Kartu Keluarga, Anggota Jemaat, Jurnal Akuntansi Multi-Pos, dan Register Sakramen.
- **Deployment**: **Cloudflare Pages / Workers** — Menyediakan hosting terpadu dengan performa tinggi, biaya operasional sangat rendah untuk gereja, dan integrasi langsung dengan D1.

### Model Data Utama (Cloudflare D1)
1. **`users`**: `id`, `name`, `email`, `password_hash`, `role` (`ADMIN`, `TREASURER`, `PASTOR`, `ELDER`), `rayon_id`, `is_active`, `created_at`.
2. **`audit_logs`**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details_json`, `created_at`.
3. **`rayons`**: `id`, `name` (Data awal: `Getsemani`, `Golgota`, `Tiberias`, `Galilea`, `Kapernaum`), `description`, `coordinator_name`.
4. **`families` (Kartu Keluarga)**: `id`, `kk_number`, `family_head_name`, `rayon_id`, `address`, `phone`, `created_at`.
5. **`members` (Anggota Jemaat)**: `id`, `family_id`, `church_member_number`, `nik`, `full_name`, `gender`, `birth_place`, `birth_date`, `blood_type`, `family_relation`, `education`, `occupation`, `categorical_group` (`PAR`, `PEMUDA`, `KAUM_IBU`, `KAUM_BAPAK`, `LANSIA`), `baptism_status`, `baptism_date`, `sidi_status`, `sidi_date`, `marriage_status`, `marriage_date`, `is_deceased`, `status` (`ACTIVE`, `MOVED`, `DECEASED`).
6. **`finance_funds` (Pos Kas)**: `id`, `code`, `name` (Fleksibel: Kas Umum, Pembangunan, Diakonia, dll.), `description`, `current_balance`, `is_active`.
7. **`finance_budgets` (Mata Anggaran RAPBJ)**: `id`, `fund_id`, `fiscal_year`, `account_code` (Fleksibel/Kustom), `account_name`, `type` (`INCOME`, `EXPENSE`), `target_amount`.
8. **`finance_transactions` (Kas Masuk & Keluar)**: `id`, `fund_id`, `budget_id`, `transaction_date`, `type` (`INCOME`, `EXPENSE`), `amount`, `description`, `receipt_url`, `created_by`, `created_at`.
9. **`public_contents` (Warta, Renungan, Berita, Media, Profil)**: `id`, `category` (`WARTA`, `DEVOTIONAL`, `NEWS`, `MEDIA`, `PROFILE`, `PAYMENT_INFO`), `title`, `slug`, `summary`, `content_body`, `attachment_url`, `thumbnail_url`, `published_at`, `author_id`, `is_published`.
10. **`worship_schedules` (Jadwal Ibadah & Kehadiran)**: `id`, `title`, `category` (`SUNDAY_SERVICE`, `RAYON`, `CATEGORICAL`, `SPECIAL`), `rayon_id`, `worship_date`, `worship_time`, `location`, `theme`, `bible_reading`, `liturgy_file_url`, `attendance_men`, `attendance_women`, `attendance_youth_children`, `is_public`.
11. **`worship_servants` (Petugas Pelayanan)**: `id`, `schedule_id`, `role` (`PREACHER`, `LITURGIST`, `ELDER_ON_DUTY`, `SINGER`, `MUSICIAN`, `MULTIMEDIA`), `servant_name`, `member_id`.
12. **`sacrament_applications` (Pendaftaran & Register Sakramen)**: `id`, `registration_code`, `type` (`BAPTISM`, `SIDI`, `MARRIAGE`), `applicant_name`, `member_id`, `phone`, `form_data_json`, `documents_json`, `status` (`PENDING`, `REVISION`, `COUNSELING`, `APPROVED`, `COMPLETED`), `scheduled_date`, `officiating_pastor`, `certificate_number`, `notes`, `created_at`.
13. **`mail_archives` (Arsip Surat)**: `id`, `direction` (`INCOMING`, `OUTGOING`), `reference_number`, `mail_date`, `sender_or_recipient`, `subject`, `category` (`ATESTASI`, `TUGAS`, `UNDANGAN`, `UMUM`), `file_url`, `created_at`.
14. **`assets` (Inventaris Gereja)**: `id`, `asset_code`, `name`, `category`, `quantity`, `available_quantity`, `location`, `acquisition_year`, `estimated_value`, `condition` (`GOOD`, `MINOR_DAMAGE`, `MAJOR_DAMAGE`, `MAINTENANCE`), `notes`.
15. **`asset_loans` (Peminjaman Inventaris)**: `id`, `asset_id`, `borrower_name`, `rayon_id`, `quantity_borrowed`, `borrow_date`, `due_date`, `return_date`, `status` (`BORROWED`, `RETURNED`, `OVERDUE`), `notes`.

### Daftar Endpoint API Utama (Hono)
- **Autentikasi & Pengguna**:
  - `POST /api/auth/login` & `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`
  - `GET /api/audit-logs`
- **Jemaat & Kartu Keluarga**:
  - `GET /api/rayons`, `POST /api/rayons`, `PUT /api/rayons/:id`
  - `GET /api/families`, `POST /api/families`, `GET /api/families/:id`, `PUT /api/families/:id`
  - `GET /api/members`, `POST /api/members`, `PUT /api/members/:id`, `DELETE /api/members/:id`
  - `POST /api/members/import` & `GET /api/members/export`
- **Keuangan Multi-Pos & RAPBJ**:
  - `GET /api/finance/funds`, `POST /api/finance/funds`, `PUT /api/finance/funds/:id`
  - `GET /api/finance/budgets`, `POST /api/finance/budgets`, `PUT /api/finance/budgets/:id`, `DELETE /api/finance/budgets/:id`
  - `GET /api/finance/transactions`, `POST /api/finance/transactions`, `DELETE /api/finance/transactions/:id`
  - `GET /api/finance/reports/summary` (Rekap mingguan/bulanan/realisasi RAPBJ)
- **Portal Publik & Konten**:
  - `GET /api/public/home` (Data ringkas jadwal terdekat, warta terbaru, renungan hari ini, info QRIS)
  - `GET /api/public/contents`, `GET /api/public/contents/:slug`
  - `POST /api/contents`, `PUT /api/contents/:id`, `DELETE /api/contents/:id` (Admin CMS)
- **Ibadah, Pelayan & Kehadiran**:
  - `GET /api/worships`, `POST /api/worships`, `PUT /api/worships/:id`
  - `POST /api/worships/:id/servants`
  - `PATCH /api/worships/:id/attendance`
- **Sakramen & Persuratan**:
  - `POST /api/public/sacraments/apply` & `GET /api/public/sacraments/track/:code`
  - `GET /api/sacraments`, `PATCH /api/sacraments/:id/status`
  - `GET /api/mails`, `POST /api/mails`, `DELETE /api/mails/:id`
- **Aset & Analitik**:
  - `GET /api/assets`, `POST /api/assets`, `PUT /api/assets/:id`
  - `GET /api/asset-loans`, `POST /api/asset-loans`, `PATCH /api/asset-loans/:id/return`
  - `GET /api/analytics/dashboard` (Demografi, ulang tahun, arus kas, tren kehadiran)

---

## Alur Pengguna

### 1. Alur Jemaat Mengakses Informasi & Mendaftar Sakramen (Portal Publik)
1. Jemaat membuka situs web **GMIT Lahairoi Tuak Sabu Lasiana** tanpa login.
2. Di halaman beranda, jemaat melihat jadwal Kebaktian Minggu terdekat dan jadwal ibadah rumah tangga di rayonnya (Getsemani, Golgota, Tiberias, Galilea, atau Kapernaum), membaca Renungan Harian, dan mengunduh file PDF Warta Jemaat minggu berjalan.
3. Jemaat membuka menu **Persembahan & QRIS**, memindai kode QRIS atau menyalin nomor rekening gereja untuk memberikan persembahan syukur.
4. Untuk mendaftarkan Baptisan Anak, jemaat membuka menu **Layanan Sakramen**, memilih "Baptis Kudus", mengisi formulir data anak & orang tua, serta mengunggah berkas syarat.
5. Sistem menampilkan **Kode Registrasi** unik yang dapat digunakan jemaat untuk mengecek status verifikasi dan jadwal penggembalaan di portal publik.

### 2. Alur Admin Migrasi Data & Mengelola Layanan Jemaat
1. Admin login ke Dashboard dan masuk ke menu **Database Jemaat**.
2. Admin mengunduh template CSV/Excel, memasukkan data 1.200 jemaat dari file Excel lama gereja beserta nama rayon masing-masing (`Getsemani`, `Golgota`, `Tiberias`, `Galilea`, `Kapernaum`), lalu mengunggahnya melalui fitur **Impor Data**.
3. Sistem memvalidasi dan membuat data Kartu Keluarga, menghubungkan ke Rayon, serta membuat profil anggota jemaat secara otomatis.
4. Admin membuka menu **Layanan Sakramen**, memeriksa pengajuan Baptis yang masuk dari Portal Publik, memverifikasi kelengkapan berkas, dan menjadwalkan sesi penggembalaan bersama Pendeta.
5. Setelah baptisan dilaksanakan pada Kebaktian Minggu, Admin mengubah status menjadi "Selesai" dan mencetak **Surat Baptis** dengan memilih mode cetak penuh (beserta kop/bingkai) atau mode blangko (teks isian saja).

### 3. Alur Bendahara Mengelola Keuangan Multi-Pos & Cetak Warta
1. Pada awal tahun anggaran, Bendahara login dan masuk ke menu **Pos Akun & Anggaran (RAPBJ)** untuk membuat atau menyesuaikan kode mata anggaran secara fleksibel serta menetapkan target penerimaan dan pengeluaran pada Pos Kas Umum, Pos Pembangunan, dan Pos Diakonia.
2. Setiap selesai ibadah Minggu dan pelayanan sepekan, Bendahara masuk ke menu **Transaksi Kas** untuk menginput pemasukan (kolekte Minggu, kolekte per rayon, persepuluhan) dan pengeluaran operasional beserta unggahan foto kuitansi.
3. Setiap hari Jumat/Sabtu sebelum pencetakan Warta Jemaat, Bendahara membuka menu **Laporan Keuangan & Cetak Warta**, memilih periode minggu berjalan, lalu mencetak rekapitulasi kas masuk, kas keluar, dan saldo akhir per pos untuk dilampirkan ke dalam Warta Jemaat.

---

## Fase Rilis

- **Fase 1 — Fondasi Digital, Database Jemaat, Keuangan & Portal Publik (MVP Layak Pakai)**:
  - Mencakup Autentikasi Multi-Peran (RBAC), Database Jemaat & KK di 5 Rayon (dengan Impor/Ekspor Excel), Manajemen Keuangan Multi-Pos & RAPBJ Fleksibel, serta Portal Informasi Publik & Warta (termasuk Renungan, Berita, Media, dan Info QRIS).
  - *Status Kelayakan*: Pada akhir Fase 1, aplikasi **sudah layak dipakai secara penuh** oleh GMIT Lahairoi untuk menggantikan Excel pada pendataan 1.200 jemaat dan pembukuan keuangan mingguan, sekaligus melayani jemaat melalui portal web publik.
- **Fase 2 — Operasional Ibadah, Pelayanan Pastoral & Persuratan**:
  - Mencakup Penjadwalan Ibadah, Pelayan & Pencatatan Kehadiran (termasuk dokumen Liturgi), serta Layanan Pendaftaran Sakramen Online (Baptis, Sidi, Nikah) dengan dukungan 2 mode cetak sertifikat dan Arsip Surat Masuk/Keluar.
  - *Status Kelayakan*: Mendigitalisasi alur pelayanan hari Minggu dan memangkas birokrasi pendaftaran sakramen manual bagi warga jemaat.
- **Fase 3 — Manajemen Inventaris & Analitik Eksekutif**:
  - Mencakup Manajemen Aset & Peminjaman Inventaris Gereja, serta Dashboard Eksekutif & Analitik (grafik demografi, tren kehadiran, dan visualisasi realisasi anggaran).
  - *Status Kelayakan*: Memberikan kendali penuh atas harta milik gereja dan mendukung pengambilan keputusan strategis pada persidangan Majelis Jemaat.

---

## Risiko
1. **Kualitas Data Excel Lama Saat Migrasi**: Data Excel yang digunakan gereja saat ini kemungkinan memiliki ketidakkonsistenan penulisan (format tanggal lahir yang beragam, variasi ejaan nama rayon seperti Getsemani/Gethsemani, atau anggota keluarga tanpa nomor KK). Fitur impor harus memiliki validasi toleran, pencocokan nama rayon *case-insensitive*, dan pratinjau pembersihan data yang jelas.
2. **Adaptasi Pengguna Pengurus/Majelis**: Sebagian pengurus atau majelis gereja mungkin terbiasa dengan alur manual/kertas. Antarmuka Dashboard (terutama input keuangan dan pencarian jemaat) harus dirancang sesederhana mungkin dengan istilah yang akrab di lingkungan GMIT.
3. **Presisi Tata Letak Cetak Blangko Fisik**: Setiap kertas blangko sertifikat fisik dapat memiliki margin atas/kiri yang sedikit berbeda tergantung printer gereja. Pada mode cetak blangko (*text-only overlay*), antarmuka cetak perlu menyediakan pengaturan sederhana penyesuaian margin atas/kiri (atau jarak spasi) di layar pratinjau cetak agar teks pas dengan kolom blangko fisik.

## Pertanyaan Terbuka
Tidak ada