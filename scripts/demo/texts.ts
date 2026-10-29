// Teks data demo: renungan, berita, galeri, profil, rekening, rayon, surat, dan inventaris.
//
// Fakta yang dapat diperiksa dipakai apa adanya: perikop Alkitab, bacaan leksionari Minggu
// tahun 2026 (Revised Common Lectionary, tahun A lalu B mulai Adven), GMIT berdiri
// 31 Oktober 1947, Reformasi 31 Oktober 1517, Sumpah Pemuda 28 Oktober 1928, dan wilayah
// Lasiana (Kecamatan Kelapa Lima, Kota Kupang). Nama orang, nomor rekening, nomor RT, dan
// kejadian jemaat adalah data contoh, bukan data jemaat sebenarnya.

// Kunci foto di scripts/demo/foto (potongan foto gedung gereja di public/images).
export type Photo = 'lebar' | 'menara' | 'jendela' | 'serambi' | 'atap' | 'sisi' | 'hangat' | 'abu'

export const PASTORS = {
  head: 'Pdt. Agustina Riwu Kaho, S.Th.',
  second: 'Pdt. Yeskiel Lado, M.Th.',
  vicar: 'Vik. Yosua Ndun, S.Th.',
} as const

// Bacaan Injil leksionari Minggu (RCL), tema khotbah, dan hari raya gerejawi 2026.
export const SUNDAY_READINGS: Record<string, { theme: string; reading: string }> = {
  '2026-09-06': { theme: 'Menegur dalam kasih', reading: 'Matius 18:15-20' },
  '2026-09-13': { theme: 'Mengampuni tujuh puluh kali tujuh kali', reading: 'Matius 18:21-35' },
  '2026-09-20': { theme: 'Kemurahan hati tuan kebun anggur', reading: 'Matius 20:1-16' },
  '2026-09-27': { theme: 'Taat dalam perbuatan, bukan hanya kata', reading: 'Matius 21:23-32' },
  '2026-10-04': { theme: 'Penggarap kebun anggur yang setia', reading: 'Matius 21:33-46' },
  '2026-10-11': { theme: 'Undangan ke perjamuan kawin', reading: 'Matius 22:1-14' },
  '2026-10-18': {
    theme: 'Berikan kepada Allah apa yang wajib diberikan kepada Allah',
    reading: 'Matius 22:15-22',
  },
  '2026-10-25': { theme: 'Hukum yang terutama', reading: 'Matius 22:34-46' },
  '2026-11-01': { theme: 'Yang terbesar menjadi pelayan', reading: 'Matius 23:1-12' },
  '2026-11-08': { theme: 'Berjaga-jaga menanti Tuhan', reading: 'Matius 25:1-13' },
  '2026-11-15': { theme: 'Setia mengembangkan talenta', reading: 'Matius 25:14-30' },
  '2026-11-22': { theme: 'Kristus Raja yang hadir pada yang hina', reading: 'Matius 25:31-46' },
  '2026-11-29': {
    theme: 'Minggu Adven I: Berjaga-jaga menyambut kedatangan Tuhan',
    reading: 'Markus 13:24-37',
  },
  '2026-12-06': {
    theme: 'Minggu Adven II: Persiapkanlah jalan untuk Tuhan',
    reading: 'Markus 1:1-8',
  },
  '2026-12-13': {
    theme: 'Minggu Adven III: Bersaksi tentang Terang',
    reading: 'Yohanes 1:6-8, 19-28',
  },
  '2026-12-20': {
    theme: 'Minggu Adven IV: Jadilah padaku menurut perkataan-Mu',
    reading: 'Lukas 1:26-38',
  },
  '2026-12-27': { theme: 'Mata kami telah melihat keselamatan', reading: 'Lukas 2:22-40' },
  // Hari raya gerejawi sebelumnya.
  '2026-04-05': { theme: 'Paskah: Ia telah bangkit', reading: 'Matius 28:1-10' },
  '2026-05-24': { theme: 'Pentakosta: Roh Kudus dicurahkan', reading: 'Kisah Para Rasul 2:1-21' },
  '2026-08-16': { theme: 'Merdeka untuk melayani', reading: 'Galatia 5:1, 13-14' },
}

// Ibadah khusus (bukan Minggu biasa) sepanjang 2026.
export const SPECIAL_SERVICES: {
  date: string
  time: string
  title: string
  location: string
  theme: string
  reading: string
}[] = [
  {
    date: '2026-01-01',
    time: '09:00',
    title: 'Kebaktian Tahun Baru',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Ajarlah kami menghitung hari-hari kami',
    reading: 'Mazmur 90:1-12',
  },
  {
    date: '2026-04-03',
    time: '09:00',
    title: 'Kebaktian Jumat Agung',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Sudah selesai',
    reading: 'Yohanes 19:16-30',
  },
  {
    date: '2026-04-05',
    time: '05:00',
    title: 'Ibadah Subuh Paskah',
    location: 'Pantai Lasiana',
    theme: 'Ia tidak ada di sini, Ia telah bangkit',
    reading: 'Matius 28:1-10',
  },
  {
    date: '2026-05-14',
    time: '09:00',
    title: 'Kebaktian Kenaikan Tuhan Yesus',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Kamu akan menjadi saksi-Ku',
    reading: 'Kisah Para Rasul 1:1-11',
  },
  {
    date: '2026-10-31',
    time: '17:00',
    title: 'Ibadah Syukur HUT ke-79 GMIT dan Hari Reformasi',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Gereja yang terus diperbarui oleh firman',
    reading: 'Roma 12:1-2',
  },
  {
    date: '2026-12-24',
    time: '19:00',
    title: 'Kebaktian Malam Natal',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Terang yang datang ke dalam dunia',
    reading: 'Lukas 2:1-7',
  },
  {
    date: '2026-12-25',
    time: '07:00',
    title: 'Kebaktian Natal',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Kesukaan besar untuk seluruh bangsa',
    reading: 'Lukas 2:8-20',
  },
  {
    date: '2026-12-31',
    time: '19:00',
    title: 'Ibadah Akhir Tahun',
    location: 'Gedung Gereja Lahairoi',
    theme: 'Pertolonganku dari TUHAN',
    reading: 'Mazmur 121:1-8',
  },
]

