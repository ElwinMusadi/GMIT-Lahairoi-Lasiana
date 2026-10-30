import { ChevronRight, FileText, MapPin } from 'lucide-react'
import { WORSHIP_CATEGORY_LABELS, type PublicWorshipItem } from '@shared/types'
import { Highlight } from '@/components/portal/schedule/highlight'
import { KIND_BORDER, KIND_DOT, clock, kindLabel } from '@/components/portal/schedule/kinds'
import { hiddenMatches, matchesTerms } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Jadwal dalam bentuk ringkas untuk kalender Jadwal Ibadah. Seluruh kartu atau baris adalah
// tombol yang membuka rincian lengkapnya (semua petugas, tema, bacaan, tata ibadah).

type Props = {
  worship: PublicWorshipItem
  onOpen: (worship: PublicWorshipItem) => void
  // Hari yang sudah lewat: judul berwarna sekunder dan kartu tanpa latar. Bukan opacity, agar
  // teksnya tetap ≥4,5:1.
  past?: boolean
}

function preacherOf(worship: PublicWorshipItem) {
  return worship.servants.find((servant) => servant.role === 'PREACHER')?.name ?? null
}

// Kartu di sel tabel Pekan: garis warna jenis, judul, jenis, tempat, dan Pelayan Firman. Jamnya
// ada di judul baris tabel. Ibadah rayon berjudul sama ("Ibadah Rumah Tangga"), jadi nama
// rayonnya yang menjadi baris utama. Di tablet hanya dua baris pertama, dan keduanya boleh
// membungkus agar tidak terpotong.
export function WeekCard({ worship, onOpen, past = false }: Props) {
  const preacher = preacherOf(worship)
  const rayon = worship.category === 'RAYON' && worship.rayon_name
  const primary = rayon ? `Rayon ${worship.rayon_name}` : worship.title
  const secondary = rayon ? worship.title : WORSHIP_CATEGORY_LABELS[worship.category]
  return (
    <button
      type="button"
      onClick={() => onOpen(worship)}
      className={cn(
        'grid w-full gap-0.5 rounded-lg border-l-[3px] py-1.5 pr-1 pl-1.5 text-left transition-colors outline-none hover:bg-site-ink/[0.07] focus-visible:ring-3 focus-visible:ring-ring lg:pr-2 lg:pl-2.5',
        KIND_BORDER[worship.category],
        past ? 'bg-transparent' : 'bg-site-paper glass:bg-white/45 dark:glass:bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'line-clamp-3 text-(length:--site-text-xs) leading-snug font-semibold break-words lg:line-clamp-2 lg:text-sm',
          past ? 'text-site-muted' : 'text-site-ink',
        )}
      >
        {primary}
        {past && <span className="sr-only"> (sudah lewat)</span>}
      </span>
      <span className="line-clamp-2 text-(length:--site-text-xs) leading-snug text-site-muted lg:truncate">
        {secondary}
      </span>
      {worship.location && (
        <span className="truncate text-(length:--site-text-xs) text-site-muted max-lg:hidden">
          {worship.location}
        </span>
      )}
      {preacher && (
        <span className="truncate text-(length:--site-text-xs) font-medium text-site-ink max-lg:hidden">
          {preacher}
        </span>
      )}
    </button>
  )
}

// Baris Agenda: jam | judul, jenis/rayon, tempat, Pelayan Firman dan Liturgos | tata ibadah.
// Di hasil pencarian (`terms`), kata yang cocok ditandai, dan kolom lain yang cocok (petugas
// lain, tema, bacaan) ditampilkan agar jelas mengapa jadwal itu muncul.
export function AgendaRow({
  worship,
  onOpen,
  past = false,
  terms,
}: Props & { terms?: readonly string[] }) {
  const preacher = preacherOf(worship)
  const liturgist = worship.servants.find((servant) => servant.role === 'LITURGIST')?.name
  const time = clock(worship.worship_time)
  const extras = terms?.length ? hiddenMatches(worship, terms) : []
  // Liturgos disembunyikan di ponsel, kecuali dialah yang dicari.
  const liturgistMatches = Boolean(terms?.length && liturgist && matchesTerms(liturgist, terms))
  return (
    <button
      type="button"
      onClick={() => onOpen(worship)}
      className={cn(
        'grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl px-2 py-3 text-left transition-colors outline-none hover:bg-site-ink/[0.05] focus-visible:ring-3 focus-visible:ring-ring sm:grid-cols-[4rem_minmax(0,1fr)_auto]',
      )}
    >
      <span className="pt-0.5 font-site-mono text-sm font-medium text-site-ink tabular-nums">
        {time ?? <span className="text-site-muted">–</span>}
        {!time && <span className="sr-only">Jam menyusul</span>}
      </span>
      <span className="grid min-w-0 gap-1">
        <span
          className={cn(
            'font-site-display text-base leading-snug font-bold',
            past ? 'text-site-muted' : 'text-site-ink',
          )}
        >
          <Highlight text={worship.title} terms={terms} />
          {past && <span className="sr-only"> (sudah lewat)</span>}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--site-text-xs) text-site-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-site-ink/85">
            <span
              aria-hidden="true"
              className={cn('size-2 flex-none rounded-full', KIND_DOT[worship.category])}
            />
            <Highlight text={kindLabel(worship)} terms={terms} />
          </span>
          {worship.location && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 flex-none" aria-hidden="true" />
              <span className="min-w-0">
                <Highlight text={worship.location} terms={terms} />
              </span>
            </span>
          )}
        </span>
        {(preacher || liturgist) && (
          <span className="text-sm text-site-ink/85">
            {preacher && (
              <>
                <span className="text-site-muted">Pelayan Firman </span>
                <span className="font-semibold text-site-ink">
                  <Highlight text={preacher} terms={terms} />
                </span>
              </>
            )}
            {liturgist && (
              <span className={cn(!liturgistMatches && 'max-sm:hidden')}>
                {preacher && <span aria-hidden="true"> · </span>}
                <span className="text-site-muted">Liturgos </span>
                <Highlight text={liturgist} terms={terms} />
              </span>
            )}
          </span>
        )}
        {extras.length > 0 && (
          <span className="grid gap-0.5 text-sm text-site-ink/85">
            {extras.map((extra, index) => (
              <span key={index}>
                <span className="text-site-muted">{extra.label} </span>
                <Highlight text={extra.value} terms={terms} />
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5 pt-0.5 text-site-muted">
        {worship.liturgy_file_url && (
          <FileText className="size-4" aria-label="Ada tata ibadah" role="img" />
        )}
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  )
}
