import type { ReactNode } from 'react'
import { History, House, Pencil } from 'lucide-react'
import { Link } from 'react-router'
import {
  FAMILY_RELATION_LABELS,
  GENDER_LABELS,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  type MemberWithFamily,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { StatusBadge } from '@/components/zenith/status-badge'
import { ageOn, categoricalLabel, familyName } from '@/lib/congregation'
import { formatDate } from '@/lib/format'

// Profil lengkap satu anggota jemaat, hanya dibaca. Pendeta melihat profil lewat
// panel ini; Admin dan Majelis membuka form ubah dari sini.
export function MemberProfileSheet({
  member,
  onClose,
  onEdit,
  canEdit,
  showHistory,
  showFamilyLink = true,
}: {
  member: MemberWithFamily | null
  onClose: () => void
  onEdit: (member: MemberWithFamily) => void
  canEdit: boolean
  showHistory: boolean
  showFamilyLink?: boolean
}) {
  return (
    <Sheet open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {member && (
          <Profile
            member={member}
            onEdit={onEdit}
            canEdit={canEdit}
            showHistory={showHistory}
            showFamilyLink={showFamilyLink}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Profile({
  member,
  onEdit,
  canEdit,
  showHistory,
  showFamilyLink,
}: {
  member: MemberWithFamily
  onEdit: (member: MemberWithFamily) => void
  canEdit: boolean
  showHistory: boolean
  showFamilyLink: boolean
}) {
  const age = ageOn(member.birth_date)
  const birth = [
    member.birth_place,
    member.birth_date && `${formatDate(member.birth_date)} (${age} tahun)`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <SheetHeader className="flex-row items-center gap-4 border-b px-5 pt-5 pb-4">
        <PersonAvatar
          name={member.full_name}
          muted={member.status !== 'ACTIVE'}
          className="size-12 text-sm"
        />
        <div className="grid min-w-0 gap-1">
          <SheetTitle className="flex flex-wrap items-center gap-2 pr-8 text-lg font-semibold">
            {member.full_name}
            {member.status !== 'ACTIVE' && (
              <StatusBadge>{MEMBER_STATUS_LABELS[member.status]}</StatusBadge>
            )}
          </SheetTitle>
          <SheetDescription>
            {FAMILY_RELATION_LABELS[member.family_relation]} di KK {familyName(member)} · Rayon{' '}
            {member.rayon_name}
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-5 py-5">
        <ProfileSection title="Identitas">
          <Row label="Jenis kelamin">{GENDER_LABELS[member.gender]}</Row>
          <Row label="Lahir">{birth}</Row>
          <Row label="Golongan darah">{member.blood_type}</Row>
          <Row label="NIK" figures>
            {member.nik}
          </Row>
          <Row label="Nomor Induk">{member.church_member_number}</Row>
        </ProfileSection>
        <ProfileSection title="Pelayanan & pekerjaan">
          <Row label="Kategori">{categoricalLabel(member.categorical_group)}</Row>
          <Row label="Pendidikan">{member.education}</Row>
          <Row label="Pekerjaan">{member.occupation}</Row>
        </ProfileSection>
        <ProfileSection title="Sakramen & pernikahan">
          <Row label="Baptis">{sacramentLine(member.baptism_status, member.baptism_date)}</Row>
          <Row label="Sidi">{sacramentLine(member.sidi_status, member.sidi_date)}</Row>
          <Row label="Pernikahan">
            {member.marriage_status &&
              [
                MARRIAGE_STATUS_LABELS[member.marriage_status],
                member.marriage_date && formatDate(member.marriage_date),
              ]
                .filter(Boolean)
                .join(' · ')}
          </Row>
        </ProfileSection>
      </div>

      <SheetFooter className="border-t px-5 py-4 sm:flex-row sm:flex-wrap">
        {canEdit && (
          <Button size="lg" onClick={() => onEdit(member)}>
            <Pencil data-icon="inline-start" />
            Ubah profil
          </Button>
        )}
        {showFamilyLink && (
          <Button asChild variant="outline" size="lg">
            <Link to={`/dashboard/families/${member.family_id}`}>
              <House data-icon="inline-start" />
              Buka Kartu Keluarga
            </Link>
          </Button>
        )}
        {showHistory && (
          <Button asChild variant="ghost" size="lg">
            <Link to={`/dashboard/audit-logs?entity_type=members&entity_id=${member.id}`}>
              <History data-icon="inline-start" />
              Riwayat
            </Link>
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

function sacramentLine(done: boolean, date: string | null) {
  if (!done) return 'Belum'
  return date ? `Sudah · ${formatDate(date)}` : 'Sudah (tanggal belum diisi)'
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="grid">{children}</dl>
    </section>
  )
}

// Nilai kosong ditampilkan sebagai tanda pisah abu-abu.
function Row({
  label,
  figures,
  children,
}: {
  label: string
  figures?: boolean
  children: ReactNode
}) {
  const empty = children === null || children === undefined || children === '' || children === false
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t py-2 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={empty ? 'text-muted-foreground' : figures ? 'tabular-nums' : undefined}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}