// Renungan harian 20 Oktober – 5 November 2026, mengikuti bacaan Minggu 25 Oktober,
// 1 November, dan 8 November, serta Hari Reformasi dan HUT GMIT (31 Oktober).
export const DEVOTIONALS: {
  date: string
  title: string
  passage: string
  photo?: Photo
  body: string[]
}[] = [
  {
    date: '2026-10-20',
    title: 'Mengasihi Tuhan dengan Segenap Hati',
    passage: 'Ulangan 6:4-9',
    photo: 'hangat',
    body: [
      'Sebelum Israel masuk ke tanah perjanjian, Musa mengingatkan satu pengakuan yang harus diwariskan: TUHAN itu esa, dan Ia harus dikasihi dengan segenap hati, jiwa, dan kekuatan. Perintah itu tidak berhenti di kemah ibadah. Ia diajarkan berulang-ulang kepada anak-anak, dibicarakan saat duduk di rumah dan saat dalam perjalanan.',
      'Iman bertumbuh dari rumah. Doa sebelum makan, cerita Alkitab sebelum tidur, dan kehadiran bersama di ibadah rumah tangga adalah cara sederhana menanamkan kasih kepada Tuhan dalam diri anak-anak. Kesibukan sering membuat kita menyerahkan pendidikan iman sepenuhnya kepada guru PAR, padahal rumah adalah sekolah pertama.',
      'Minggu ini, sediakan sepuluh menit setiap malam untuk membaca satu perikop bersama keluarga. Biarlah anak-anak melihat bahwa mengasihi Tuhan bukan hanya kewajiban hari Minggu, tetapi napas hidup sehari-hari.',
      'Doa: Tuhan, ajarlah keluarga kami mengasihi Engkau dengan segenap hati dan menceritakan perbuatan-Mu kepada anak-anak kami. Amin.',
    ],
  },
  {
    date: '2026-10-21',
    title: 'Kasih yang Adil kepada Sesama',
    passage: 'Imamat 19:15-18',
    body: [
      'Imamat 19 menempatkan kasih kepada sesama berdampingan dengan keadilan. Umat Tuhan dilarang memutarbalikkan hukum, baik karena kasihan kepada orang kecil maupun karena segan kepada orang besar. Mereka juga dilarang menyimpan dendam. Semuanya ditutup dengan perintah yang kemudian dikutip Yesus: kasihilah sesamamu manusia seperti dirimu sendiri.',
      'Kasih tidak sama dengan membiarkan. Mengasihi tetangga berarti juga berlaku jujur kepadanya, membayar upah tepat waktu, dan menegur dengan lembut bila ia berbuat salah. Di lingkungan rayon yang saling mengenal, godaan terbesar sering kali adalah menyimpan sakit hati bertahun-tahun.',
      'Adakah orang yang perlu kita ampuni hari ini? Langkah pertama bisa sesederhana menyapanya di ibadah rumah tangga minggu ini.',
      'Doa: Tuhan, lembutkan hati kami agar tidak menyimpan dendam, dan ajarlah kami berlaku adil kepada sesama. Amin.',
    ],
  },
  {
    date: '2026-10-22',
    title: 'Kasih yang Sabar dan Murah Hati',
    passage: '1 Korintus 13:1-7',
    photo: 'atap',
    body: [
      'Jemaat di Korintus kaya akan karunia: ada yang pandai berbicara, ada yang bernubuat, ada yang murah hati memberi. Namun Paulus berkata, semua itu tidak berguna tanpa kasih. Lalu ia melukiskan kasih bukan sebagai perasaan, melainkan sikap: sabar, murah hati, tidak cemburu, tidak memegahkan diri.',
      'Pelayanan sering kita nilai dari hasil yang terlihat: berapa banyak acara terlaksana, berapa besar persembahan terkumpul. Paulus mengingatkan ukuran yang lain: apakah kita melayani dengan sabar terhadap orang yang lambat, dan murah hati terhadap orang yang berbeda pendapat.',
      'Bacalah ayat 4 sampai 7 sekali lagi dan ganti kata "kasih" dengan nama Anda. Bagian mana yang paling sulit diucapkan dengan jujur? Di situlah kita membutuhkan pertolongan Roh Kudus.',
      'Doa: Tuhan Yesus, isilah pelayanan kami dengan kasih-Mu, supaya karunia yang Kauberikan menjadi berkat bagi sesama. Amin.',
    ],
  },
  {
    date: '2026-10-23',
    title: 'Seperti Ibu Mengasuh Anaknya',
    passage: '1 Tesalonika 2:1-8',
    body: [
      'Paulus mengingat kembali pelayanannya di Tesalonika. Ia datang bukan dengan kata-kata manis atau maksud mencari keuntungan. Ia memakai gambaran yang menyentuh: kami berlaku ramah di antara kamu, sama seperti seorang ibu mengasuh dan merawati anaknya. Ia rela membagikan bukan hanya Injil, tetapi juga hidupnya sendiri.',
      'Pelayanan yang sejati selalu bersifat pribadi. Majelis yang mengunjungi warga sakit, guru PAR yang hafal nama setiap anak, dan anggota rayon yang membawa makanan ke rumah duka sedang menghidupi teladan ini. Injil diberitakan dengan kata-kata, tetapi dipercaya karena kasih yang nyata.',
      'Siapa di sekitar kita yang membutuhkan kehadiran, bukan sekadar nasihat? Mungkin seorang lansia yang tinggal sendiri, atau pelajar dari kampung yang menumpang di rumah kerabat dan jauh dari orang tuanya.',
      'Doa: Tuhan, jadikan kami pelayan yang tulus, yang membagikan Injil dan hidup kami bagi sesama. Amin.',
    ],
  },
  {
    date: '2026-10-24',
    title: 'Memandang Janji dari Kejauhan',
    passage: 'Ulangan 34:1-12',
    photo: 'sisi',
    body: [
      'Dari puncak Gunung Nebo, Musa memandang seluruh tanah yang dijanjikan Tuhan, tetapi ia tidak masuk ke sana. Setelah empat puluh tahun memimpin umat di padang gurun, ia meninggal di tanah Moab, dan Yosua meneruskan kepemimpinan. Alkitab menutup kisahnya dengan pujian: tidak ada lagi nabi seperti Musa yang dikenal TUHAN berhadapan muka.',
      'Tidak semua yang kita kerjakan akan selesai di tangan kita. Satu generasi menanam, generasi berikutnya membangun, dan anak cucu yang menikmati hasilnya. Kesetiaan tidak diukur dari melihat garis akhir, tetapi dari berjalan bersama Tuhan sampai akhir.',
      'Mari mendoakan dan menyiapkan generasi penerus: pemuda yang belajar memimpin ibadah, remaja katekisasi, dan anak-anak PAR yang kelak meneruskan pelayanan jemaat ini.',
      'Doa: Tuhan, buatlah kami setia mengerjakan bagian kami, dan percaya bahwa janji-Mu digenapi pada waktu-Mu. Amin.',
    ],
  },
  {
    date: '2026-10-25',
    title: 'Hukum yang Terutama',
    passage: 'Matius 22:34-40',
    body: [
      'Seorang ahli Taurat bertanya untuk mencobai Yesus: hukum manakah yang terutama? Yesus menjawab dengan dua perintah yang tidak dapat dipisahkan: kasihilah Tuhan Allahmu dengan segenap hati, jiwa, dan akal budi, dan kasihilah sesamamu manusia seperti dirimu sendiri. Pada kedua hukum inilah tergantung seluruh hukum Taurat dan kitab para nabi.',
      'Ibadah yang sungguh-sungguh kepada Tuhan selalu bermuara pada kasih kepada sesama, dan kasih kepada sesama bersumber dari kasih kepada Tuhan. Kita tidak dapat mengaku mengasihi Allah yang tidak kelihatan bila mengabaikan saudara yang kelihatan.',
      'Hari Minggu ini, setelah beribadah, sempatkan diri mengunjungi atau menelepon satu orang yang lama tidak hadir dalam persekutuan.',
      'Doa: Tuhan, satukan kasih kami kepada-Mu dan kepada sesama, sehingga ibadah kami nyata dalam hidup sehari-hari. Amin.',
    ],
  },
  {
    date: '2026-10-26',
    title: 'Firman yang Bekerja',
    passage: '1 Tesalonika 2:9-13',
    photo: 'jendela',
    body: [
      'Paulus bersyukur karena jemaat Tesalonika menerima firman yang diberitakannya bukan sebagai perkataan manusia, tetapi sebagai firman Allah, yang bekerja di dalam orang-orang percaya. Ia sendiri bekerja siang dan malam supaya tidak menjadi beban bagi siapa pun.',
      'Firman Tuhan tidak berhenti ketika khotbah selesai. Ia bekerja di dalam kita: menegur sikap yang keliru, menghibur hati yang letih, dan menuntun keputusan sehari-hari. Karena itu, cara kita mendengar firman sama pentingnya dengan cara firman itu diberitakan.',
      'Catatlah satu kalimat dari khotbah Minggu kemarin dan renungkan setiap pagi minggu ini. Biarkan firman itu bekerja perlahan dalam pekerjaan, rumah tangga, dan pelayanan kita.',
      'Doa: Tuhan, bukalah hati kami menerima firman-Mu sebagai firman Allah yang hidup dan berkuasa. Amin.',
    ],
  },
  {
    date: '2026-10-27',
    title: 'Allah Tempat Perlindungan',
    passage: 'Mazmur 46:2-4',
    body: [
      'Pemazmur menulis di tengah gambaran yang menakutkan: bumi berubah, gunung-gunung goncang, laut bergelora. Namun ia berkata dengan yakin bahwa Allah adalah tempat perlindungan dan kekuatan, penolong dalam kesesakan. Mazmur inilah yang mengilhami Martin Luther menulis lagu yang dinyanyikan gereja-gereja Reformasi sampai hari ini.',
      'Pergumulan kita mungkin tidak sebesar gunung yang goncang, tetapi terasa berat: harga kebutuhan pokok yang naik, air sumur yang menipis di akhir kemarau, atau anak yang belum mendapat pekerjaan. Mazmur ini tidak menjanjikan hidup tanpa badai, tetapi Allah yang hadir di tengah badai.',
      'Bacalah mazmur ini perlahan bersama keluarga malam ini, dan serahkan satu pergumulan yang sedang dihadapi kepada Tuhan.',
      'Doa: Ya Allah, Engkaulah tempat perlindungan kami. Teguhkan kami ketika segala sesuatu di sekitar kami goyah. Amin.',
    ],
  },
  {
    date: '2026-10-28',
    title: 'Satu Tubuh, Banyak Anggota',
    passage: '1 Korintus 12:12-27',
    photo: 'serambi',
    body: [
      'Paulus menggambarkan jemaat sebagai satu tubuh dengan banyak anggota. Mata tidak dapat berkata kepada tangan, aku tidak membutuhkan engkau. Justru anggota yang tampaknya paling lemah adalah yang paling dibutuhkan, dan bila satu anggota menderita, semua anggota turut menderita.',
      'Hari ini bangsa kita mengenang Sumpah Pemuda 28 Oktober 1928, ketika para pemuda dari berbagai suku dan pulau mengaku bertumpah darah satu, berbangsa satu, dan menjunjung bahasa persatuan. Jemaat kita pun dihimpun dari keluarga yang berasal dari banyak pulau di Nusa Tenggara Timur. Keberagaman itu bukan ancaman, melainkan kekayaan tubuh Kristus.',
      'Mari menghargai setiap anggota jemaat, termasuk yang pelayanannya tidak terlihat: petugas kebersihan gereja, pemusik yang berlatih sampai malam, dan ibu-ibu yang menyiapkan konsumsi.',
      'Doa: Tuhan, persatukan kami sebagai satu tubuh dalam Kristus, dan ajarlah kami saling menghargai. Amin.',
    ],
  },
  {
    date: '2026-10-29',
    title: 'Orang Benar Akan Hidup oleh Iman',
    passage: 'Roma 1:16-17',
    photo: 'menara',
    body: [
      'Paulus berkata ia tidak malu akan Injil, sebab Injil adalah kekuatan Allah yang menyelamatkan setiap orang yang percaya. Di dalamnya nyata kebenaran Allah, yang bertolak dari iman dan memimpin kepada iman. Ayat inilah yang membuka mata Martin Luther dan menjadi salah satu dasar Reformasi: manusia dibenarkan bukan karena usahanya, melainkan oleh anugerah Allah yang diterima dengan iman.',
      'Menjelang Hari Reformasi, kita diingatkan bahwa keselamatan bukan hasil tumpukan perbuatan baik, jabatan gerejawi, atau besarnya persembahan. Semua itu ungkapan syukur, bukan alat untuk membeli kasih Allah.',
      'Kebebasan ini membuat kita melayani dengan sukacita, bukan dengan rasa takut. Kita memberi, mengunjungi, dan bekerja karena sudah lebih dahulu dikasihi.',
      'Doa: Tuhan, terima kasih atas Injil yang menyelamatkan. Teguhkan iman kami agar hidup dari anugerah-Mu setiap hari. Amin.',
    ],
  },
  {
    date: '2026-10-30',
    title: 'Diselamatkan oleh Kasih Karunia',
    passage: 'Efesus 2:8-10',
    body: [
      'Karena kasih karunia kamu diselamatkan oleh iman; itu bukan hasil usahamu, tetapi pemberian Allah. Paulus segera menambahkan bahwa kita adalah buatan Allah, diciptakan dalam Kristus Yesus untuk melakukan pekerjaan baik yang telah dipersiapkan Allah sebelumnya.',
      'Anugerah dan perbuatan baik tidak saling bertentangan. Anugerah adalah akar, perbuatan baik adalah buahnya. Kita tidak berbuat baik supaya diselamatkan, tetapi karena sudah diselamatkan. Urutan ini menjaga pelayanan kita agar tidak berubah menjadi ajang mencari pengakuan.',
      'Pekerjaan baik itu sudah disiapkan Allah. Hari ini mungkin berupa mengantar tetangga berobat, membantu anak belajar, atau menyelesaikan pekerjaan kantor dengan jujur.',
      'Doa: Bapa, terima kasih atas kasih karunia-Mu. Pakailah tangan kami untuk pekerjaan baik yang telah Kausiapkan. Amin.',
    ],
  },
  {
    date: '2026-10-31',
    title: 'Berubah oleh Pembaruan Budi',
    passage: 'Roma 12:1-2',
    photo: 'lebar',
    body: [
      'Hari ini gereja-gereja Protestan memperingati Reformasi, yang ditandai seruan Martin Luther pada 31 Oktober 1517. Pada tanggal yang sama tahun 1947, Gereja Masehi Injili di Timor berdiri sebagai gereja yang mandiri. Kita mensyukuri 79 tahun perjalanan GMIT dan 509 tahun Reformasi.',
      'Paulus mengajak kita mempersembahkan tubuh sebagai persembahan yang hidup, kudus, dan berkenan kepada Allah, serta tidak menjadi serupa dengan dunia ini, tetapi berubah oleh pembaruan budi. Reformasi bukan peristiwa yang selesai di masa lalu; gereja selalu perlu dibarui oleh firman Tuhan.',
      'Pembaruan dimulai dari hal kecil: kerinduan membaca Alkitab, kesediaan dikoreksi, dan keberanian meninggalkan kebiasaan yang tidak berkenan kepada Tuhan.',
      'Doa: Tuhan, terima kasih atas penyertaan-Mu bagi GMIT. Baruilah gereja-Mu dan hidup kami oleh firman-Mu. Amin.',
    ],
  },
  {
    date: '2026-11-01',
    title: 'Yang Terbesar Menjadi Pelayan',
    passage: 'Matius 23:1-12',
    body: [
      'Yesus mengecam para ahli Taurat dan orang Farisi yang mengajarkan hukum tetapi tidak melakukannya, yang menyukai tempat terhormat dan sapaan hormat di depan umum. Lalu Ia berkata: barang siapa terbesar di antara kamu, hendaklah ia menjadi pelayanmu.',
      'Gelar dan jabatan dalam gereja adalah panggilan untuk melayani, bukan untuk dihormati. Hal ini berlaku bagi pendeta, majelis, pengurus kategorial, dan setiap warga jemaat. Ukuran kebesaran di mata Yesus adalah kesediaan merendahkan diri bagi orang lain.',
      'Minggu ini, carilah satu kesempatan melayani tanpa diketahui orang lain: merapikan kursi gereja, membantu tetangga mengangkat air, atau mendoakan seseorang secara diam-diam.',
      'Doa: Tuhan Yesus, Engkau datang untuk melayani. Bentuklah kami menjadi pelayan yang rendah hati. Amin.',
    ],
  },
  {
    date: '2026-11-02',
    title: 'Pengharapan di Tengah Duka',
    passage: '1 Tesalonika 4:13-18',
    photo: 'abu',
    body: [
      'Jemaat Tesalonika berduka karena beberapa saudara mereka meninggal sebelum kedatangan Tuhan. Paulus tidak melarang mereka berduka, tetapi mengingatkan agar tidak berduka seperti orang yang tidak mempunyai pengharapan. Jika kita percaya bahwa Yesus telah mati dan bangkit, Allah juga akan mengumpulkan mereka yang telah meninggal dalam Yesus.',
      'Dalam beberapa minggu terakhir, jemaat kita juga melepas saudara yang dipanggil Tuhan. Duka itu nyata dan tidak perlu disembunyikan. Namun di tengah tangis, kita berpegang pada janji kebangkitan.',
      'Paulus menutup bagian ini dengan ajakan: hiburkanlah seorang akan yang lain dengan perkataan-perkataan ini. Kunjungilah keluarga yang berduka, juga setelah ibadah penghiburan selesai, sebab kesepian sering datang justru setelah rumah kembali sepi.',
      'Doa: Tuhan yang bangkit, hiburlah keluarga yang berduka dan teguhkan pengharapan kami akan hidup kekal. Amin.',
    ],
  },
  {
    date: '2026-11-03',
    title: 'Pelita yang Tetap Menyala',
    passage: 'Matius 25:1-13',
    body: [
      'Yesus bercerita tentang sepuluh gadis yang menanti mempelai. Lima bijaksana membawa minyak cadangan, lima lagi tidak. Ketika mempelai datang tengah malam, pelita gadis-gadis yang bodoh hampir padam, dan mereka tertinggal di luar. Yesus menutup perumpamaan itu: berjaga-jagalah, sebab kamu tidak tahu akan hari maupun saatnya.',
      'Minyak dalam perumpamaan ini tidak dapat dipinjam pada saat terakhir. Persekutuan pribadi dengan Tuhan dibangun hari demi hari: dalam doa, firman, dan ketaatan. Tidak ada yang dapat menggantikannya, bahkan iman orang tua atau keaktifan kita di gereja.',
      'Menjelang masa Adven, mari memeriksa pelita kita. Apakah kita masih menyediakan waktu untuk Tuhan di tengah kesibukan akhir tahun?',
      'Doa: Tuhan, jagalah pelita iman kami agar tetap menyala sampai Engkau datang kembali. Amin.',
    ],
  },
  {
    date: '2026-11-04',
    title: 'Aku dan Seisi Rumahku',
    passage: 'Yosua 24:14-18',
    photo: 'hangat',
    body: [
      'Di akhir hidupnya, Yosua mengumpulkan seluruh suku Israel di Sikhem dan menantang mereka memilih siapa yang akan disembah. Lalu ia membuat keputusan yang terkenal: tetapi aku dan seisi rumahku, kami akan beribadah kepada TUHAN.',
      'Setiap generasi harus membuat pilihannya sendiri. Banyak hal bersaing merebut hati keluarga kita: kesibukan, hiburan, gengsi, bahkan kebiasaan turun-temurun yang tidak sesuai firman. Pilihan Yosua bukan hanya pilihan pribadi, tetapi keputusan yang dipimpin oleh kepala keluarga.',
      'Bicarakan dengan keluarga malam ini: apa wujud nyata beribadah kepada Tuhan di rumah kita? Mungkin mezbah keluarga setiap malam, atau komitmen hadir bersama di ibadah rumah tangga.',
      'Doa: Tuhan, kami memilih beribadah kepada-Mu. Tolonglah keluarga kami setia pada pilihan ini. Amin.',
    ],
  },
  {
    date: '2026-11-05',
    title: 'Keadilan seperti Air yang Bergulung',
    passage: 'Amos 5:21-24',
    body: [
      'Melalui Amos, Tuhan berkata bahwa Ia membenci perayaan ibadah umat-Nya. Bukan karena ibadah itu salah, tetapi karena umat beribadah dengan meriah sementara orang miskin ditindas. Tuhan menghendaki keadilan bergulung-gulung seperti air dan kebenaran seperti sungai yang selalu mengalir.',
      'Gambaran air yang terus mengalir sangat bermakna bagi kita di Kupang yang mengenal sulitnya air di musim kemarau. Keadilan yang Tuhan kehendaki tidak sesekali, tetapi terus mengalir: dalam cara kita berdagang, membayar pekerja, dan memperlakukan orang yang lemah.',
      'Ibadah yang berkenan tidak berhenti di gedung gereja. Ia berlanjut ketika kita memperjuangkan yang benar dan peduli kepada yang berkekurangan, termasuk melalui pelayanan diakonia jemaat.',
      'Doa: Tuhan, jadikan ibadah kami nyata dalam keadilan dan kebenaran setiap hari. Amin.',
    ],
  },
]

