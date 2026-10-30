import { CalendarClock, Download, Link2, MapPin, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  SERVANT_ROLES,
  SERVANT_ROLE_LABELS,
  type PublicWorshipItem,
  type ServantRole,
} from '@shared/types'
import { KIND_DOT, clock, kindLabel } from '@/components/portal/schedule/kinds'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { copyText, dayLabel } from '@/lib/portal'
import { cn } from '@/lib/utils'

// Rincian satu jadwal di kalender Jadwal Ibadah: panel kanan mulai 768 px, lembar bawah di
// ponsel. Isinya semua yang diketahui tentang jadwal itu: jenis dan rayon, waktu, tempat,
// tema dan bacaan, seluruh petugas urut tata ibadah, dan tata ibadah PDF; ditambah salin
// tautan dan bagikan. Dibuka dan ditutup lewat ?jadwal= di URL.

type Props = {
  // null saat jadwalnya masih dimuat atau tidak ditemukan.
  worship: PublicWorshipItem | null
  open: boolean
  // Gagal dimuat: jadwal tidak ada atau tidak publik (404), atau koneksi bermasalah.
  error: string | null
  today: string
  bottom: boolean
  onClose: () => void
  // Elemen yang membuka rincian; fokus kembali ke sana saat ditutup.
  returnFocus?: () => HTMLElement | null
}

const action =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-site-rule px-4 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring'

// Tautan langsung ke jadwal ini, dengan tanggalnya agar kalender di belakang panel ikut
// menampilkan pekan itu.
function worshipUrl(worship: PublicWorshipItem) {
  const params = new URLSearchParams({ tanggal: worship.worship_date, jadwal: String(worship.id) })
  return `${window.location.origin}/jadwal?${params}`
}

async function copyLink(worship: PublicWorshipItem) {
  if (await copyText(worshipUrl(worship))) toast.success('Tautan jadwal disalin.')
  else toast.error('Tautan tidak dapat disalin. Salin secara manual dari bilah alamat.')
}

async function share(worship: PublicWorshipItem, when: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: worship.title, text: when, url: worshipUrl(worship) })
      return
    } catch (err) {
      // Dibatalkan pengguna: selesai. Gagal karena hal lain: jatuh ke salin tautan.
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  await copyLink(worship)
}

// Petugas dikelompokkan per peran, urut seperti tata ibadah.
function servantGroups(worship: PublicWorshipItem) {
  const groups = new Map<ServantRole, string[]>()
  for (const servant of worship.servants) {
    groups.set(servant.role, [...(groups.get(servant.role) ?? []), servant.name])
  }
  return SERVANT_ROLES.filter((role) => groups.has(role)).map((role) => ({
    role,
    names: groups.get(role) ?? [],
  }))
}

export function WorshipDetail({
  worship,
  open,
  error,
  today,
  bottom,
  onClose,
  returnFocus,
}: Props) {
  const time = worship ? clock(worship.worship_time) : null
  const when = worship
    ? `${dayLabel(worship.worship_date, today)} · ${time ? `${time} WITA` : 'Jam menyusul'}`
    : ''
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={bottom ? 'bottom' : 'right'}
        data-lenis-prevent
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.()
          if (target?.isConnected) {
            event.preventDefault()
            target.focus()
          }
        }}
        className={cn(
          'gap-0 overflow-y-auto overscroll-contain border-site-rule bg-site-canvas p-0 font-site-body text-site-ink glass:glass-bar',
          bottom
            ? 'max-h-[calc(88svh/var(--site-zoom,1))] rounded-t-3xl'
            : 'w-full data-[side=right]:sm:max-w-[24rem]',
        )}
      >
        {worship ? (
          <>
            <div className="grid gap-3 px-5 pt-6 pr-14 pb-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-site-ink/[0.06] px-3 py-1 text-(length:--site-text-xs) font-semibold text-site-ink">
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', KIND_DOT[worship.category])}
                />
                {kindLabel(worship)}
              </span>
              <SheetTitle className="font-site-display text-2xl leading-tight font-bold text-site-ink">
                {worship.title}
              </SheetTitle>
              <SheetDescription className="flex items-start gap-2 text-base text-site-ink/85">
                <CalendarClock className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                <span>
                  {when}
                  {worship.worship_date < today && (
                    <span className="ml-2 rounded-full bg-site-ink/[0.06] px-2 py-0.5 text-(length:--site-text-xs) font-semibold whitespace-nowrap text-site-muted">
                      Sudah berlangsung
                    </span>
                  )}
                </span>
              </SheetDescription>
              {worship.location && (
                <p className="flex items-start gap-2 text-base text-site-ink/85">
                  <MapPin className="mt-1 size-4 flex-none" aria-hidden="true" />
                  {worship.location}
                </p>
              )}
            </div>

            <dl className="grid gap-4 border-t border-site-rule px-5 py-5">
              {worship.theme && (
                <div className="grid gap-0.5">
                  <dt className="text-sm text-site-muted">Tema</dt>
                  <dd className="font-site-serif text-xl leading-snug italic">“{worship.theme}”</dd>
                </div>
              )}
              {worship.bible_reading && (
                <div className="grid gap-0.5">
                  <dt className="text-sm text-site-muted">Bacaan</dt>
                  <dd className="text-base font-semibold">{worship.bible_reading}</dd>
                </div>
              )}
              <div className="grid gap-2">
                <dt className="text-sm text-site-muted">Petugas pelayanan</dt>
                <dd>
                  {worship.servants.length === 0 ? (
                    <p className="text-base text-site-muted">Petugas belum diumumkan.</p>
                  ) : (
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-base">
                      {servantGroups(worship).map(({ role, names }) => (
                        <div key={role} className="contents">
                          <dt className="text-site-muted">{SERVANT_ROLE_LABELS[role]}</dt>
                          <dd
                            className={cn(
                              'grid gap-0.5',
                              role === 'PREACHER' && 'font-semibold text-site-ink',
                            )}
                          >
                            {names.map((name, index) => (
                              <span key={index}>{name}</span>
                            ))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </dd>
              </div>
            </dl>

            <div className="grid gap-2 border-t border-site-rule px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {worship.liturgy_file_url && (
                <a
                  href={worship.liturgy_file_url}
                  download={`tata-ibadah-${worship.worship_date}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-site-ink px-4 text-sm font-semibold text-site-canvas transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Unduh tata ibadah (PDF)
                </a>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => copyLink(worship)} className={action}>
                  <Link2 className="size-4" aria-hidden="true" />
                  Salin tautan
                </button>
                <button type="button" onClick={() => share(worship, when)} className={action}>
                  <Share2 className="size-4" aria-hidden="true" />
                  Bagikan
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 px-5 pt-6 pr-14 pb-8">
            <SheetTitle className="font-site-display text-xl font-bold text-site-ink">
              {error ? 'Jadwal tidak dapat dibuka' : 'Memuat jadwal…'}
            </SheetTitle>
            <SheetDescription className="text-base text-site-muted">
              {error
                ? `${error} Jadwal ini mungkin sudah tidak ditampilkan di portal.`
                : 'Rincian jadwal sedang dimuat.'}
            </SheetDescription>
            {!error && (
              <div aria-hidden="true" className="grid gap-2 pt-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-6 animate-pulse rounded bg-site-ink/[0.06]" />
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
