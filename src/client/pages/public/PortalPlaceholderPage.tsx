import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyNote, PortalSection, SectionHeading } from '@/components/portal/parts'

// Halaman portal yang isinya dibangun di modul Portal Informasi Publik.
export default function PortalPlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <PortalSection tone="low" labelledBy="judul-halaman" className="py-12">
      <SectionHeading
        id="judul-halaman"
        level={1}
        eyebrow="Portal jemaat"
        title={title}
        lead={description}
      />
      <EmptyNote>
        Halaman ini sedang disiapkan dan akan segera diisi oleh pengurus jemaat.
      </EmptyNote>
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-portal-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke beranda
      </Link>
    </PortalSection>
  )
}