export type NewsItem = {
  // Waktu terbit (WITA).
  at: string
  title: string
  summary: string
  photo?: Photo
  body: string[]
  draft?: boolean
}

// Berita & pengumuman. {{...}} diisi skrip dari data demo (nama dan angka yang konsisten).
export const NEWS: NewsItem[] = [
  {
    at: '2026-09-06T09:00',
    title: 'Pendaftaran Katekisasi Sidi Angkatan 2026/2027',
    summary:
      'Remaja berusia 15 tahun ke atas yang sudah dibaptis dapat mendaftar sampai 27 September 2026.',
    photo: 'menara',
    body: [
      'Majelis Jemaat membuka pendaftaran katekisasi sidi angkatan 2026/2027 bagi remaja yang berusia 15 tahun ke atas dan sudah menerima baptisan kudus. Katekisasi berlangsung selama satu tahun setiap Sabtu pukul 16.00 WITA di gedung gereja, dimulai Sabtu, 3 Oktober 2026.',
      'Pendaftaran dilakukan melalui formulir Layanan Sakramen di portal ini atau di kantor jemaat setelah ibadah Minggu, dengan melampirkan surat baptis dan Kartu Keluarga. Orang tua diharapkan mendampingi anak saat pendaftaran.',
      'Peserta yang menyelesaikan katekisasi akan diteguhkan sebagai anggota sidi jemaat pada Minggu Pentakosta 2027.',
    ],
  },
  {
    at: '2026-09-13T10:00',
    title: 'Pembangunan Pastori Tahap II Memasuki Pekerjaan Atap',
    summary:
      'Pekerjaan dinding dan ring balok selesai; pemasangan rangka atap dimulai pertengahan September.',
    photo: 'atap',
    body: [
      'Pembangunan pastori tahap II yang dimulai Mei 2026 telah menyelesaikan pekerjaan dinding dan pengecoran ring balok. Pemasangan rangka atap baja ringan dimulai pertengahan September dan ditargetkan selesai sebelum musim hujan.',
      'Anggaran tahap II dalam RAPBJ 2026 sebesar Rp400.000.000 bersumber dari persembahan pembangunan jemaat, alokasi bulanan Kas Umum, dan donasi. Rincian penerimaan dan pengeluaran Kas Pembangunan dimuat dalam laporan keuangan di warta setiap bulan.',
      'Majelis Jemaat berterima kasih kepada seluruh warga jemaat yang telah memberi persembahan dan tenaga, termasuk kaum bapak dari kelima rayon yang bergiliran membantu pekerjaan pada hari Sabtu.',
    ],
  },
  {
    at: '2026-09-20T09:00',
    title: 'Bantuan Pendidikan Tahun Ajaran 2026/2027 Telah Disalurkan',
    summary:
      'Sebanyak 24 pelajar dan mahasiswa dari lima rayon menerima bantuan pendidikan dari Kas Diakonia.',
    photo: 'hangat',
    body: [
      'Melalui Kas Diakonia, Majelis Jemaat menyalurkan bantuan pendidikan kepada 16 pelajar SD sampai SMA dan 8 mahasiswa dari keluarga jemaat yang membutuhkan, dengan jumlah keseluruhan Rp14.000.000.',
      'Penerima diusulkan oleh majelis rayon masing-masing berdasarkan kunjungan ke rumah keluarga. Bantuan diserahkan dalam ibadah Minggu pada Agustus lalu, bertepatan dengan awal tahun ajaran baru.',
      'Warga jemaat yang ingin mendukung pelayanan ini dapat memberi melalui kotak persembahan diakonia atau rekening Kas Diakonia yang tercantum di halaman Persembahan.',
    ],
  },
  {
    at: '2026-09-27T11:00',
    title: 'Rapat Majelis Jemaat Lengkap Triwulan III',
    summary:
      'Rapat evaluasi program dan keuangan triwulan III diadakan Jumat, 2 Oktober 2026 pukul 18.30 WITA.',
    body: [
      'Seluruh pendeta, penatua, dan diaken diundang mengikuti Rapat Majelis Jemaat Lengkap Triwulan III pada Jumat, 2 Oktober 2026 pukul 18.30 WITA di ruang konsistori.',
      'Agenda rapat meliputi evaluasi pelaksanaan program pelayanan, laporan keuangan per Pos Kas sampai September, perkembangan pembangunan pastori, serta persiapan perayaan HUT GMIT, Adven, dan Natal.',
      'Majelis yang berhalangan hadir dimohon memberi kabar kepada sekretaris Majelis Jemaat.',
    ],
  },
  {
    at: '2026-10-04T10:00',
    title: 'Pewartaan Nikah: {{groom}} dan {{bride}}',
    summary:
      'Pemberkatan nikah direncanakan Sabtu, 14 November 2026 pukul 10.00 WITA di gedung gereja.',
    body: [
      'Majelis Jemaat mewartakan rencana pemberkatan nikah {{groom}} (Rayon {{groomRayon}}), putra dari {{groomParents}}, dengan {{bride}} (Rayon {{brideRayon}}), putri dari {{brideParents}}.',
      'Pemberkatan nikah direncanakan pada Sabtu, 14 November 2026 pukul 10.00 WITA di gedung gereja dan dilayani oleh {{pastor}}.',
      'Sesuai tata gereja, bila ada warga jemaat yang mengetahui halangan bagi pernikahan ini, harap menyampaikannya kepada Majelis Jemaat paling lambat Minggu, 8 November 2026.',
    ],
  },
  {
    at: '2026-10-09T15:00',
    title: 'Kerja Bakti Membersihkan Saluran Air Menjelang Musim Hujan',
    summary:
      'Sabtu, 17 Oktober 2026 pukul 06.30 WITA, seluruh rayon membersihkan halaman dan saluran air gereja.',
    photo: 'serambi',
    body: [
      'Menjelang musim hujan, Majelis Jemaat mengajak warga jemaat dari kelima rayon bekerja bakti pada Sabtu, 17 Oktober 2026 mulai pukul 06.30 WITA.',
      'Pekerjaan meliputi pembersihan saluran air di sekeliling gedung gereja dan pastori, pemangkasan pohon di halaman, serta perapian gudang. Rayon Getsemani dan Golgota bertugas di halaman depan, Rayon Tiberias dan Galilea di sekitar pastori, dan Rayon Kapernaum di gudang serta saluran belakang.',
      'Peserta dimohon membawa parang, sapu lidi, atau sekop. Konsumsi disiapkan oleh kaum ibu.',
    ],
  },
  {
    at: '2026-10-13T20:00',
    title: 'Berita Dukacita: {{deceased}}',
    summary:
      '{{deceased}} dari Rayon {{deceasedRayon}} dipanggil Tuhan pada Selasa, 13 Oktober 2026.',
    body: [
      'Dengan dukacita, Majelis Jemaat menyampaikan bahwa {{deceased}} dari Rayon {{deceasedRayon}} telah dipanggil Tuhan pada Selasa, 13 Oktober 2026 dalam usia {{deceasedAge}} tahun.',
      'Ibadah penghiburan diadakan di rumah duka pada Selasa dan Rabu malam pukul 19.00 WITA. Ibadah pemakaman dilaksanakan Kamis, 15 Oktober 2026 pukul 14.00 WITA, dilayani oleh {{pastor}}.',
      'Kiranya Tuhan memberi penghiburan dan kekuatan kepada keluarga yang ditinggalkan. Warga jemaat diajak turut mendoakan dan mengunjungi keluarga duka.',
    ],
  },
  {
    at: '2026-10-17T09:00',
    title: 'Panitia Natal Jemaat 2026 Dibentuk',
    summary:
      'Panitia diketuai {{christmasChair}}; Kebaktian Malam Natal 24 Desember pukul 19.00 WITA.',
    photo: 'jendela',
    body: [
      'Majelis Jemaat telah membentuk Panitia Natal Jemaat 2026 yang diketuai {{christmasChair}}, dengan anggota dari kelima rayon dan seluruh kategorial.',
      'Kebaktian Malam Natal direncanakan Kamis, 24 Desember 2026 pukul 19.00 WITA, dan Kebaktian Natal pada Jumat, 25 Desember 2026 pukul 07.00 WITA. Tema perayaan mengikuti tema Natal yang ditetapkan Majelis Sinode GMIT.',
      'Rapat perdana panitia diadakan Jumat, 23 Oktober 2026 pukul 19.00 WITA di ruang konsistori. Setiap rayon dimohon mengutus dua orang wakil.',
    ],
  },
  {
    at: '2026-10-20T10:00',
    title: 'Pelatihan Pemandu Lagu dan Pemusik Gereja',
    summary:
      'Pelatihan setiap Kamis, 5–26 November 2026 pukul 19.00 WITA, terbuka bagi pemuda dan kaum ibu.',
    body: [
      'Tim musik jemaat mengadakan pelatihan bagi pemandu lagu dan pemusik gereja setiap Kamis, 5 sampai 26 November 2026 pukul 19.00 WITA di gedung gereja.',
      'Materi meliputi dasar membaca not angka, memandu nyanyian jemaat, dan mengiringi ibadah dengan keyboard. Peserta yang telah mengikuti pelatihan akan dilibatkan dalam jadwal pelayanan ibadah Minggu dan ibadah rumah tangga.',
      'Pendaftaran disampaikan kepada majelis rayon masing-masing paling lambat Minggu, 1 November 2026.',
    ],
  },
  {
    at: '2026-10-23T09:00',
    title: 'Ibadah Syukur HUT ke-79 GMIT dan Hari Reformasi',
    summary: 'Sabtu, 31 Oktober 2026 pukul 17.00 WITA di gedung gereja, dilayani {{secondPastor}}.',
    photo: 'lebar',
    body: [
      'Gereja Masehi Injili di Timor berdiri sebagai gereja yang mandiri pada 31 Oktober 1947, bertepatan dengan peringatan Reformasi 31 Oktober 1517. Tahun ini GMIT berusia 79 tahun.',
      'Jemaat merayakannya dalam Ibadah Syukur pada Sabtu, 31 Oktober 2026 pukul 17.00 WITA di gedung gereja, dilayani oleh {{secondPastor}}. Setiap rayon membawakan satu pujian.',
      'Persembahan syukur dalam ibadah ini dialokasikan untuk Kas Pembangunan, khususnya penyelesaian pastori tahap II.',
    ],
  },
  {
    at: '2026-10-26T08:00',
    title: 'Pemeriksaan Kesehatan Gratis bagi Lansia',
    summary:
      'Minggu, 8 November 2026 setelah ibadah pagi, di halaman gereja: tensi, gula darah, dan asam urat.',
    photo: 'sisi',
    body: [
      'Kategorial Lansia bersama tenaga kesehatan anggota jemaat mengadakan pemeriksaan kesehatan gratis pada Minggu, 8 November 2026 setelah Kebaktian Minggu Pagi, sekitar pukul 09.00 WITA, di halaman gereja.',
      'Pemeriksaan meliputi tekanan darah, gula darah, dan asam urat, disertai konsultasi singkat. Warga lansia yang memiliki catatan obat rutin dimohon membawanya.',
      'Anggota keluarga diharapkan mendampingi orang tua yang membutuhkan bantuan berjalan.',
    ],
  },
  {
    at: '2026-10-28T16:00',
    title: 'Laporan Persembahan dan Kas Bulan September 2026',
    summary:
      'Penerimaan September {{septIncome}}, pengeluaran {{septExpense}}; rincian per Pos Kas di dalam.',
    body: [
      'Majelis Jemaat menyampaikan laporan keuangan bulan September 2026. Penerimaan seluruh Pos Kas berjumlah {{septIncome}} dan pengeluaran berjumlah {{septExpense}}.',
      '{{septByFund}}',
      'Laporan lengkap per mata anggaran dapat dilihat oleh warga jemaat di kantor jemaat. Terima kasih atas setiap persembahan yang diberikan dengan sukacita.',
    ],
  },
  {
    at: '2026-11-02T09:00',
    title: 'Pelayanan Baptisan Kudus pada Minggu Adven I',
    summary:
      'Baptisan Kudus dilayankan Minggu, 29 November 2026; pendaftaran paling lambat 15 November.',
    photo: 'jendela',
    body: [
      'Baptisan Kudus bagi anak-anak warga jemaat akan dilayankan dalam Kebaktian Minggu Pagi, 29 November 2026 (Minggu Adven I).',
      'Orang tua mendaftar melalui formulir Layanan Sakramen di portal ini dengan melampirkan akta kelahiran anak, paling lambat Minggu, 15 November 2026. Orang tua dan saksi baptis akan mengikuti percakapan penggembalaan sebelum hari pelayanan.',
    ],
  },
  {
    at: '2026-11-06T09:00',
    title: 'Jadwal Ibadah Natal Kategorial 2026',
    summary:
      'Ibadah Natal PAR, Pemuda, Kaum Ibu, Kaum Bapak, dan Lansia pada pertengahan Desember.',
    draft: true,
    body: [
      'Jadwal ibadah Natal kategorial sedang disusun bersama pengurus kategorial dan akan diumumkan setelah rapat Panitia Natal.',
    ],
  },
]

