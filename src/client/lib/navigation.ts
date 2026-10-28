import {
  Archive,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Droplets,
  FileText,
  HandCoins,
  History,
  House,
  LayoutGrid,
  MapPin,
  Package,
  UserCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@shared/types'

// Tautan Portal Publik, berurutan seperti di navbar.
export const portalLinks = [
  { title: 'Beranda', to: '/' },
  { title: 'Jadwal Ibadah', to: '/jadwal' },
  { title: 'Warta Jemaat', to: '/warta' },
  { title: 'Renungan', to: '/renungan' },
  { title: 'Profil & Sejarah', to: '/profil' },
  { title: 'Persembahan', to: '/persembahan' },
] as const

export type ModuleItem = {
  title: string
  path: string // relatif terhadap /dashboard
  icon: LucideIcon
  roles: readonly UserRole[]
  phase: 1 | 2 | 3
  description: string
}

export type ModuleGroup = {
  label: string
  items: ModuleItem[]
}

const ALL_ROLES: readonly UserRole[] = ['ADMIN', 'TREASURER', 'PASTOR', 'ELDER']

// Menu dashboard per peran, mengikuti hak akses di PRD. Ini hanya menentukan apa
// yang terlihat; pembatasan sebenarnya ditegakkan API.
export const moduleGroups: ModuleGroup[] = [
  {
    label: 'Umum',
    items: [
      {
        title: 'Ringkasan',
        path: '',
        icon: LayoutGrid,
        roles: ALL_ROLES,
        phase: 1,
        description: 'Gambaran jemaat, keuangan, dan pelayanan.',
      },
    ],
  },
  {
    label: 'Jemaat',
    items: [
      {
        title: 'Anggota Jemaat',
        path: 'members',
        icon: Users,
        roles: ['ADMIN', 'PASTOR', 'ELDER'],
        phase: 1,
        description: 'Profil anggota, status baptis dan sidi, serta kategori pelayanan.',
      },
      {
        title: 'Kartu Keluarga',
        path: 'families',
        icon: House,
        roles: ['ADMIN', 'PASTOR', 'ELDER'],
        phase: 1,
        description: 'Kartu Keluarga gereja, penempatan rayon, dan anggota tiap keluarga.',
      },
      {
        title: 'Rayon',
        path: 'rayons',
        icon: MapPin,
        roles: ['ADMIN'],
        phase: 1,
        description: 'Lima rayon pelayanan beserta koordinatornya.',
      },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      {
        title: 'Transaksi Kas',
        path: 'finance/transactions',
        icon: HandCoins,
        roles: ['TREASURER', 'ADMIN', 'PASTOR', 'ELDER'],
        phase: 1,
        description: 'Kas masuk dan kas keluar per Pos Kas, lengkap dengan bukti kuitansi.',
      },
      {
        title: 'Pos Kas & RAPBJ',
        path: 'finance/budgets',
        icon: WalletCards,
        roles: ['TREASURER', 'ADMIN', 'PASTOR', 'ELDER'],
        phase: 1,
        description: 'Pos Kas, mata anggaran RAPBJ, target tahunan, dan realisasinya.',
      },
      {
        title: 'Laporan Keuangan',
        path: 'finance/reports',
        icon: ChartColumn,
        roles: ['TREASURER', 'ADMIN', 'PASTOR', 'ELDER'],
        phase: 1,
        description:
          'Saldo dan rincian kas per Pos Kas, mingguan sampai tahunan, siap cetak Warta.',
      },
    ],
  },
  {
    label: 'Pelayanan',
    items: [
      {
        title: 'Jadwal Ibadah',
        path: 'ibadah',
        icon: CalendarDays,
        roles: ['ADMIN', 'PASTOR', 'ELDER'],
        phase: 2,
        description: 'Jadwal kebaktian, petugas pelayanan, tata ibadah, dan kehadiran.',
      },
      {
        title: 'Layanan Sakramen',
        path: 'sakramen',
        icon: Droplets,
        roles: ['ADMIN', 'PASTOR'],
        phase: 2,
        description: 'Pendaftaran baptis, sidi, dan nikah serta buku induk sakramen.',
      },
      {
        title: 'Arsip Surat',
        path: 'surat',
        icon: Archive,
        roles: ['ADMIN'],
        phase: 2,
        description: 'Buku agenda surat masuk dan keluar.',
      },
      {
        title: 'Inventaris',
        path: 'inventaris',
        icon: Package,
        roles: ['ADMIN', 'ELDER'],
        phase: 3,
        description: 'Aset gereja, kondisi barang, dan peminjaman.',
      },
    ],
  },
  {
    label: 'Portal Publik',
    items: [
      {
        title: 'Warta & Konten',
        path: 'contents',
        icon: FileText,
        roles: ['ADMIN'],
        phase: 1,
        description: 'Warta Jemaat, renungan, berita, galeri, profil, serta rekening dan QRIS.',
      },
      {
        title: 'Renungan Saya',
        path: 'renungan',
        icon: BookOpen,
        roles: ['PASTOR'],
        phase: 1,
        description: 'Renungan harian dan artikel pembinaan iman yang Anda tulis.',
      },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      {
        title: 'Akun Pengurus',
        path: 'users',
        icon: UserCog,
        roles: ['ADMIN'],
        phase: 1,
        description: 'Akun Admin, Bendahara, Pendeta, dan Majelis serta hak aksesnya.',
      },
      {
        title: 'Log Aktivitas',
        path: 'audit-logs',
        icon: History,
        roles: ['ADMIN'],
        phase: 1,
        description: 'Riwayat perubahan data penting: siapa mengubah apa, dan kapan.',
      },
    ],
  },
]

export const allModules = moduleGroups.flatMap((group) => group.items)

export function modulesForRole(role: UserRole): ModuleGroup[] {
  return moduleGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0)
}

export function dashboardPath(item: Pick<ModuleItem, 'path'>): string {
  return item.path ? `/dashboard/${item.path}` : '/dashboard'
}
