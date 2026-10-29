import { useState, type ReactNode } from 'react'
import { History, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  FAMILY_RELATION_LABELS,
  MEMBER_STATUS_LABELS,
  type ApiList,
  type FamilyDetail,
  type FamilyResponse,
  type Member,
  type MemberWithFamily,
  type RayonListItem,
} from '@shared/types'
import { FamilyFormDialog } from '@/components/congregation/family-form-dialog'
import { MemberMenu } from '@/components/congregation/member-menu'
import { useMemberActions } from '@/components/congregation/use-member-actions'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableCard } from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import { ageOn, categoricalLabel, sacramentSummary } from '@/lib/congregation'
import { formatDate } from '@/lib/format'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Rincian satu Kartu Keluarga: seluruh anggotanya (termasuk yang pindah atau
// meninggal) dan data KK. Dari sini Admin/Majelis menambah anggota keluarga. Data KK berupa
// deret ringkas di atas, lalu tabel anggota selebar halaman.
export default function FamilyDetailPage() {
  const { id } = useParams()
  const me = useCurrentUser()
  const canEdit = useCan(['ADMIN', 'ELDER'])
  const isAdmin = useCan(['ADMIN'])
  const navigate = useNavigate()
  const query = useApiQuery<FamilyResponse>(`/families/${id}`)
  const rayons = useApiQuery<ApiList<RayonListItem>>(canEdit ? '/rayons' : null)
  const [editing, setEditing] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const actions = useMemberActions({ onChanged: query.reload, showFamilyLink: false })

  const family = query.data?.family
  if (!family) {
    return (
      <div className="grid gap-6">
        {query.error ? (
          <PageHeader
            back={BACK}
            title="Kartu Keluarga tidak dapat dibuka"
            description={
              <>
                {query.error}{' '}
                <button type="button" onClick={query.reload} className="font-medium underline">
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

  const activeHead = family.members.find(
    (member) => member.family_relation === 'HEAD' && member.status === 'ACTIVE',
  )
  // Anggota dari KK ini belum membawa data KK; dilengkapi untuk panel profil dan form.
  const withFamily = (member: Member): MemberWithFamily => ({
    ...member,
    kk_number: family.kk_number,
    family_head_name: family.family_head_name,
    rayon_id: family.rayon_id,
    rayon_name: family.rayon_name,
  })
  const familyChoice = {
    id: family.id,
    kk_number: family.kk_number,
    family_head_name: family.family_head_name,
    rayon_name: family.rayon_name,
  }

  function confirmDelete(target: FamilyDetail) {
    setConfirmation({
      title: `Hapus KK ${target.family_head_name}?`,
      description:
        'KK ini belum punya anggota, jadi bisa dihapus. Gunakan hanya untuk KK yang salah dibuat.',
      confirmLabel: 'Hapus KK',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/families/${target.id}`)
        toast.success(`KK ${target.family_head_name} dihapus.`)
        navigate('/dashboard/families')
      },
    })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        back={BACK}
        title={`Keluarga ${family.family_head_name}`}
        description={
          <span className="tabular-nums">
            {family.kk_number ? `KK ${family.kk_number}` : 'Tanpa nomor KK'} · Rayon{' '}
            {family.rayon_name} · {family.member_count} jiwa aktif
          </span>
        }
        actions={
          canEdit && (
            <>
              <Button variant="outline" size="lg" onClick={() => setEditing(true)}>
                <Pencil data-icon="inline-start" />
                Ubah KK
              </Button>
              <Button size="lg" onClick={() => actions.add({ family: familyChoice })}>
                <Plus data-icon="inline-start" />
                Tambah anggota
              </Button>
            </>
          )
        }
      />

      {family.members.length > 0 && !activeHead && (
        <p
          role="status"
          className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-ink"
        >
          KK ini belum punya Kepala Keluarga yang aktif.
          {canEdit && ' Ubah hubungan keluarga salah satu anggota menjadi Kepala Keluarga.'}
        </p>
      )}

      {/* Data KK sebagai deret ringkas selebar halaman: label di atas nilai di layar lebar,
          sebaris label–nilai di ponsel. */}
      <section
        aria-labelledby="judul-kk"
        className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      >
        <h2 id="judul-kk" className="sr-only">
          Data KK
        </h2>
        <dl className="grid divide-y text-sm lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          <InfoRow label="Nomor KK">{family.kk_number}</InfoRow>
          <InfoRow label="Rayon">{family.rayon_name}</InfoRow>
          <InfoRow label="Alamat">{family.address}</InfoRow>
          <InfoRow label="Telepon">
            {family.phone && (
              <a
                href={`tel:${family.phone}`}
                className="tabular-nums underline-offset-4 hover:underline"
              >
                {family.phone}
              </a>
            )}
          </InfoRow>
          <InfoRow label="Tercatat">{formatDate(family.created_at)}</InfoRow>
        </dl>
        {isAdmin && (
          <div className="flex flex-wrap gap-x-2 border-t px-3 py-1.5">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link to={`/dashboard/audit-logs?entity_type=families&entity_id=${family.id}`}>
                <History data-icon="inline-start" />
                Riwayat KK
              </Link>
            </Button>
            {family.members.length === 0 && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => confirmDelete(family)}
              >
                <Trash2 data-icon="inline-start" />
                Hapus KK
              </Button>
            )}
          </div>
        )}
      </section>

      <TableCard
        aria-labelledby="judul-anggota"
        toolbar={
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="judul-anggota" className="text-base font-semibold">
              Anggota keluarga
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {family.members.length} orang
            </span>
          </div>
        }
      >
        {family.members.length === 0 ? (
          <EmptyMembers
            canEdit={canEdit}
            headName={family.family_head_name}
            onAddHead={() =>
              actions.add({
                family: familyChoice,
                preset: { full_name: family.family_head_name, family_relation: 'HEAD' },
              })
            }
            onAddOther={() => actions.add({ family: familyChoice })}
          />
        ) : (
          <Table className="table-fixed">
            <caption className="sr-only">Anggota keluarga {family.family_head_name}</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nama</TableHead>
                <TableHead className="hidden w-32 md:table-cell">Kategori</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">Sakramen</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">Tindakan</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {family.members.map((member) => (
                <FamilyMemberRow
                  key={member.id}
                  member={withFamily(member)}
                  onView={() => actions.view(withFamily(member))}
                  menu={
                    <MemberMenu
                      member={withFamily(member)}
                      actions={actions}
                      showFamilyLink={false}
                    />
                  }
                />
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {canEdit && (
        <FamilyFormDialog
          open={editing}
          onOpenChange={setEditing}
          family={family}
          rayons={rayons.data?.data ?? []}
          fixedRayonId={me.role === 'ELDER' ? me.rayon_id : undefined}
          headMemberName={activeHead?.full_name}
          onSaved={() => {
            setEditing(false)
            query.reload()
            toast.success('Data KK disimpan.')
          }}
        />
      )}
      {actions.dialogs}
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

function FamilyMemberRow({
  member,
  onView,
  menu,
}: {
  member: MemberWithFamily
  onView: () => void
  menu: ReactNode
}) {
  const age = ageOn(member.birth_date)
  const inactive = member.status !== 'ACTIVE'
  const line2 = [FAMILY_RELATION_LABELS[member.family_relation], age !== null && `${age} tahun`]
    .filter(Boolean)
    .join(' · ')

  return (
    <TableRow>
      <TableCell className="py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={member.full_name} muted={inactive} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onView}
                className={cn(
                  'truncate text-left font-medium underline-offset-4 hover:underline',
                  inactive && 'text-muted-foreground',
                )}
              >
                {member.full_name}
              </button>
              {inactive && (
                <StatusBadge className="flex-none">
                  {MEMBER_STATUS_LABELS[member.status]}
                </StatusBadge>
              )}
            </div>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground lg:truncate">
              {line2}
              <span className="sm:hidden">
                {' · '}
                {sacramentSummary(member)}
              </span>
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden truncate text-muted-foreground md:table-cell">
        {categoricalLabel(member.categorical_group) ?? '—'}
      </TableCell>
      <TableCell className="hidden truncate text-muted-foreground sm:table-cell">
        {sacramentSummary(member)}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">{menu}</TableCell>
    </TableRow>
  )
}

function EmptyMembers({
  canEdit,
  headName,
  onAddHead,
  onAddOther,
}: {
  canEdit: boolean
  headName: string
  onAddHead: () => void
  onAddOther: () => void
}) {
  return (
    <div className="m-4 grid gap-3 rounded-lg border border-dashed px-4 py-4 text-sm">
      <p className="text-muted-foreground">Belum ada anggota yang tercatat di KK ini.</p>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddHead}>
            <Plus data-icon="inline-start" />
            Tambah {headName} sebagai Kepala Keluarga
          </Button>
          <Button variant="outline" onClick={onAddOther}>
            Tambah anggota lain
          </Button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === '' || children === false
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 px-4 py-2.5 lg:grid-cols-1 lg:content-start lg:gap-1 lg:px-5 lg:py-4">
      <dt className="text-muted-foreground lg:text-xs">{label}</dt>
      <dd className={cn('font-medium break-words', empty && 'font-normal text-muted-foreground')}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}

const BACK = { to: '/dashboard/families', label: 'Semua Kartu Keluarga' }

function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
