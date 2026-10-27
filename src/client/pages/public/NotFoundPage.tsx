import { Link } from 'react-router'
import { portalButton } from '@/components/portal/site-header'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <section
      aria-labelledby="judul-404"
      className="grid gap-8 px-4 pt-[8svh] pb-32 sm:px-6 lg:px-8 lg:pb-48"
    >
      <h1 id="judul-404" className="text-step-head leading-[1.05] font-medium tracking-[-0.025em]">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-[44ch] text-step-lead leading-snug">
        Alamat yang Anda buka tidak ada atau sudah dipindahkan. Mulai lagi dari beranda.
      </p>
      <div>
        <Button asChild className={portalButton}>
          <Link to="/">Ke beranda</Link>
        </Button>
      </div>
    </section>
  )
}
