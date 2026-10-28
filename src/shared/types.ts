// Tipe data yang dipakai bersama oleh API (src/worker) dan frontend (src/client).

export type ApiList<T> = {
  data: T[]
}

// Daftar berhalaman, mis. GET /api/audit-logs?page=2&per_page=50.
export type ApiPage<T> = {
  data: T[]
  meta: { page: number; per_page: number; total: number }
}

// Bentuk respons error API. `details` berisi pesan per field untuk error validasi.
export type ApiErrorBody = {
  error: string
  details?: Record<string, string[]>
}

export type HealthStatus = {
  status: 'ok' | 'degraded'
  database: 'ok' | 'error'
  timestamp: string
}

export type Rayon = {
  id: number
  name: string
  description: string | null
  coordinator_name: string | null
}

export type RayonStats = {
  family_count: number
  // Anggota berstatus Aktif.
  member_count: number
}

// GET /api/rayons publik untuk portal; statistik hanya disertakan untuk pengurus
// yang sedang masuk.
export type RayonListItem = Rayon & Partial<RayonStats>

// POST /api/rayons dan PUT /api/rayons/:id (khusus Admin).
export type RayonRequest = {
  name: string
  description?: string | null
  coordinator_name?: string | null
}

export type RayonResponse = { rayon: Rayon & RayonStats }

// Kode yang tersimpan di database (CHECK pada migrasi 0003) beserta sebutannya.
export const GENDERS = ['MALE', 'FEMALE'] as const
export type Gender = (typeof GENDERS)[number]
export const GENDER_LABELS: Record<Gender, string> = { MALE: 'Laki-laki', FEMALE: 'Perempuan' }

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export const FAMILY_RELATIONS = ['HEAD', 'SPOUSE', 'CHILD', 'DEPENDENT'] as const
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number]
export const FAMILY_RELATION_LABELS: Record<FamilyRelation, string> = {
  HEAD: 'Kepala Keluarga',
  SPOUSE: 'Istri/Suami',
  CHILD: 'Anak',
  DEPENDENT: 'Tanggungan',
}

export const CATEGORICAL_GROUPS = ['PAR', 'PEMUDA', 'KAUM_IBU', 'KAUM_BAPAK', 'LANSIA'] as const
export type CategoricalGroup = (typeof CATEGORICAL_GROUPS)[number]
export const CATEGORICAL_GROUP_LABELS: Record<CategoricalGroup, string> = {
  PAR: 'PAR',
  PEMUDA: 'Pemuda',
  KAUM_IBU: 'Kaum Ibu',
  KAUM_BAPAK: 'Kaum Bapak',
  LANSIA: 'Lansia',
}

export const MARRIAGE_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const
export type MarriageStatus = (typeof MARRIAGE_STATUSES)[number]
export const MARRIAGE_STATUS_LABELS: Record<MarriageStatus, string> = {
  SINGLE: 'Belum menikah',
  MARRIED: 'Menikah',
  DIVORCED: 'Cerai hidup',
  WIDOWED: 'Cerai mati',
}

export const MEMBER_STATUSES = ['ACTIVE', 'MOVED', 'DECEASED'] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'Aktif',
  MOVED: 'Pindah',
  DECEASED: 'Meninggal',
}

// Kartu Keluarga gereja. Rayon anggota jemaat mengikuti rayon KK-nya.
export type Family = {
  id: number
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
  address: string | null
  phone: string | null
  // Anggota berstatus Aktif.
  member_count: number
  created_at: string
  updated_at: string
}

// GET /api/families/:id: KK beserta seluruh anggotanya (termasuk yang pindah atau
// meninggal), urut Kepala Keluarga, Istri/Suami, Anak, Tanggungan.
export type FamilyDetail = Family & { members: Member[] }

// POST /api/families dan PUT /api/families/:id.
export type FamilyRequest = {
  kk_number?: string | null
  family_head_name: string
  // Majelis: bila kosong, diisi rayon Majelis tersebut.
  rayon_id: number
  address?: string | null
  phone?: string | null
}

export type FamilyResponse = { family: FamilyDetail }

