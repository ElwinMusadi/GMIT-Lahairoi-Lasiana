import type { ReactNode } from 'react'
import { ArrowLeft, ExternalLink, FileText, ImageIcon, Printer, TriangleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { SACRAMENT_FORMS } from '@shared/sacraments'
import {
  GENDER_LABELS,
  SACRAMENT_STATUS_LABELS,
  SACRAMENT_TYPE_LABELS,
  type Gender,
  type SacramentDetail,
  type SacramentResponse,
} from '@shared/types'
import { VerificationPanel } from '@/components/sacrament/verification-panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { STATUS_PILL } from '@/lib/sacrament-admin'
import { NOTES_FIELD, formSections, scheduleText, type FieldView } from '@/lib/sacraments'
import { formatBytes } from '@/lib/upload'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

const LIST_HREF = '/dashboard/sacraments'

// Rincian satu pendaftaran sakramen: isian formulir dan berkas syarat dari portal di
// kiri, panel verifikasi (status, jadwal, tautan data jemaat) di kanan. Setelah
// Selesai, panel berganti ringkasan buku induk dengan tombol cetak sertifikat.
export default function SacramentDetailPage() {
  const { id } = useParams()
  const detail = useApiQuery<SacramentResponse>(`/sacraments/${id}`)
  const application = detail.data?.application

  if (!application) {
    return (
      <div className="grid gap-4">
        <BackLink />
        {detail.error ? (
          <p className="text-sm text-muted-foreground">
            Pendaftaran tidak dapat dimuat: {detail.error}{' '}
            <button type="button" onClick={detail.reload} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        ) : (
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-96 w-full max-w-5xl" />
          </div>
        )}
      </div>
    )
  }

  const completed = application.status === 'COMPLETED'
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1.5">
          <BackLink />
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {application.applicant_name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                STATUS_PILL[application.status],
              )}
            >
              {SACRAMENT_STATUS_LABELS[application.status]}
            </span>
            {SACRAMENT_TYPE_LABELS[application.type]} ·{' '}
            <span className="font-mono">{application.registration_code}</span> · masuk{' '}
            {formatDate(application.created_at)}, {formatTime(application.created_at)}
          </p>
        </div>
        {completed && (
          <Button asChild size="lg">
            <Link to={`${LIST_HREF}/${application.id}/cetak`}>
              <Printer data-icon="inline-start" />
              Cetak sertifikat
            </Link>
          </Button>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <ApplicationData application={application} />
          <Documents application={application} />
        </div>
        <aside className="grid gap-5 rounded-lg border bg-card p-5" aria-label="Verifikasi">
          {completed ? (
            <RegisterSummary application={application} />
          ) : (
            <>
              <h2 className="text-base font-semibold">Verifikasi</h2>
              <VerificationPanel
                key={application.updated_at}
                application={application}
                onSaved={detail.reload}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to={LIST_HREF}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Layanan Sakramen
    </Link>
  )
}

// Nilai isian untuk dibaca: tanggal panjang, jenis kelamin, nama rayon.
function displayValue(field: FieldView, application: SacramentDetail): string | null {
  const data = application.form_data
  if (field.key === 'phone') return application.phone
  if (field.key === 'rayon_id') {
    return typeof data.rayon_name === 'string'
      ? `Rayon ${data.rayon_name}`
      : 'Bukan warga Jemaat Lahairoi'
  }
  const value = data[field.key]
  if (value === undefined || value === null || value === '') return null
  if (field.kind === 'gender') return GENDER_LABELS[value as Gender] ?? String(value)
  if (field.kind === 'past-date' || field.kind === 'future-date')
    return formatLongDate(String(value))
  return String(value)
}

function ApplicationData({ application }: { application: SacramentDetail }) {
  const sections = formSections(application.type)
  const notes = displayValue(NOTES_FIELD(application.type), application)
  return (
    <section
      aria-labelledby="judul-data"
      className="grid gap-5 rounded-lg border bg-card p-5 sm:p-6"
    >
      <h2 id="judul-data" className="text-base font-semibold">
        Data pendaftaran
      </h2>
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="grid content-start gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{section.title}</h3>
            <dl className="grid">
              {section.fields.map((field) => (
                <Row key={field.key} label={field.label}>
                  {displayValue(field, application)}
                </Row>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {notes && (
        <div className="grid gap-1 rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <span className="font-medium">Catatan pendaftar</span>
          <p className="whitespace-pre-line text-muted-foreground">{notes}</p>
        </div>
      )}
    </section>
  )
}

function Documents({ application }: { application: SacramentDetail }) {
  const config = SACRAMENT_FORMS[application.type].documents
  return (
    <section
      aria-labelledby="judul-berkas"
      className="grid gap-3 rounded-lg border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="judul-berkas" className="text-base font-semibold">
          Berkas persyaratan
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {application.documents.length} dari {config.length} dilampirkan
        </span>
      </div>
      <ul className="grid">
        {config.map((kind) => {
          const document = application.documents.find((item) => item.kind === kind.kind)
          const image = document?.content_type.startsWith('image/')
          return (
            <li
              key={kind.kind}
              className="flex flex-wrap items-center gap-3 border-t border-rule py-3 first:border-t-0"
            >
              {document && image ? (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block size-14 flex-none overflow-hidden rounded-md border bg-muted"
                >
                  <img src={document.url} alt="" className="size-full object-cover" />
                  <span className="sr-only">Buka {kind.label} (tab baru)</span>
                </a>
              ) : (
                <span className="flex size-14 flex-none items-center justify-center rounded-md border bg-muted text-muted-foreground">
                  {document ? (
                    <FileText className="size-5" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="size-5 opacity-40" aria-hidden="true" />
                  )}
                </span>
              )}
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-medium">
                  {kind.label}
                  {!kind.required && (
                    <span className="font-normal text-muted-foreground"> (opsional)</span>
                  )}
                </span>
                {document ? (
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {document.name} · {formatBytes(document.size)}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[0.8125rem]',
                      kind.required ? 'text-warning-ink' : 'text-muted-foreground',
                    )}
                  >
                    {kind.required && <TriangleAlert className="size-3.5" aria-hidden="true" />}
                    Tidak dilampirkan
                  </span>
                )}
              </div>
              {document && (
                <Button asChild variant="outline" size="sm">
                  <a href={document.url} target="_blank" rel="noreferrer">
                    <ExternalLink data-icon="inline-start" />
                    Buka
                    <span className="sr-only"> {kind.label} (tab baru)</span>
                  </a>
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RegisterSummary({ application }: { application: SacramentDetail }) {
  const members = [application.member_name, application.partner_name].filter(Boolean)
  return (
    <>
      <div className="grid gap-1">
        <h2 className="text-base font-semibold">Buku induk</h2>
        <p className="text-[0.8125rem] text-muted-foreground">
          Pendaftaran selesai dan terkunci. Perubahan data jemaat tercatat di Log Aktivitas.
        </p>
      </div>
      <dl className="grid">
        <Row label="Nomor register">
          <span className="font-mono">{application.certificate_number}</span>
        </Row>
        <Row label="Pelaksanaan">
          {scheduleText(application.scheduled_date, application.scheduled_time)}
        </Row>
        <Row label="Pendeta">{application.officiating_pastor}</Row>
        <Row label="Data jemaat">{members.length > 0 ? members.join(' & ') : 'Tidak tertaut'}</Row>
        <Row label="Catatan">{application.notes}</Row>
      </dl>
      <Button asChild size="lg">
        <Link to={`${LIST_HREF}/${application.id}/cetak`}>
          <Printer data-icon="inline-start" />
          Cetak sertifikat
        </Link>
      </Button>
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-t border-rule py-2 text-sm first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-words', empty && 'text-muted-foreground')}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}
