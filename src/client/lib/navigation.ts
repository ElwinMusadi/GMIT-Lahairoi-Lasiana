import {
  Archive,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  Droplets,
  FilePlus,
  FileText,
  HandCoins,
  History,
  House,
  LayoutGrid,
  MapPin,
  Package,
  PenLine,
  Upload,
  UserCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@shared/types'

export type PortalLink = { title: string; to: string; description?: string }
export type PortalNavGroup = { title: string; links: PortalLink[] }
export type PortalNavItem = PortalLink | PortalNavGroup

// Navigasi Portal Publik: lima menu induk. Halaman yang serumpun dikelompokkan dalam
// submenu yang terbuka saat kursor diarahkan, difokus, atau diketuk. Kesembilan halaman
// tetap terjangkau, ditambah tiga jangkar yang sering dicari.
export const portalNav: PortalNavItem[] = [
  { title: 'Beranda', to: '/' },
  { title: 'Jadwal Ibadah', to: '/jadwal' },
  {
    title: 'Kabar Jemaat',
    links: [
      { title: 'Warta Jemaat', to: '/warta', description: 'Warta mingguan lengkap dalam PDF' },
      { title: 'Renungan', to: '/renungan', description: 'Renungan harian dan pembinaan iman' },
      {
        title: 'Berita & Pengumuman',
        to: '/berita',
        description: 'Kegiatan, dukacita, informasi pelayanan',
      },
      { title: 'Galeri Kegiatan', to: '/media', description: 'Foto dan video dokumentasi' },
    ],
  },
  {
    title: 'Pelayanan',
    links: [
      {
        title: 'Layanan Sakramen',
        to: '/layanan-sakramen',
        description: 'Daftar baptis, sidi, dan nikah tanpa akun',
      },
      {
        title: 'Cek Status Pendaftaran',
        to: '/layanan-sakramen#cek-status',
        description: 'Lacak berkas dengan kode registrasi',
      },
      { title: 'Persembahan', to: '/persembahan', description: 'QRIS dan rekening tiap pos kas' },
    ],
  },
  {
    title: 'Tentang Jemaat',
    links: [
      { title: 'Profil & Sejarah', to: '/profil', description: 'Sejarah, visi dan misi' },
      {
        title: 'Lima Rayon Pelayanan',
        to: '/profil#rayon',
        description: 'Wilayah dan koordinator rayon',
      },
      {
        title: 'Pendeta & Majelis',
        to: '/profil#majelis',
        description: 'Pelayan jemaat periode berjalan',
      },
    ],
  },
]

export const portalNavLinks = portalNav.flatMap((item) => ('links' in item ? item.links : [item]))

// Tautan navigasi untuk halaman yang sedang dibuka: path-nya cocok (`/` hanya persis,
// `/renungan/x` menandai Renungan), dan tautan berjangkar hanya bila jangkarnya juga sama.
export function activePortalLink(pathname: string, hash: string) {
  const matches = portalNavLinks.filter(({ to }) => {
    const path = to.split('#')[0]
    return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
  })
  return (
    matches.find(({ to }) => hash !== '' && to.endsWith(hash)) ??
    matches.find(({ to }) => !to.includes('#'))
  )?.to
}

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
        path: 'worships',
        icon: CalendarDays,
        roles: ['ADMIN', 'PASTOR', 'ELDER'],
        phase: 2,
        description: 'Jadwal kebaktian, petugas pelayanan, tata ibadah, dan kehadiran.',
      },
      {
        title: 'Layanan Sakramen',
        path: 'sacraments',
        icon: Droplets,
        roles: ['ADMIN', 'PASTOR'],
        phase: 2,
        description: 'Pendaftaran baptis, sidi, dan nikah serta buku induk sakramen.',
      },
      {
        title: 'Arsip Surat',
        path: 'mails',
        icon: Archive,
        roles: ['ADMIN'],
        phase: 2,
        description: 'Buku agenda surat masuk dan keluar.',
      },
      {
        title: 'Inventaris',
        path: 'assets',
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

// Aksi "Buat" di topbar dan palet Ctrl+K: hanya aksi yang punya alamat sendiri. Aksi tambah
// yang berupa dialog di dalam halaman ditambahkan saat modulnya dirombak.
export type QuickAction = {
  title: string
  to: string
  icon: LucideIcon
  roles: readonly UserRole[]
}

const quickActions: QuickAction[] = [
  {
    title: 'Jadwal ibadah baru',
    to: '/dashboard/worships/new',
    icon: CalendarPlus,
    roles: ['ADMIN', 'PASTOR'],
  },
  { title: 'Konten portal baru', to: '/dashboard/contents/new', icon: FilePlus, roles: ['ADMIN'] },
  { title: 'Renungan baru', to: '/dashboard/renungan/new', icon: PenLine, roles: ['PASTOR'] },
  { title: 'Impor data jemaat', to: '/dashboard/members/import', icon: Upload, roles: ['ADMIN'] },
]

export function quickActionsForRole(role: UserRole): QuickAction[] {
  return quickActions.filter((action) => action.roles.includes(role))
}
