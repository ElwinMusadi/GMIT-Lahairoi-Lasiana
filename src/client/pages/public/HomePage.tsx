import { Link } from 'react-router'
import { WellMark } from '@/components/brand/well'
import { portalButton } from '@/components/portal/site-header'
import { Button } from '@/components/ui/button'

// Layar pertama Portal Publik. Bagian jadwal, warta, renungan, dan rayon di bawahnya
// dibangun bersama modul Portal Informasi Publik dengan data dari API.
export default function HomePage() {
  return (
    <section
      aria-labelledby="judul-beranda"
      className="relative isolate flex min-h-[calc(100svh-5.25rem)] flex-col overflow-hidden px-4 pt-[8svh] pb-[56vw] sm:px-6 lg:px-8 lg:pb-24"
    >
      {/* Di bawah lg cincin muncul dari kanan bawah; puncaknya 50vw di atas tepi bawah,
          sehingga padding bawah 56vw menjaga teks tidak pernah tertimpa. */}
      <WellMark className="ring-in pointer-events-none absolute -right-[30vw] -bottom-[50vw] -z-10 size-[100vw] text-brand lg:top-1/2 lg:-right-[52svh] lg:bottom-auto lg:size-[120svh] lg:-translate-y-1/2" />

      <div className="max-w-[min(100%,46rem)] lg:max-w-[52vw]">
        <h1
          id="judul-beranda"
          className="rise-in text-step-display leading-[0.95] font-medium tracking-[-0.035em] [--rise-delay:120ms]"
        >
          Jemaat
          <br />
          Lahairoi
        </h1>
        <p className="rise-in mt-8 max-w-[36ch] text-step-lead leading-snug [--rise-delay:200ms]">
          Gereja Masehi Injili di Timor, Jemaat Lahairoi Tuak Sabu di Lasiana, Kota Kupang.
          Jadwal ibadah, warta jemaat, renungan, dan persembahan dalam satu tempat.
        </p>
        <div className="rise-in mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 [--rise-delay:280ms]">
          <Button asChild className={portalButton}>
            <Link to="/jadwal">Lihat jadwal ibadah</Link>
          </Button>
          <Link to="/warta" className="py-2 text-step-body underline underline-offset-8">
            Baca warta minggu ini
          </Link>
        </div>
      </div>

      <p className="rise-in mt-auto flex max-w-[46ch] items-start gap-3 pt-16 text-step-body [--rise-delay:360ms]">
        <WellMark className="mt-1.5 size-3.5 shrink-0 text-brand" />
        Lahai-roi berarti sumur Dia yang hidup, yang melihat aku (Kejadian 16:13–14). Cincin
        merah di halaman ini adalah sumur itu, dilihat dari atas.
      </p>
    </section>
  )
}