// Galeri dokumentasi 2026 (foto: potongan foto gedung gereja sebagai pengganti).
export const GALLERY: { at: string; title: string; summary: string; photo: Photo }[] = [
  {
    at: '2026-04-03T12:00',
    title: 'Kebaktian Jumat Agung',
    summary:
      'Jemaat mengikuti Kebaktian Jumat Agung dengan pembacaan kisah sengsara menurut Yohanes 19.',
    photo: 'lebar',
  },
  {
    at: '2026-04-05T08:00',
    title: 'Ibadah Subuh Paskah di Pantai Lasiana',
    summary: 'Ibadah subuh Paskah bersama kelima rayon di Pantai Lasiana, pukul 05.00 WITA.',
    photo: 'abu',
  },
  {
    at: '2026-05-24T12:00',
    title: 'Peneguhan Sidi Minggu Pentakosta',
    summary: '{{sidiCount}} remaja diteguhkan sebagai anggota sidi jemaat pada Minggu Pentakosta.',
    photo: 'menara',
  },
  {
    at: '2026-06-27T20:00',
    title: 'Persekutuan Pemuda di Pantai Lasiana',
    summary: 'Ibadah dan persekutuan pemuda jemaat menjelang libur sekolah.',
    photo: 'hangat',
  },
  {
    at: '2026-08-16T12:00',
    title: 'Ibadah Syukur HUT ke-81 Kemerdekaan RI',
    summary: 'Kebaktian Minggu bertema "Merdeka untuk melayani" menyambut 17 Agustus 2026.',
    photo: 'jendela',
  },
  {
    at: '2026-08-29T15:00',
    title: 'Lomba Cerdas Cermat Alkitab PAR Antarrayon',
    summary: 'Anak-anak PAR dari lima rayon berlomba menjawab pertanyaan dari kisah-kisah Alkitab.',
    photo: 'sisi',
  },
  {
    at: '2026-09-12T16:00',
    title: 'Pengecoran Ring Balok Pastori Tahap II',
    summary: 'Kaum bapak dari kelima rayon bergotong royong mengecor ring balok pastori.',
    photo: 'atap',
  },
  {
    at: '2026-10-17T11:00',
    title: 'Kerja Bakti Menjelang Musim Hujan',
    summary: 'Warga jemaat membersihkan saluran air dan halaman gereja menjelang musim hujan.',
    photo: 'serambi',
  },
]

