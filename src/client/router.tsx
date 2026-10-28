import type { ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import PublicLayout from '@/layouts/PublicLayout'
import RootLayout from '@/layouts/RootLayout'
import type { UserRole } from '@shared/types'
import { allModules, type ModuleItem } from '@/lib/navigation'
import HomePage from '@/pages/public/HomePage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import PortalPlaceholderPage from '@/pages/public/PortalPlaceholderPage'
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
}

const loadContentEditor = () => import('@/pages/dashboard/ContentEditorPage')
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

const portalPages = [
  {
    path: 'jadwal',
    title: 'Jadwal Ibadah',
    description:
      'Kebaktian Minggu, ibadah rumah tangga di lima rayon, ibadah kategorial, dan acara gerejawi mendatang.',
  },
  {
    path: 'warta',
    title: 'Warta Jemaat',
    description: 'Pengumuman mingguan dan berkas PDF Warta Jemaat yang dapat diunduh.',
  },
  {
    path: 'renungan',
    title: 'Renungan',
    description: 'Renungan harian dan artikel pembinaan iman dari Pendeta dan Majelis.',
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
          {
            path: 'profil',
            handle: { title: 'Profil & Sejarah' } satisfies RouteHandle,
            lazy: async () => ({
              Component: (await import('@/pages/public/ProfilePage')).default,
            }),
          },
          {
            path: 'persembahan',
            handle: { title: 'Persembahan' } satisfies RouteHandle,
            lazy: async () => ({
              Component: (await import('@/pages/public/OfferingPage')).default,
            }),
          },
          // Alamat lama halaman profil.
          { path: 'tentang', element: <Navigate to="/profil" replace /> },
          ...portalPages.map((page) => ({
            path: page.path,
            handle: { title: page.title } satisfies RouteHandle,
            element: <PortalPlaceholderPage title={page.title} description={page.description} />,
          })),
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
