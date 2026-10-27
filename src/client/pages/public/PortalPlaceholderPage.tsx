import { Link } from 'react-router'
import { WellMark } from '@/components/brand/well'

// Halaman portal yang isinya dibangun di modul Portal Informasi Publik.
export default function PortalPlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section
      aria-labelledby="judul-halaman"
      className="grid gap-10 px-4 pt-[6svh] pb-24 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-40"
    >
      <h1
        id="judul-halaman"
        className="text-step-head leading-[1.05] font-medium tracking-[-0.025em] lg:col-span-6"
      >
        {title}
      </h1>
      <div className="grid content-start gap-6 lg:col-span-5 lg:col-start-8">
        <p className="text-step-lead leading-snug">{description}</p>
        <p className="flex items-start gap-3 text-step-body text-muted-foreground">
          <WellMark className="mt-1.5 size-3 shrink-0 text-brand" />
          Halaman ini sedang disiapkan dan akan segera diisi oleh pengurus jemaat.
        </p>
        <Link to="/" className="text-step-body underline underline-offset-8">
          Kembali ke beranda
        </Link>
      </div>
    </section>
  )
}