// Koordinator diisi skrip dari daftar majelis; ini wilayah tiap rayon (RT contoh).
export const RAYON_AREAS: Record<string, { area: string; rt: [number, number]; rw: number[] }> = {
  Getsemani: { area: 'Lasiana bagian barat', rt: [1, 7], rw: [1, 2] },
  Golgota: { area: 'Lasiana bagian tengah', rt: [8, 13], rw: [2, 3] },
  Tiberias: { area: 'Sekitar Jalan Timor Raya', rt: [14, 19], rw: [3, 4] },
  Galilea: { area: 'Perumahan Lasiana timur', rt: [20, 25], rw: [4, 5] },
  Kapernaum: { area: 'Permukiman pesisir dekat Pantai Lasiana', rt: [26, 31], rw: [5, 6] },
}

export const PROFILE_HISTORY = [
  'Jemaat Lahairoi Tuak Sabu Lasiana adalah salah satu jemaat Gereja Masehi Injili di Timor (GMIT) yang melayani warga di Kelurahan Lasiana, Kecamatan Kelapa Lima, Kota Kupang. Seperti umumnya jemaat di Kota Kupang, warga jemaat berasal dari berbagai pulau di Nusa Tenggara Timur yang menetap di Kupang untuk bekerja dan bersekolah.',
  'GMIT berdiri sebagai gereja yang mandiri pada 31 Oktober 1947 dan mewarisi tradisi gereja Protestan yang berakar pada Reformasi. Sebagai bagian dari GMIT, jemaat ini mengikuti tata gereja, tata ibadah, dan keputusan persidangan Sinode GMIT.',
  'Nama Lahai-roi diambil dari Kejadian 16:13-14, nama sumur tempat Hagar berjumpa dengan Allah yang melihat dia. Pelayanan jemaat dibagi dalam lima rayon dengan nama-nama tempat dalam Alkitab: Getsemani, Golgota, Tiberias, Galilea, dan Kapernaum.',
  'Catatan lengkap tentang perintisan jemaat, para pelayan perdana, dan pembangunan gedung gereja sedang dihimpun Majelis Jemaat dari arsip dan kesaksian warga jemaat.',
]

