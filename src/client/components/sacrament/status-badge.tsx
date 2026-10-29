import { SACRAMENT_STATUS_LABELS, type SacramentStatus } from '@shared/types'
import { StatusBadge, type StatusTone } from '@/components/zenith/status-badge'
import { STATUS_SHORT } from '@/lib/sacrament-admin'

// Nada lencana tiap status pendaftaran, dipakai antrean dan rincian: Menunggu netral
// (keadaan biasa antrean), Revisi merah (menunggu pendaftar), Konseling kuning, Disetujui
// "diproses" (menunggu pelaksanaan), Selesai hijau.
const STATUS_TONE: Record<SacramentStatus, StatusTone> = {
  PENDING: 'neutral',
  REVISION: 'danger',
  COUNSELING: 'warning',
  APPROVED: 'info',
  COMPLETED: 'success',
}

// Lencana status pendaftaran sakramen. Sebutan pendek untuk sel tabel; sebutan lengkap
// tetap terbaca lewat title.
export function SacramentStatusBadge({
  status,
  short = false,
  className,
}: {
  status: SacramentStatus
  short?: boolean
  className?: string
}) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} className={className}>
      {short ? (
        <span title={SACRAMENT_STATUS_LABELS[status]}>{STATUS_SHORT[status]}</span>
      ) : (
        SACRAMENT_STATUS_LABELS[status]
      )}
    </StatusBadge>
  )
}
