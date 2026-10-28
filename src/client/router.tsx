import type { ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import PublicLayout from '@/layouts/PublicLayout'
import RootLayout from '@/layouts/RootLayout'
import type { UserRole } from '@shared/types'
import { allModules, type ModuleItem } from '@/lib/navigation'
import HomePage from '@/pages/public/HomePage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import RouteErrorPage from '@/pages/RouteErrorPage'

// `handle.title` dipakai untuk judul tab browser dan breadcrumb dashboard.
export type RouteHandle = { title: string }

type PageLoader = () => Promise<{ default: ComponentType }>

// Modul dashboard yang sudah dibangun. Modul lain memakai kerangka ModulePage.
const modulePages: Record<string, PageLoader> = {
  members: () => import('@/pages/dashboard/MembersPage'),
  families: () => import('@/pages/dashboard/FamiliesPage'),
  rayons: () => import('@/pages/dashboard/RayonsPage'),
  users: () => import('@/pages/dashboard/UsersPage'),
  'audit-logs': () => import('@/pages/dashboard/AuditLogsPage'),
  'finance/transactions': () => import('@/pages/dashboard/FinanceTransactionsPage'),
  'finance/budgets': () => import('@/pages/dashboard/FinanceBudgetsPage'),
  'finance/reports': () => import('@/pages/dashboard/FinanceReportsPage'),
  // Pendeta menulis renungannya di halaman CMS yang sama, dibatasi ke Renungan.
  contents: () => import('@/pages/dashboard/ContentsPage'),
  renungan: () => import('@/pages/dashboard/ContentsPage'),
  worships: () => import('@/pages/dashboard/WorshipsPage'),
  sacraments: () => import('@/pages/dashboard/SacramentsPage'),
  mails: () => import('@/pages/dashboard/MailsPage'),
  assets: () => import('@/pages/dashboard/AssetsPage'),
}

const loadContentEditor = () => import('@/pages/dashboard/ContentEditorPage')
const loadWorshipEditor = () => import('@/pages/dashboard/WorshipEditorPage')
const contentEditorPages = [
  { path: 'new', title: 'Konten baru', load: loadContentEditor },
  { path: ':id', title: 'Ubah konten', load: loadContentEditor },
]

// Halaman turunan sebuah modul. Hak aksesnya sama dengan modulnya, kecuali `roles` diisi.
const subPages: Record<
  string,
  { path: string; title: string; load: PageLoader; roles?: readonly UserRole[] }[]
> = {
  families: [
    { path: ':id', title: 'Rincian KK', load: () => import('@/pages/dashboard/FamilyDetailPage') },
  ],
  contents: contentEditorPages,
  renungan: contentEditorPages,
  sacraments: [
    {
      path: ':id',
      title: 'Rincian pendaftaran',
      load: () => import('@/pages/dashboard/SacramentDetailPage'),
    },
    {
      path: ':id/cetak',
      title: 'Cetak sertifikat',
      load: () => import('@/pages/dashboard/SacramentCertificatePage'),
    },
  ],
  // Majelis melihat jadwal dan mencatat kehadiran; menyusun jadwal khusus Admin dan Pendeta.
  worships: [
    { path: 'new', title: 'Jadwal baru', load: loadWorshipEditor, roles: ['ADMIN', 'PASTOR'] },
    { path: ':id', title: 'Ubah jadwal', load: loadWorshipEditor, roles: ['ADMIN', 'PASTOR'] },
  ],
  members: [
    {
      path: 'import',
      title: 'Impor data',
      load: () => import('@/pages/dashboard/MemberImportPage'),
      roles: ['ADMIN'],
    },
  ],
}

// Rute lazy yang memuat halaman beserta penjaga perannya (<RequireRole>).
function guardedPage(module: ModuleItem, load?: PageLoader) {
  return async () => {
    const [{ RequireRole }, page] = await Promise.all([
      import('@/components/session-provider'),
      load?.() ??
        import('@/pages/dashboard/ModulePage').then(({ ModulePage }) => ({
          default: () => <ModulePage module={module} />,
        })),
    ])
    return {
      element: (
        <RequireRole roles={module.roles} title={module.title}>
          <page.default />
        </RequireRole>
      ),
    }
  }
}

// Halaman Portal Publik yang dimuat terpisah dari Beranda.
type PortalPage = { path: string; title: string; load: () => Promise<{ default: ComponentType }> }

const portalPages: PortalPage[] = [
  { path: 'jadwal', title: 'Jadwal Ibadah', load: () => import('@/pages/public/SchedulePage') },
  { path: 'warta', title: 'Warta Jemaat', load: () => import('@/pages/public/WartaPage') },
  {
    path: 'renungan',
    title: 'Renungan',
    load: async () => ({
      default: (await import('@/pages/public/ArticlesPage')).DevotionalListPage,
    }),
  },
  {
    path: 'renungan/:slug',
    title: 'Renungan',
    load: async () => ({ default: (await import('@/pages/public/ArticlesPage')).DevotionalPage }),
  },
  {
    path: 'berita',
    title: 'Berita & Pengumuman',
    load: async () => ({ default: (await import('@/pages/public/ArticlesPage')).NewsListPage }),
  },
  {
    path: 'berita/:slug',
    title: 'Berita',
    load: async () => ({ default: (await import('@/pages/public/ArticlesPage')).NewsPage }),
  },
  { path: 'media', title: 'Galeri Kegiatan', load: () => import('@/pages/public/MediaPage') },
  { path: 'profil', title: 'Profil & Sejarah', load: () => import('@/pages/public/ProfilePage') },
  { path: 'persembahan', title: 'Persembahan', load: () => import('@/pages/public/OfferingPage') },
  {
    path: 'layanan-sakramen',
    title: 'Layanan Sakramen',
    load: () => import('@/pages/public/SacramentPage'),
  },
]

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    errorElement: <RouteErrorPage />,
    HydrateFallback: () => null,
    children: [
      {
        Component: PublicLayout,
        children: [
          { index: true, Component: HomePage },
          ...portalPages.map((page) => ({
            path: page.path,
            handle: { title: page.title } satisfies RouteHandle,
            lazy: async () => ({ Component: (await page.load()).default }),
          })),
          // Alamat lama halaman profil.
          { path: 'tentang', element: <Navigate to="/profil" replace /> },
          { path: '*', handle: { title: 'Halaman tidak ditemukan' }, Component: NotFoundPage },
        ],
      },
      {
        path: 'login',
        handle: { title: 'Masuk pengurus' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/pages/LoginPage')).default }),
      },
      {
        // Seluruh dashboard dimuat terpisah agar pengunjung portal tidak mengunduhnya.
        path: 'dashboard',
        handle: { title: 'Dashboard' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/layouts/DashboardLayout')).default }),
        children: [
          {
            index: true,
            handle: { title: 'Ringkasan' } satisfies RouteHandle,
            lazy: async () => ({
              Component: (await import('@/pages/dashboard/OverviewPage')).default,
            }),
          },
          ...allModules
            .filter((module) => module.path !== '')
            .map((module) => ({
              path: module.path,
              handle: { title: module.title } satisfies RouteHandle,
              children: [
                { index: true, lazy: guardedPage(module, modulePages[module.path]) },
                ...(subPages[module.path] ?? []).map((sub) => ({
                  path: sub.path,
                  handle: { title: sub.title } satisfies RouteHandle,
                  lazy: guardedPage(
                    { ...module, title: sub.title, roles: sub.roles ?? module.roles },
                    sub.load,
                  ),
                })),
              ],
            })),
          {
            path: '*',
            handle: { title: 'Halaman tidak ditemukan' } satisfies RouteHandle,
            lazy: async () => ({
              Component: (await import('@/pages/dashboard/ModulePage')).DashboardNotFound,
            }),
          },
        ],
      },
    ],
  },
])