export const PROFILE_VISION = [
  'Menjadi jemaat yang beriman, bersekutu, dan melayani, sehingga setiap keluarga di lima rayon mengalami kasih Allah yang melihat dan memelihara.',
]

export const PROFILE_MISSION = [
  'Memberitakan firman Tuhan melalui kebaktian Minggu, ibadah rumah tangga, dan ibadah kategorial.',
  'Membina iman anak, remaja, pemuda, kaum ibu, kaum bapak, dan lansia secara berkelanjutan.',
  'Menguatkan persekutuan antarkeluarga dan antarrayon dalam semangat saling menopang.',
  'Melayani warga yang sakit, berduka, dan berkekurangan melalui pelayanan diakonia.',
  'Mengelola harta milik jemaat secara jujur, tertib, dan terbuka.',
]

export const PROFILE_NAME_MEANING = [
  'Nama Lahai-roi berasal dari Kejadian 16:13-14. Hagar, yang lari ke padang gurun, dijumpai Malaikat TUHAN di dekat sebuah mata air. Ia lalu menyebut TUHAN "Allah yang melihat aku", dan sumur itu dinamai Lahai-roi, artinya sumur Dia yang hidup, yang melihat aku.',
  'Nama ini menjadi pengingat bagi jemaat bahwa Allah yang hidup melihat dan memperhatikan setiap keluarga, juga mereka yang merasa terpinggirkan.',
]

