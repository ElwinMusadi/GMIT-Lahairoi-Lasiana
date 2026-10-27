import { createBrowserRouter } from 'react-router'
import PublicLayout from '@/layouts/PublicLayout'
import RootLayout from '@/layouts/RootLayout'
import { allModules } from '@/lib/navigation'
import HomePage from '@/pages/public/HomePage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import PortalPlaceholderPage from '@/pages/public/PortalPlaceholderPage'
import RouteErrorPage from '@/pages/RouteErrorPage'

// `handle.title` dipakai untuk judul tab browser dan breadcrumb dashboard.
export type RouteHandle = { title: string }

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
  {
    path: 'persembahan',
    title: 'Persembahan',
    description: 'Rekening resmi gereja dan kode QRIS untuk persembahan syukur dan persepuluhan.',
  },
  {
    path: 'tentang',
    title: 'Tentang Jemaat',
    description:
      'Sejarah Jemaat Lahairoi, visi dan misi, lima rayon pelayanan, serta Pendeta dan Majelis Jemaat.',
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
              lazy: async () => {
                const { ModulePage } = await import('@/pages/dashboard/ModulePage')
                return { element: <ModulePage module={module} /> }
              },
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
