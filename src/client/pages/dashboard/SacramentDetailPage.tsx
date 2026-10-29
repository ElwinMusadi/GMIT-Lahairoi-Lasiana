import type { ReactNode } from 'react'
import { ExternalLink, FileText, ImageIcon, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { SACRAMENT_FORMS } from '@shared/sacraments'
import {
  GENDER_LABELS,
  SACRAMENT_TYPE_LABELS,
  type Gender,
  type SacramentDetail,
  type SacramentResponse,
} from '@shared/types'
import { SacramentStatusBadge } from '@/components/sacrament/status-badge'
import { VerificationPanel } from '@/components/sacrament/verification-panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/zenith/page-header'
import { Panel } from '@/components/zenith/panel'
import { StatusBadge } from '@/components/zenith/status-badge'
import { formatLongDate } from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { NOTES_FIELD, formSections, scheduleText, type FieldView } from '@/lib/sacraments'
import { formatBytes } from '@/lib/upload'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

const LIST_HREF = '/dashboard/sacraments'
const BACK = { to: LIST_HREF, label: 'Layanan Sakramen' }

// Rincian satu pendaftaran sakramen: isian formulir dan berkas syarat dari portal di
// kiri, panel verifikasi (status, jadwal, tautan data jemaat) di kanan. Setelah Selesai,
// data buku induk tampil sebagai deret ringkas di atas, isian dan berkas selebar halaman.
export default function SacramentDetailPage() {
  const { id } = useParams()
  const detail = useApiQuery<SacramentResponse>(`/sacraments/${id}`)
  const application = detail.data?.application

  if (!application) {
    return (
      <div className="grid gap-6">
        {detail.error ? (
          <PageHeader
            back={BACK}
            title="Pendaftaran tidak dapat dimuat"
            description={
              <>
                {detail.error}{' '}
                <button type="button" onClick={detail.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </>
            }
          />
        ) : (
          <DetailSkeleton />
        )}
      </div>
    )
  }

  const completed = application.status === 'COMPLETED'
  return (
    <div className="grid gap-6">
      <PageHeader
        back={BACK}
        // Nama pendaftar (bisa dua mempelai) membungkus, tidak dipotong, di layar sempit.
        title={<span className="break-words whitespace-normal">{application.applicant_name}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <SacramentStatusBadge status={application.status} />
            <span>
              {SACRAMENT_TYPE_LABELS[application.type]} ·{' '}
              <span className="font-mono">{application.registration_code}</span> · masuk{' '}
              {formatDate(application.created_at)}, {formatTime(application.created_at)}
            </span>
          </span>
        }
        actions={
          completed && (
            <Button asChild size="lg">
              <Link to={`${LIST_HREF}/${application.id}/cetak`}>
                <Printer data-icon="inline-start" />
                Cetak sertifikat
              </Link>
            </Button>
          )
        }
      />

      {completed ? (
        <>
          <RegisterStrip application={application} />
          <ApplicationData application={application} />
          <Documents application={application} />
        </>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 gap-6">
            <ApplicationData application={application} />
            <Documents application={application} />
          </div>
          <Panel title="Verifikasi">
            <VerificationPanel
              key={application.updated_at}
              application={application}
              onSaved={detail.reload}
            />
          </Panel>
        </div>
      )}
    </div>
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
    <Panel title="Data pendaftaran" contentClassName="grid gap-5">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="grid content-start gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{section.title}</h3>
            <dl className="grid divide-y">
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
    </Panel>
  )
}

function Documents({ application }: { application: SacramentDetail }) {
  const config = SACRAMENT_FORMS[application.type].documents
  return (
    <Panel
      title="Berkas persyaratan"
      action={
        <span className="text-sm text-muted-foreground tabular-nums">
          {application.documents.length} dari {config.length} dilampirkan
        </span>
      }
    >
      <ul className="grid divide-y">
        {config.map((kind) => {
          const document = application.documents.find((item) => item.kind === kind.kind)
          const image = document?.content_type.startsWith('image/')
          return (
            <li
              key={kind.kind}
              className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
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
                  <span className="text-[0.8125rem] break-words text-muted-foreground">
                    {document.name} · {formatBytes(document.size)}
                  </span>
                ) : kind.required ? (
                  <StatusBadge tone="warning" className="w-fit">
                    Tidak dilampirkan
                  </StatusBadge>
                ) : (
                  <span className="text-[0.8125rem] text-muted-foreground">Tidak dilampirkan</span>
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
    </Panel>
  )
}

// Data buku induk setelah Selesai, sebagai deret ringkas selebar halaman (pola rincian KK):
// label di atas nilai di layar lebar, sebaris label–nilai di ponsel.
function RegisterStrip({ application }: { application: SacramentDetail }) {
  const members = [application.member_name, application.partner_name].filter(Boolean)
  return (
    <section
      aria-labelledby="judul-buku-induk"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <h2 id="judul-buku-induk" className="sr-only">
        Buku induk
      </h2>
      <dl className="grid divide-y text-sm lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <InfoRow label="Nomor register">
          <span className="font-mono">{application.certificate_number}</span>
        </InfoRow>
        <InfoRow label="Pelaksanaan">
          {scheduleText(application.scheduled_date, application.scheduled_time)}
        </InfoRow>
        <InfoRow label="Pendeta">{application.officiating_pastor}</InfoRow>
        <InfoRow label="Data jemaat">
          {members.length > 0 ? members.join(' & ') : 'Tidak tertaut'}
        </InfoRow>
      </dl>
      {application.notes && (
        <dl className="border-t text-sm">
          <InfoRow label="Catatan">{application.notes}</InfoRow>
        </dl>
      )}
      <p className="border-t px-4 py-2.5 text-[0.8125rem] text-muted-foreground lg:px-5">
        Pendaftaran selesai dan terkunci. Perubahan data jemaat tercatat di Log Aktivitas.
      </p>
    </section>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5 lg:grid-cols-1 lg:content-start lg:gap-1 lg:px-5 lg:py-4">
      <dt className="text-muted-foreground lg:text-xs">{label}</dt>
      <dd className={cn('font-medium break-words', empty && 'font-normal text-muted-foreground')}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-words', empty && 'text-muted-foreground')}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}