// Tanggal berformat YYYY-MM-DD; status baptis/sidi true berarti sudah.
export type Member = {
  id: number
  family_id: number
  church_member_number: string | null
  nik: string | null
  full_name: string
  gender: Gender
  birth_place: string | null
  birth_date: string | null
  blood_type: BloodType | null
  family_relation: FamilyRelation
  education: string | null
  occupation: string | null
  categorical_group: CategoricalGroup | null
  baptism_status: boolean
  baptism_date: string | null
  sidi_status: boolean
  sidi_date: string | null
  marriage_status: MarriageStatus | null
  marriage_date: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

// GET /api/members dan GET /api/members/:id: anggota beserta KK dan rayonnya.
export type MemberWithFamily = Member & {
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
}

// POST /api/members dan PUT /api/members/:id. Mengisi tanggal baptis/sidi tanpa
// statusnya berarti sudah dibaptis/sidi.
export type MemberRequest = {
  family_id: number
  church_member_number?: string | null
  nik?: string | null
  full_name: string
  gender: Gender
  birth_place?: string | null
  birth_date?: string | null
  blood_type?: BloodType | null
  family_relation: FamilyRelation
  education?: string | null
  occupation?: string | null
  categorical_group?: CategoricalGroup | null
  baptism_status?: boolean
  baptism_date?: string | null
  sidi_status?: boolean
  sidi_date?: string | null
  marriage_status?: MarriageStatus | null
  marriage_date?: string | null
  status?: MemberStatus
}

export type MemberResponse = { member: MemberWithFamily }

// ---------- Keuangan multi-pos (nominal: bilangan bulat Rupiah) ----------

export const FINANCE_TYPES = ['INCOME', 'EXPENSE'] as const
export type FinanceType = (typeof FINANCE_TYPES)[number]
// Sebutan pada transaksi kas.
export const TRANSACTION_TYPE_LABELS: Record<FinanceType, string> = {
  INCOME: 'Kas masuk',
  EXPENSE: 'Kas keluar',
}
// Sebutan pada mata anggaran RAPBJ.
export const BUDGET_TYPE_LABELS: Record<FinanceType, string> = {
  INCOME: 'Penerimaan',
  EXPENSE: 'Pengeluaran',
}

// Pos Kas. current_balance hanya diubah oleh trigger transaksi (migrasi 0004).
export type FinanceFund = {
  id: number
  code: string
  name: string
  description: string | null
  current_balance: number
  is_active: boolean
  budget_count: number
  transaction_count: number
  created_at: string
  updated_at: string
}

// POST /api/finance/funds dan PUT /api/finance/funds/:id (Bendahara/Admin).
export type FinanceFundRequest = {
  code: string
  name: string
  description?: string | null
  is_active?: boolean
}

export type FinanceFundResponse = { fund: FinanceFund }

// Mata anggaran RAPBJ satu tahun anggaran. realized_amount: jumlah transaksi yang
// dicatat pada mata anggaran ini.
export type FinanceBudget = {
  id: number
  fund_id: number
  fund_code: string
  fund_name: string
  fiscal_year: number
  account_code: string
  account_name: string
  type: FinanceType
  target_amount: number
  realized_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FinanceBudgetRequest = {
  fund_id: number
  fiscal_year: number
  account_code: string
  account_name: string
  type: FinanceType
  target_amount?: number
  is_active?: boolean
}

export type FinanceBudgetResponse = { budget: FinanceBudget }

export type FinanceTransaction = {
  id: number
  fund_id: number
  fund_code: string
  fund_name: string
  budget_id: number | null
  budget_code: string | null
  budget_name: string | null
  transaction_date: string
  type: FinanceType
  amount: number
  description: string | null
  // URL berkas di R2 (/api/files/kuitansi/...), hanya untuk pengurus yang masuk.
  receipt_url: string | null
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export type FinanceTransactionRequest = {
  fund_id: number
  budget_id?: number | null
  transaction_date: string
  type: FinanceType
  amount: number
  description?: string | null
  receipt_url?: string | null
}

// Respons simpan/hapus transaksi menyertakan Pos Kas dengan saldo terbarunya.
export type FinanceTransactionResponse = {
  transaction: FinanceTransaction | null
  fund: FinanceFund
}

// GET /api/finance/transactions: halaman data beserta jumlah seluruh hasil filter.
export type FinanceTransactionPage = ApiPage<FinanceTransaction> & {
  totals: { income: number; expense: number }
}

// GET /api/finance/reports/summary?from=&to=[&fund_id=]: laporan kas per Pos Kas
// untuk rentang tanggal (inklusif), mis. lampiran Warta Jemaat.
export type FinanceReportEntry = {
  id: number
  transaction_date: string
  description: string | null
  amount: number
}

// Satu mata anggaran beserta transaksinya pada periode itu; budget_id null untuk
// transaksi tanpa mata anggaran (mis. saldo awal).
export type FinanceReportLine = {
  budget_id: number | null
  account_code: string | null
  account_name: string | null
  total: number
  entries: FinanceReportEntry[]
}

export type FinanceReportFund = {
  id: number
  code: string
  name: string
  is_active: boolean
  // Saldo sebelum tanggal awal = Σ kas masuk − Σ kas keluar sebelum `from`.
  opening_balance: number
  income_total: number
  expense_total: number
  // opening_balance + income_total − expense_total
  closing_balance: number
  income: FinanceReportLine[]
  expense: FinanceReportLine[]
}

export type FinanceReportSummary = {
  from: string
  to: string
  funds: FinanceReportFund[]
  totals: {
    opening_balance: number
    income: number
    expense: number
    closing_balance: number
    transaction_count: number
  }
}

// Konten Portal Publik (tabel public_contents).
export const CONTENT_CATEGORIES = [
  'WARTA',
  'DEVOTIONAL',
  'NEWS',
  'MEDIA',
  'PROFILE',
  'PAYMENT_INFO',
] as const
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  WARTA: 'Warta Jemaat',
  DEVOTIONAL: 'Renungan',
  NEWS: 'Berita',
  MEDIA: 'Media',
  PROFILE: 'Profil Jemaat',
  PAYMENT_INFO: 'Info Persembahan',
}

// DRAFT: belum diterbitkan. SCHEDULED: diterbitkan dengan waktu terbit di masa depan,
// tampil di portal mulai waktu itu. PUBLISHED: tampil di portal.
export type ContentStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED'

// Konten di CMS dashboard, termasuk draf. Waktu dalam ISO 8601 UTC.
export type ContentItem = {
  id: number
  category: ContentCategory
  title: string
  slug: string
  summary: string | null
  // Teks biasa; paragraf dipisah baris kosong.
  content_body: string | null
  // PDF/gambar yang diunggah ke folder publik (/api/files/warta|konten|media|liturgi/…)
  // atau tautan https (mis. video dokumentasi).
  attachment_url: string | null
  // Gambar sampul, foto galeri, atau gambar QRIS (/api/files/konten|media/…).
  thumbnail_url: string | null
  published_at: string | null
  is_published: boolean
  status: ContentStatus
  author_id: number | null
  author_name: string | null
  created_at: string
  updated_at: string
}

// Daftar CMS tanpa isi lengkap.
export type ContentListItem = Omit<ContentItem, 'content_body'>

export type ContentRequest = {
  category: ContentCategory
  title: string
  // Kosong: dibuat dari judul. Setelah dibuat, alamat hanya berubah bila dikirim.
  slug?: string | null
  summary?: string | null
  content_body?: string | null
  attachment_url?: string | null
  thumbnail_url?: string | null
  // YYYY-MM-DD (pukul 00.00 WITA) atau ISO 8601 dengan zona waktu. Kosong saat
  // diterbitkan: sekarang.
  published_at?: string | null
  is_published?: boolean
}

export type ContentResponse = { content: ContentItem }

// Konten yang tampil di portal. content_body hanya pada GET /api/public/contents/:slug
// (dan info persembahan di beranda).
export type PublicContent = {
  id: number
  category: ContentCategory
  title: string
  slug: string
  summary: string | null
  content_body?: string | null
  attachment_url: string | null
  thumbnail_url: string | null
  published_at: string
  author_name: string | null
}

export const WORSHIP_CATEGORY_LABELS = {
  SUNDAY_SERVICE: 'Kebaktian Minggu',
  RAYON: 'Ibadah Rayon',
  CATEGORICAL: 'Ibadah Kategorial',
  SPECIAL: 'Ibadah Khusus',
} as const
export type WorshipCategory = keyof typeof WORSHIP_CATEGORY_LABELS

// Jadwal ibadah publik (is_public = 1) untuk Papan Jadwal Ibadah.
export type PublicWorship = {
  id: number
  title: string
  category: WorshipCategory
  rayon_name: string | null
  worship_date: string
  worship_time: string | null
  location: string | null
  theme: string | null
  bible_reading: string | null
  liturgy_file_url: string | null
  // Pelayan Firman, bila sudah ditetapkan.
  preacher: string | null
}

export const WORSHIP_CATEGORIES = Object.keys(WORSHIP_CATEGORY_LABELS) as WorshipCategory[]

export const SERVANT_ROLE_LABELS = {
  PREACHER: 'Pelayan Firman',
  LITURGIST: 'Liturgos',
  ELDER_ON_DUTY: 'Majelis bertugas',
  SINGER: 'Pemandu lagu',
  MUSICIAN: 'Pemusik',
  MULTIMEDIA: 'Multimedia',
} as const
export type ServantRole = keyof typeof SERVANT_ROLE_LABELS
// Urutan ini juga urutan petugas dalam tata ibadah.
export const SERVANT_ROLES = Object.keys(SERVANT_ROLE_LABELS) as ServantRole[]

// GET /api/public/worships: Papan Jadwal Ibadah, dengan seluruh petugas pelayanan.
export type PublicWorshipItem = PublicWorship & {
  rayon_id: number | null
  servants: { role: ServantRole; name: string }[]
}

// Orang yang sama juga bertugas di ibadah lain pada tanggal dan jam yang sama.
export type WorshipServantConflict = {
  worship_id: number
  title: string
  role: ServantRole
}

export type WorshipServant = {
  id: number
  role: ServantRole
  servant_name: string
  // Diisi bila petugas adalah anggota jemaat terdaftar.
  member_id: number | null
  conflicts: WorshipServantConflict[]
}

// Jadwal ibadah di dashboard (GET /api/worships), lengkap dengan petugas dan kehadiran.
export type WorshipItem = {
  id: number
  title: string
  category: WorshipCategory
  rayon_id: number | null
  rayon_name: string | null
  worship_date: string
  // HH:MM WITA; null bila jamnya belum ditetapkan.
  worship_time: string | null
  location: string | null
  theme: string | null
  bible_reading: string | null
  liturgy_file_url: string | null
  // Tampil di Papan Jadwal Ibadah Portal Publik.
  is_public: boolean
  // null selama belum diinput; total dihitung database dari ketiganya.
  attendance_men: number | null
  attendance_women: number | null
  attendance_youth_children: number | null
  attendance_total: number | null
  servants: WorshipServant[]
  // Ada petugas yang juga bertugas di ibadah lain pada tanggal dan jam yang sama.
  has_conflict: boolean
  created_at: string
  updated_at: string
}

export type WorshipResponse = {
  worship: WorshipItem
  // Peringatan bentrok jadwal petugas, satu kalimat per tugas yang bentrok.
  warnings: string[]
}

export const SACRAMENT_TYPE_LABELS = {
  BAPTISM: 'Baptisan Kudus',
  SIDI: 'Peneguhan Sidi',
  MARRIAGE: 'Pemberkatan Nikah',
} as const
export type SacramentType = keyof typeof SACRAMENT_TYPE_LABELS
export const SACRAMENT_TYPES = Object.keys(SACRAMENT_TYPE_LABELS) as SacramentType[]

// Alur verifikasi pastoral (PRD), berurutan.
export const SACRAMENT_STATUS_LABELS = {
  PENDING: 'Menunggu verifikasi',
  REVISION: 'Revisi berkas',
  COUNSELING: 'Konseling/penggembalaan',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
} as const
export type SacramentStatus = keyof typeof SACRAMENT_STATUS_LABELS
export const SACRAMENT_STATUSES = Object.keys(SACRAMENT_STATUS_LABELS) as SacramentStatus[]

// Dokumen syarat yang diunggah pendaftar; berkasnya di folder R2 `sakramen` (khusus
// pengurus).
export type SacramentDocument = {
  kind: string
  label: string
  url: string
  name: string
  size: number
  content_type: string
}

// GET /api/sacraments: antrean pendaftaran dan buku induk di dashboard.
export type SacramentListItem = {
  id: number
  registration_code: string
  type: SacramentType
  // Calon baptis/sidi, atau "mempelai pria & mempelai wanita".
  applicant_name: string
  phone: string | null
  status: SacramentStatus
  counseling_date: string | null
  counseling_time: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  officiating_pastor: string | null
  // Nomor register buku induk, terisi saat Selesai.
  certificate_number: string | null
  // Anggota jemaat terkait; pada pemberkatan nikah member = mempelai pria,
  // partner = mempelai wanita.
  member_id: number | null
  member_name: string | null
  partner_member_id: number | null
  partner_name: string | null
  document_count: number
  created_at: string
  updated_at: string
}

export type SacramentDetail = SacramentListItem & {
  // Isian formulir pendaftaran, sesuai jenis sakramen (src/shared/sacraments.ts).
  form_data: Record<string, string | number | null>
  documents: SacramentDocument[]
  // Catatan verifikasi; ikut tampil di halaman lacak pendaftar.
  notes: string | null
}

export type SacramentPage = ApiPage<SacramentListItem> & {
  // Jumlah per status untuk filter jenis dan pencarian yang sama (tab antrean).
  counts: Record<SacramentStatus, number>
}

// Perubahan pada data anggota jemaat saat pendaftaran Selesai.
export type SacramentMemberUpdate = {
  member_id: number
  full_name: string
  // Mis. "Baptis: Belum → Sudah (1 November 2026)".
  change: string
}

export type SacramentResponse = {
  application: SacramentDetail
  member_updates: SacramentMemberUpdate[]
}

// POST /api/public/sacraments/apply
export type SacramentApplyResponse = {
  registration_code: string
  type: SacramentType
  status: SacramentStatus
  submitted_at: string
}

// GET /api/public/sacraments/track/:code — tanpa data pribadi selain nama tersamar.
export type PublicSacramentStatus = {
  registration_code: string
  type: SacramentType
  // Mis. "Yosua N." atau "Yosua N. & Maria L.".
  applicant_name: string
  status: SacramentStatus
  notes: string | null
  counseling_date: string | null
  counseling_time: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  officiating_pastor: string | null
  // Dokumen yang sudah diterima, tanpa tautan berkas.
  documents: { kind: string; label: string }[]
  submitted_at: string
  updated_at: string
}

export const MAIL_DIRECTION_LABELS = {
  INCOMING: 'Surat masuk',
  OUTGOING: 'Surat keluar',
} as const
export type MailDirection = keyof typeof MAIL_DIRECTION_LABELS
export const MAIL_DIRECTIONS = Object.keys(MAIL_DIRECTION_LABELS) as MailDirection[]

// Kategori Buku Agenda (PRD): atestasi/surat pindah jemaat, surat tugas pelayanan,
// undangan klasis/sinode, dan surat lain (mis. surat keputusan).
export const MAIL_CATEGORY_LABELS = {
  ATESTASI: 'Atestasi',
  TUGAS: 'Surat tugas',
  UNDANGAN: 'Undangan',
  UMUM: 'Umum',
} as const
export type MailCategory = keyof typeof MAIL_CATEGORY_LABELS
export const MAIL_CATEGORIES = Object.keys(MAIL_CATEGORY_LABELS) as MailCategory[]

// GET /api/mails: satu catatan Buku Agenda Surat.
export type MailArchive = {
  id: number
  direction: MailDirection
  // Nomor surat resmi; boleh kosong untuk surat tanpa nomor.
  reference_number: string | null
  mail_date: string
  // Pengirim untuk surat masuk, penerima/tujuan untuk surat keluar.
  sender_or_recipient: string
  subject: string
  category: MailCategory
  // Salinan digital di folder R2 `surat` (khusus pengurus).
  file_url: string | null
  created_at: string
  updated_at: string
}

export type MailPage = ApiPage<MailArchive> & {
  // Jumlah per arah untuk filter kategori, tahun, dan pencarian yang sama (tab).
  counts: Record<MailDirection, number>
}

export type MailResponse = { mail: MailArchive }

// Kondisi fisik aset (PRD): Baik, Rusak Ringan, Rusak Berat, Dalam Perbaikan.
export const ASSET_CONDITION_LABELS = {
  GOOD: 'Baik',
  MINOR_DAMAGE: 'Rusak ringan',
  MAJOR_DAMAGE: 'Rusak berat',
  MAINTENANCE: 'Dalam perbaikan',
} as const
export type AssetCondition = keyof typeof ASSET_CONDITION_LABELS
export const ASSET_CONDITIONS = Object.keys(ASSET_CONDITION_LABELS) as AssetCondition[]

export type Asset = {
  id: number
  asset_code: string
  name: string
  category: string | null
  quantity: number
  // Unit yang sedang tidak dipinjam.
  available_quantity: number
  location: string | null
  acquisition_source: string | null
  acquisition_year: number | null
  // Estimasi nilai seluruh unit, Rupiah.
  estimated_value: number | null
  condition: AssetCondition
  notes: string | null
  // Peminjaman yang belum dikembalikan (termasuk yang terlambat).
  active_loans: number
  created_at: string
  updated_at: string
}

export type AssetPage = ApiPage<Asset> & {
  // Kategori dan lokasi yang sudah dipakai, untuk pilihan filter dan isian form.
  categories: string[]
  locations: string[]
  // Jumlah unit dan unit tersedia seluruh aset yang cocok dengan filter.
  units: number
  available: number
}

export const LOAN_STATUS_LABELS = {
  BORROWED: 'Dipinjam',
  OVERDUE: 'Terlambat',
  RETURNED: 'Sudah dikembalikan',
} as const
export type LoanStatus = keyof typeof LOAN_STATUS_LABELS
export const LOAN_STATUSES = Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]

export type AssetLoan = {
  id: number
  asset_id: number
  asset_code: string
  asset_name: string
  borrower_name: string
  rayon_id: number | null
  rayon_name: string | null
  quantity_borrowed: number
  borrow_date: string
  due_date: string
  return_date: string | null
  return_condition: AssetCondition | null
  // OVERDUE bila belum dikembalikan dan hari ini (WITA) sudah melewati due_date.
  status: LoanStatus
  // Hari keterlambatan untuk status OVERDUE, selain itu 0.
  days_overdue: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type AssetLoanPage = ApiPage<AssetLoan> & {
  // Jumlah per status untuk filter lain yang sama.
  counts: Record<LoanStatus, number>
}

export type AssetResponse = {
  asset: Asset
  // Riwayat peminjaman terbaru aset ini (maks. 20).
  loans: AssetLoan[]
}

export type AssetLoanResponse = { loan: AssetLoan; asset: Asset }

// GET /api/public/home: ringkasan Beranda Portal Publik.
export type PublicHome = {
  // Tanggal hari ini (WITA) yang dipakai untuk jadwal terdekat dan renungan.
  today: string
  upcoming_worships: PublicWorship[]
  latest_warta: PublicContent | null
  // Renungan bertanggal hari ini; bila belum ada, renungan terakhir (is_today false).
  // Dengan content_body: renungan dibaca utuh di beranda.
  devotional: (PublicContent & { is_today: boolean }) | null
  latest_news: PublicContent[]
  // Foto dokumentasi (Galeri) terbaru untuk kartu gambar di hero.
  latest_media: PublicContent | null
  // Rekening dan QRIS, dengan content_body (atas nama, catatan).
  payment_info: PublicContent[]
}

// POST /api/members/import (khusus Admin). Berkas dibaca di browser; setiap baris
// dikirim dengan judul kolom yang sudah dicocokkan (lihat src/shared/member-import.ts).
// dry_run: true hanya memeriksa (pratinjau); false menyimpan baris yang siap.
export type MemberImportRequest = {
  file_name: string
  dry_run: boolean
  // row: nomor baris di berkas, untuk pesan kesalahan.
  rows: { row: number; values: Record<string, string> }[]
}

// new: akan/sudah disimpan; duplicate: dilewati karena sudah terdaftar; error: dilewati
// karena isinya perlu diperbaiki.
export type ImportRowStatus = 'new' | 'duplicate' | 'error'

export type MemberImportRow = {
  row: number
  status: ImportRowStatus
  // Alasan dilewati, atau catatan untuk baris yang tetap disimpan.
  messages: string[]
  full_name: string
  church_member_number: string | null
  nik: string | null
  family_relation: FamilyRelation | null
  family: {
    kk_number: string | null
    head_name: string
    rayon_name: string | null
    // Tulisan rayon di berkas bila berbeda dari nama rayon yang dicocokkan.
    rayon_input: string | null
    is_new: boolean
  } | null
}

export type MemberImportResult = {
  saved: boolean
  summary: {
    rows: number
    new_members: number
    duplicates: number
    errors: number
    new_families: number
    existing_families: number
  }
  rows: MemberImportRow[]
}

export const USER_ROLES = ['ADMIN', 'TREASURER', 'PASTOR', 'ELDER'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  TREASURER: 'Bendahara',
  PASTOR: 'Pendeta',
  ELDER: 'Majelis',
}

// Pengguna yang sedang masuk, sesuai kolom tabel users (tanpa password_hash).
export type SessionUser = {
  id: number
  name: string
  email: string | null
  username: string | null
  role: UserRole
  rayon_id: number | null
}

export type LoginRequest = {
  // Email atau username.
  identifier: string
  password: string
}

// Respons POST /api/auth/login dan GET /api/auth/me. Token sesi dikirim lewat
// cookie HttpOnly, tidak pernah di body, agar tidak bisa dibaca JavaScript.
export type AuthResponse = {
  user: SessionUser
}

// Timestamp dari API selalu ISO 8601 UTC (mis. "2026-10-28T03:15:00Z").
export type UserListItem = SessionUser & {
  rayon_name: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

// POST /api/users (khusus Admin).
export type CreateUserRequest = {
  name: string
  // Minimal salah satu dari email atau username wajib diisi.
  email?: string | null
  username?: string | null
  role: UserRole
  // Wajib untuk Majelis; untuk peran lain selalu dikosongkan.
  rayon_id?: number | null
  // Bila kosong, server membuat kata sandi sementara (lihat UserMutationResponse).
  password?: string
}

// PATCH /api/users/:id (khusus Admin). Hanya field yang dikirim yang diubah.
export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>> & {
  is_active?: boolean
  // Mengatur kata sandi baru secara langsung...
  password?: string
  // ...atau meminta server membuat kata sandi sementara. Keduanya menghentikan sesi
  // aktif pengguna tersebut.
  reset_password?: true
}

export type UserMutationResponse = {
  user: UserListItem
  // Hanya ada bila server membuat kata sandi sementara. Tampilkan sekali ke Admin
  // untuk diserahkan ke pemilik akun; nilainya tidak disimpan dan tidak bisa diambil lagi.
  temporary_password?: string
}

// Satu kolom yang berubah pada aksi UPDATE. Nilai kolom rahasia (kata sandi) diganti
// "[disembunyikan]".
export type AuditFieldChange = { from: unknown; to: unknown }

export type AuditDetails = {
  // Nama entitas saat aksi terjadi, agar log tetap terbaca walau datanya berubah.
  label?: string
  // UPDATE: hanya kolom yang berubah.
  changes?: Record<string, AuditFieldChange>
  // CREATE/DELETE: isi data saat dibuat atau sebelum dihapus.
  data?: Record<string, unknown>
  ip?: string | null
  [key: string]: unknown
}

export type AuditLogItem = {
  id: number
  // CREATE, UPDATE, DELETE, IMPORT, LOGIN, LOGOUT, LOGIN_FAILED, ...
  action: string
  // Nama tabel, mis. users, members, finance_transactions.
  entity_type: string
  entity_id: number | null
  user_id: number | null
  // null untuk aksi sistem, pengunjung portal, atau login dengan akun tak dikenal.
  user_name: string | null
  user_role: UserRole | null
  details: AuditDetails | null
  created_at: string
}
