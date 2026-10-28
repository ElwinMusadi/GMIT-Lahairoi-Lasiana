import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Judul dua nada rancangan kage: baris pertama sans tebal, baris kedua serif miring yang
// lebih redup, mis. "Jadwal ibadah / minggu ini.". Tetap satu elemen heading, dan kedua
// baris dipisah spasi agar dibaca utuh oleh pembaca layar.

const SIZES = {
  // Hero Beranda: 84px di desktop.
  // Ponsel: ukuran cair agar baris pertama muat sampai lebar 360 px.
  hero: 'text-[clamp(2.25rem,10.5vw,3rem)] sm:text-6xl md:text-7xl lg:text-[84px]',
  // Judul halaman di hero ringkas.
  page: 'text-[40px] sm:text-5xl md:text-6xl',
  // Judul seksi.
  section: 'text-[clamp(1.875rem,9vw,2.25rem)] sm:text-5xl md:text-[60px]',
  // Judul di dalam kartu atau panel.
  card: 'text-[28px] md:text-[40px]',
} as const

type Props = {
  // 'p' untuk kalimat besar yang bukan judul, mis. makna nama Lahai-roi di hero Beranda.
  as?: 'h1' | 'h2' | 'h3' | 'p'
  // Baris pertama (sans) dan baris kedua (serif miring).
  lead: ReactNode
  accent?: ReactNode
  size?: keyof typeof SIZES
  // Di atas foto atau panel gelap: kedua baris putih.
  onDark?: boolean
  // Baris kedua menyambung di baris yang sama pada layar lebar.
  inline?: boolean
  id?: string
  className?: string
}

export function TwoToneHeading({
  as: Tag = 'h2',
  lead,
  accent,
  size = 'section',
  onDark = false,
  inline = false,
  id,
  className,
}: Props) {
  return (
    <Tag
      id={id}
      className={cn('leading-none tracking-[-0.03em] text-balance', SIZES[size], className)}
    >
      <span
        className={cn(
          'font-site-display font-extrabold',
          inline ? 'md:inline' : 'block',
          onDark ? 'text-white' : 'text-site-ink',
        )}
      >
        {lead}
      </span>
      {accent && (
        <>
          {' '}
          <span
            className={cn(
              'font-site-serif font-normal italic',
              inline ? 'mt-1 block md:mt-0 md:ml-2 md:inline' : 'mt-1 block md:mt-2',
              onDark ? 'text-white/75' : 'text-site-muted',
            )}
          >
            {accent}
          </span>
        </>
      )}
    </Tag>
  )
}
