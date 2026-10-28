import type { ReactNode } from 'react'
import { ClipboardList, FileText, Pencil, TriangleAlert, Users } from 'lucide-react'
import { Link } from 'react-router'
import { SERVANT_ROLE_LABELS, type WorshipItem } from '@shared/types'
import { ATTENDANCE_FIELDS, ATTENDANCE_LABELS } from '@shared/worship'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatLongDate } from '@/lib/finance'
import { conflictPhrase, worshipKind, worshipTime } from '@/lib/worship'

// Rincian satu jadwal: petugas (dengan tanda bentrok), tata ibadah, dan kehadiran.
// Admin dan Pendeta membuka editor dari sini; semua yang membuka modul boleh mencatat
// kehadiran setelah ibadah berlangsung.
export function WorshipDetailSheet({
  worship,
  today,
  canPlan,
  onClose,
  onAttendance,
}: {
  worship: WorshipItem | null
  today: string
  canPlan: boolean
  onClose: () => void
  onAttendance: (worship: WorshipItem) => void
}) {
  return (
    <Sheet open={worship !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {worship && (
          <Detail worship={worship} today={today} canPlan={canPlan} onAttendance={onAttendance} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  worship,
  today,
  canPlan,
  onAttendance,
}: {
  worship: WorshipItem
  today: string
  canPlan: boolean
  onAttendance: (worship: WorshipItem) => void
}) {
  const time = worshipTime(worship.worship_time)
  const held = worship.worship_date <= today
  const recorded = worship.attendance_total !== null
  const editHref = `/dashboard/worships/${worship.id}`

  return (
    <>
      <SheetHeader className="border-b px-5 pt-5 pb-4">
        <p className="text-sm text-muted-foreground">
          {worshipKind(worship)} · {formatLongDate(worship.worship_date, true)}
        </p>
        <SheetTitle className="pr-8 text-xl font-semibold">{worship.title}</SheetTitle>
        <SheetDescription>
          {time ? `${time} WITA` : 'Jam menyusul'}
          {worship.location && ` · ${worship.location}`}
        </SheetDescription>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-5 py-5">
        <dl className="grid">
          <Row label="Tema">{worship.theme}</Row>
          <Row label="Bacaan Alkitab">{worship.bible_reading}</Row>
          <Row label="Portal publik">
            {worship.is_public ? 'Tampil di Papan Jadwal' : 'Tidak tampil (internal)'}
          </Row>
        </dl>

        <section className="grid gap-2" aria-labelledby="judul-petugas">
          <h3 id="judul-petugas" className="text-sm font-semibold">
            Petugas pelayanan
          </h3>
          {worship.servants.length > 0 ? (
            <ul className="grid">
              {worship.servants.map((servant) => (
                <li
                  key={servant.id}
                  className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-rule py-2 text-sm first:border-t-0"
                >
                  <span className="text-muted-foreground">{SERVANT_ROLE_LABELS[servant.role]}</span>
                  <span className="grid gap-1">
                    <span>{servant.servant_name}</span>
                    {servant.conflicts.map((conflict) => (
                      <span
                        key={`${conflict.worship_id}-${conflict.role}`}
                        className="flex items-start gap-1.5 text-[0.8125rem] text-warning-ink"
                      >
                        <TriangleAlert className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
                        Bentrok: juga {conflictPhrase(conflict)} pada jam yang sama.
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<Users className="size-4 flex-none" aria-hidden="true" />}>
              Belum ada petugas.
              {canPlan && (
                <Link
                  to={editHref}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Atur petugas
                </Link>
              )}
            </Empty>
          )}
        </section>

        <section className="grid gap-2" aria-labelledby="judul-liturgi">
          <h3 id="judul-liturgi" className="text-sm font-semibold">
            Tata ibadah
          </h3>
          {worship.liturgy_file_url ? (
            <a
              href={worship.liturgy_file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
            >
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              Buka tata ibadah
              <span className="ml-auto text-[0.8125rem] font-normal text-muted-foreground">
                {worship.is_public ? 'Bisa diunduh di portal' : 'Hanya pengurus'}
              </span>
              <span className="sr-only">(tab baru)</span>
            </a>
          ) : (
            <Empty icon={<FileText className="size-4 flex-none" aria-hidden="true" />}>
              Belum ada PDF tata ibadah.
              {canPlan && (
                <Link
                  to={editHref}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Unggah
                </Link>
              )}
            </Empty>
          )}
        </section>

        <section className="grid gap-2" aria-labelledby="judul-kehadiran">
          <h3 id="judul-kehadiran" className="text-sm font-semibold">
            Kehadiran
          </h3>
          {recorded ? (
            <dl className="grid grid-cols-4 divide-x divide-rule rounded-lg border">
              {ATTENDANCE_FIELDS.map((field) => (
                <div key={field} className="grid gap-0.5 px-3 py-2.5">
                  <dt className="text-[0.8125rem] text-muted-foreground">
                    {ATTENDANCE_LABELS[field]}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {worship[field]?.toLocaleString('id-ID') ?? '—'}
                  </dd>
                </div>
              ))}
              <div className="grid gap-0.5 px-3 py-2.5">
                <dt className="text-[0.8125rem] text-muted-foreground">Total</dt>
                <dd className="font-semibold tabular-nums">
                  {worship.attendance_total?.toLocaleString('id-ID')}
                </dd>
              </div>
            </dl>
          ) : (
            <Empty icon={<ClipboardList className="size-4 flex-none" aria-hidden="true" />}>
              {held ? 'Belum dicatat.' : 'Dapat dicatat setelah ibadah berlangsung.'}
            </Empty>
          )}
        </section>
      </div>

      <SheetFooter className="border-t px-5 py-4 sm:flex-row sm:flex-wrap">
        {held && (
          <Button
            size="lg"
            variant={canPlan ? 'outline' : 'default'}
            onClick={() => onAttendance(worship)}
          >
            <ClipboardList data-icon="inline-start" />
            {recorded ? 'Ubah kehadiran' : 'Catat kehadiran'}
          </Button>
        )}
        {canPlan && (
          <Button asChild size="lg" className="sm:order-first">
            <Link to={editHref}>
              <Pencil data-icon="inline-start" />
              Ubah jadwal & petugas
            </Link>
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

// Nilai kosong ditampilkan sebagai tanda pisah abu-abu.
function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-rule py-2 text-sm first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={empty ? 'text-muted-foreground' : undefined}>{empty ? '—' : children}</dd>
    </div>
  )
}

function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      {icon}
      {children}
    </p>
  )
}