export const PROFILE_OFFICE = [
  'Kantor Majelis Jemaat melayani urusan administrasi pada Selasa sampai Sabtu pukul 09.00-14.00 WITA: surat keterangan anggota jemaat, atestasi pindah atau masuk, dan pendaftaran sakramen.',
  'Di luar jam tersebut, warga jemaat dapat menghubungi majelis rayon masing-masing atau datang setelah Kebaktian Minggu.',
]

// Rekening contoh: nomor bukan rekening sungguhan.
export const PAYMENT_ACCOUNTS: { title: string; number: string; body: string; qris?: boolean }[] = [
  {
    title: 'Bank NTT · Kas Umum Jemaat',
    number: '001.01.02.000147-1',
    body: 'a.n. GMIT Jemaat Lahairoi Tuak Sabu\nUntuk persembahan syukur, persepuluhan, dan nazar.',
    qris: true,
  },
  {
    title: 'Bank NTT · Kas Pembangunan',
    number: '001.01.02.000247-3',
    body: 'a.n. GMIT Jemaat Lahairoi Pembangunan\nUntuk pembangunan pastori tahap II dan pemeliharaan gedung gereja.',
  },
  {
    title: 'Bank NTT · Kas Diakonia',
    number: '001.01.02.000347-5',
    body: 'a.n. GMIT Jemaat Lahairoi Diakonia\nUntuk bantuan warga sakit, berduka, dan bantuan pendidikan anak jemaat.',
  },
]

export type MailItem = {
  date: string
  direction: 'INCOMING' | 'OUTGOING'
  number: string | null
  party: string
  subject: string
  category: 'ATESTASI' | 'TUGAS' | 'UNDANGAN' | 'UMUM'
  file?: boolean
}

export const MAILS: MailItem[] = [
  {
    date: '2026-01-05',
    direction: 'OUTGOING',
    number: '001/MJ-LHR/I/2026',
    party: 'Majelis Klasis GMIT',
    subject: 'Laporan statistik jemaat akhir tahun 2025',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-01-12',
    direction: 'INCOMING',
    number: '015/MS-GMIT/I/2026',
    party: 'Majelis Sinode GMIT',
    subject: 'Surat edaran program pelayanan tahun 2026',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-01-20',
    direction: 'INCOMING',
    number: '005/KL-LSN/I/2026',
    party: 'Lurah Lasiana',
    subject: 'Undangan Musyawarah Perencanaan Pembangunan Kelurahan Lasiana',
    category: 'UNDANGAN',
  },
  {
    date: '2026-01-26',
    direction: 'OUTGOING',
    number: '004/MJ-LHR/I/2026',
    party: 'Lurah Lasiana',
    subject: 'Usulan perbaikan saluran air di permukiman pesisir RT 026-031',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-02-02',
    direction: 'OUTGOING',
    number: '006/MJ-LHR/II/2026',
    party: 'Seluruh Majelis Jemaat',
    subject: 'Undangan Rapat Kerja Majelis Jemaat Tahun 2026',
    category: 'UNDANGAN',
  },
  {
    date: '2026-02-23',
    direction: 'INCOMING',
    number: '021/MK/II/2026',
    party: 'Majelis Klasis GMIT',
    subject: 'Undangan Persidangan Majelis Klasis',
    category: 'UNDANGAN',
    file: true,
  },
  {
    date: '2026-03-09',
    direction: 'INCOMING',
    number: '048/MS-GMIT/III/2026',
    party: 'Majelis Sinode GMIT',
    subject: 'Pedoman ibadah Minggu sengsara dan Paskah 2026',
    category: 'UMUM',
  },
  {
    date: '2026-03-16',
    direction: 'OUTGOING',
    number: '011/MJ-LHR/III/2026',
    party: '{{easterChair}}',
    subject: 'Surat tugas Ketua Panitia Paskah 2026',
    category: 'TUGAS',
    file: true,
  },
  {
    date: '2026-04-20',
    direction: 'INCOMING',
    number: '012/MJ/IV/2026',
    party: 'Majelis Jemaat GMIT di Seba, Sabu Raijua',
    subject: 'Surat atestasi keluarga {{transferInHead}}',
    category: 'ATESTASI',
    file: true,
  },
  {
    date: '2026-04-27',
    direction: 'OUTGOING',
    number: '017/MJ-LHR/IV/2026',
    party: 'Majelis Jemaat GMIT di Seba, Sabu Raijua',
    subject: 'Tanda terima atestasi keluarga {{transferInHead}}',
    category: 'ATESTASI',
  },
  {
    date: '2026-05-04',
    direction: 'OUTGOING',
    number: '019/MJ-LHR/V/2026',
    party: 'Pemerintah Kota Kupang c.q. Bagian Kesejahteraan Rakyat',
    subject: 'Permohonan bantuan dana pembangunan pastori tahap II',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-06-15',
    direction: 'INCOMING',
    number: '090/KEC-KL/VI/2026',
    party: 'Camat Kelapa Lima',
    subject: 'Undangan rapat koordinasi tokoh agama menjelang HUT Kemerdekaan RI',
    category: 'UNDANGAN',
  },
  {
    date: '2026-06-22',
    direction: 'OUTGOING',
    number: '024/MJ-LHR/VI/2026',
    party: "Majelis Jemaat tujuan di Ba'a, Rote Ndao",
    subject: 'Surat atestasi pindah {{transferOut}}',
    category: 'ATESTASI',
    file: true,
  },
  {
    date: '2026-07-13',
    direction: 'OUTGOING',
    number: '029/MJ-LHR/VII/2026',
    party: 'Vik. Yosua Ndun, S.Th.',
    subject: 'Surat tugas pendamping persekutuan pemuda',
    category: 'TUGAS',
  },
  {
    date: '2026-08-24',
    direction: 'INCOMING',
    number: '063/MK/VIII/2026',
    party: 'Majelis Klasis GMIT',
    subject: 'Permintaan laporan statistik jemaat semester I 2026',
    category: 'UMUM',
  },
  {
    date: '2026-08-31',
    direction: 'OUTGOING',
    number: '035/MJ-LHR/VIII/2026',
    party: 'Majelis Klasis GMIT',
    subject: 'Laporan statistik jemaat semester I 2026',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-09-21',
    direction: 'INCOMING',
    number: '112/MS-GMIT/IX/2026',
    party: 'Majelis Sinode GMIT',
    subject: 'Surat edaran perayaan HUT ke-79 GMIT dan Hari Reformasi',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-09-28',
    direction: 'OUTGOING',
    number: '040/MJ-LHR/IX/2026',
    party: 'Seluruh Majelis Jemaat',
    subject: 'Undangan Rapat Majelis Jemaat Lengkap Triwulan III',
    category: 'UNDANGAN',
  },
  {
    date: '2026-10-12',
    direction: 'INCOMING',
    number: '120/MS-GMIT/X/2026',
    party: 'Majelis Sinode GMIT',
    subject: 'Surat edaran tema Natal dan Tahun Baru',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-10-16',
    direction: 'OUTGOING',
    number: '043/MJ-LHR/X/2026',
    party: '{{christmasChair}}',
    subject: 'Surat keputusan pembentukan Panitia Natal Jemaat 2026',
    category: 'TUGAS',
    file: true,
  },
  {
    date: '2026-10-19',
    direction: 'OUTGOING',
    number: '044/MJ-LHR/X/2026',
    party: 'Majelis Klasis GMIT',
    subject: 'Laporan keuangan jemaat triwulan III 2026',
    category: 'UMUM',
    file: true,
  },
  {
    date: '2026-10-26',
    direction: 'OUTGOING',
    number: '046/MJ-LHR/X/2026',
    party: 'Seluruh rayon',
    subject: 'Undangan Ibadah Syukur HUT ke-79 GMIT dan Hari Reformasi',
    category: 'UNDANGAN',
  },
  {
    date: '2026-10-26',
    direction: 'INCOMING',
    number: '118/KL-LSN/X/2026',
    party: 'Lurah Lasiana',
    subject: 'Imbauan kesiapsiagaan menghadapi musim hujan',
    category: 'UMUM',
  },
  {
    date: '2026-10-28',
    direction: 'OUTGOING',
    number: '047/MJ-LHR/X/2026',
    party: 'Camat Kelapa Lima',
    subject: 'Pemberitahuan kegiatan pemeriksaan kesehatan lansia',
    category: 'UMUM',
  },
]

