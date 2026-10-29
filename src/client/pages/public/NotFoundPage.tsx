import { Home } from 'lucide-react'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PillLink } from '@/components/portal/kage/pill'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'

export default function NotFoundPage() {
  return (
    <HeroPanel
      labelledBy="judul-404"
      display={
        <div className="grid max-w-[760px] gap-5">
          <TwoToneHeading
            as="h1"
            id="judul-404"
            size="page"
            onDark
            lead="Alamat ini"
            accent="tidak ada."
          />
          <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
            Alamat yang Anda buka tidak ada atau sudah dipindahkan. Mulai lagi dari beranda.
          </p>
        </div>
      }
    >
      <div className="mt-auto flex flex-wrap gap-2 pt-10">
        <PillLink to="/" tone="light">
          <Home aria-hidden="true" />
          Ke beranda
        </PillLink>
      </div>
    </HeroPanel>
  )
}
