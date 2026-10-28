import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { PortalSection, SectionHeading } from '@/components/portal/parts'

export default function NotFoundPage() {
  return (
    <PortalSection tone="low" labelledBy="judul-404" className="py-16">
      <SectionHeading
        id="judul-404"
        level={1}
        eyebrow="Halaman tidak ditemukan"
        title="Alamat ini tidak ada"
        lead="Alamat yang Anda buka tidak ada atau sudah dipindahkan. Mulai lagi dari beranda."
      />
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-portal-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-indigo"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Ke beranda
      </Link>
    </PortalSection>
  )
}