export type AssetItem = {
  name: string
  category: string
  quantity: number
  location: string
  source: string
  year: number | null
  value: number | null
  condition?: 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'MAINTENANCE'
  notes?: string
}

export const ASSETS: AssetItem[] = [
  {
    name: 'Kursi plastik',
    category: 'Kursi & meja',
    quantity: 300,
    location: 'Gudang gereja',
    source: 'Persembahan jemaat',
    year: 2019,
    value: 22_500_000,
  },
  {
    name: 'Kursi lipat besi',
    category: 'Kursi & meja',
    quantity: 100,
    location: 'Gudang gereja',
    source: 'Persembahan jemaat',
    year: 2022,
    value: 25_000_000,
  },
  {
    name: 'Meja lipat panjang',
    category: 'Kursi & meja',
    quantity: 20,
    location: 'Gudang gereja',
    source: 'Kas Umum',
    year: 2021,
    value: 9_000_000,
  },
  {
    name: 'Tenda terop 4 x 6 m',
    category: 'Tenda',
    quantity: 4,
    location: 'Gudang gereja',
    source: 'Persembahan Kaum Bapak',
    year: 2021,
    value: 18_000_000,
  },
  {
    name: 'Mixer audio 16 kanal',
    category: 'Sound system',
    quantity: 1,
    location: 'Ruang multimedia',
    source: 'Kas Umum',
    year: 2023,
    value: 9_500_000,
  },
  {
    name: 'Speaker aktif 15 inci',
    category: 'Sound system',
    quantity: 4,
    location: 'Gedung gereja',
    source: 'Kas Umum',
    year: 2023,
    value: 28_000_000,
  },
  {
    name: 'Mikrofon nirkabel',
    category: 'Sound system',
    quantity: 6,
    location: 'Ruang multimedia',
    source: 'Persembahan Pemuda',
    year: 2024,
    value: 7_200_000,
  },
  {
    name: 'Keyboard',
    category: 'Alat musik',
    quantity: 1,
    location: 'Gedung gereja',
    source: 'Donasi keluarga jemaat',
    year: 2020,
    value: 12_000_000,
  },
  {
    name: 'Gitar akustik',
    category: 'Alat musik',
    quantity: 2,
    location: 'Ruang multimedia',
    source: 'Persembahan Pemuda',
    year: 2022,
    value: 3_000_000,
  },
  {
    name: 'Gitar bas elektrik',
    category: 'Alat musik',
    quantity: 1,
    location: 'Ruang multimedia',
    source: 'Kas Kategorial',
    year: 2022,
    value: 4_500_000,
  },
  {
    name: 'Drum set',
    category: 'Alat musik',
    quantity: 1,
    location: 'Gedung gereja',
    source: 'Kas Umum',
    year: 2018,
    value: 8_000_000,
    condition: 'MINOR_DAMAGE',
    notes: 'Pedal bass drum perlu diganti.',
  },
  {
    name: 'Proyektor',
    category: 'Elektronik',
    quantity: 2,
    location: 'Ruang multimedia',
    source: 'Kas Umum',
    year: 2022,
    value: 11_000_000,
  },
  {
    name: 'Layar proyektor',
    category: 'Elektronik',
    quantity: 2,
    location: 'Gedung gereja',
    source: 'Kas Umum',
    year: 2022,
    value: 2_400_000,
  },
  {
    name: 'Laptop multimedia',
    category: 'Elektronik',
    quantity: 1,
    location: 'Ruang multimedia',
    source: 'Kas Umum',
    year: 2023,
    value: 9_000_000,
  },
  {
    name: 'Genset 5.000 watt',
    category: 'Elektronik',
    quantity: 1,
    location: 'Gudang gereja',
    source: 'Kas Pembangunan',
    year: 2021,
    value: 14_000_000,
    condition: 'MAINTENANCE',
    notes: 'Diservis di bengkel sejak 20 Oktober 2026.',
  },
  {
    name: 'Kipas angin dinding',
    category: 'Elektronik',
    quantity: 12,
    location: 'Gedung gereja',
    source: 'Persembahan Kaum Ibu',
    year: 2020,
    value: 4_800_000,
  },
  {
    name: 'AC ruang konsistori',
    category: 'Elektronik',
    quantity: 1,
    location: 'Ruang konsistori',
    source: 'Kas Umum',
    year: 2022,
    value: 4_500_000,
  },
  {
    name: 'Mimbar kayu',
    category: 'Perabot ibadah',
    quantity: 1,
    location: 'Gedung gereja',
    source: 'Persembahan jemaat',
    year: null,
    value: null,
  },
  {
    name: 'Meja perjamuan',
    category: 'Perabot ibadah',
    quantity: 1,
    location: 'Gedung gereja',
    source: 'Persembahan jemaat',
    year: null,
    value: null,
  },
  {
    name: 'Perlengkapan Perjamuan Kudus',
    category: 'Perabot ibadah',
    quantity: 1,
    location: 'Ruang konsistori',
    source: 'Persembahan Kaum Ibu',
    year: 2020,
    value: 6_000_000,
    notes: 'Satu set: cawan, piring roti, dan baki.',
  },
  {
    name: 'Bejana baptisan',
    category: 'Perabot ibadah',
    quantity: 1,
    location: 'Ruang konsistori',
    source: 'Persembahan jemaat',
    year: null,
    value: null,
  },
  {
    name: 'Toga dan stola pendeta',
    category: 'Perabot ibadah',
    quantity: 3,
    location: 'Ruang konsistori',
    source: 'Kas Umum',
    year: 2024,
    value: 4_500_000,
  },
  {
    name: 'Lemari arsip besi',
    category: 'Kursi & meja',
    quantity: 2,
    location: 'Ruang konsistori',
    source: 'Kas Umum',
    year: 2021,
    value: 5_000_000,
  },
  {
    name: 'Sepeda motor operasional',
    category: 'Kendaraan',
    quantity: 1,
    location: 'Pastori',
    source: 'Kas Umum',
    year: 2021,
    value: 18_000_000,
  },
  {
    name: 'Gedung gereja',
    category: 'Tanah & gedung',
    quantity: 1,
    location: 'Kelurahan Lasiana',
    source: 'Swadaya jemaat',
    year: null,
    value: null,
    notes: 'Data sertifikat tanah dan nilai bangunan menunggu inventarisasi Majelis Jemaat.',
  },
  {
    name: 'Bangunan pastori',
    category: 'Tanah & gedung',
    quantity: 1,
    location: 'Kelurahan Lasiana',
    source: 'Kas Pembangunan',
    year: 2026,
    value: null,
    condition: 'MAINTENANCE',
    notes: 'Pembangunan tahap II sedang berjalan.',
  },
]
