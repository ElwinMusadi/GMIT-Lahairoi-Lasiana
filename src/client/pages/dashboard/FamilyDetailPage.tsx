import { useState, type ReactNode } from 'react'
import { ArrowLeft, History, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { api } from '@/lib/api'
import { ageOn, categoricalLabel, sacramentSummary } from '@/lib/congregation'
import { formatDate } from '@/lib/format'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Rincian satu Kartu Keluarga: seluruh anggotanya (termasuk yang pindah atau
// meninggal) dan data KK. Dari sini Admin/Majelis menambah anggota keluarga.
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
        <BackLink />
        {query.error ? (
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Kartu Keluarga tidak dapat dibuka
            </h1>
            <p className="text-sm text-muted-foreground">
              {query.error}{' '}
              <button type="button" onClick={query.reload} className="font-medium underline">
                Coba lagi
              </button>
            </p>
          </div>
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
      <BackLink />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Keluarga {family.family_head_name}
          </h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {family.kk_number ? `KK ${family.kk_number}` : 'Tanpa nomor KK'} · Rayon{' '}
            {family.rayon_name} · {family.member_count} jiwa aktif
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={() => setEditing(true)}>
              <Pencil data-icon="inline-start" />
              Ubah KK
            </Button>
            <Button size="lg" onClick={() => actions.add({ family: familyChoice })}>
              <Plus data-icon="inline-start" />
              Tambah anggota
            </Button>
          </div>
        )}
      </header>

      {family.members.length > 0 && !activeHead && (
        <p className="rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          KK ini belum punya Kepala Keluarga yang aktif.
          {canEdit && ' Ubah hubungan keluarga salah satu anggota menjadi Kepala Keluarga.'}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="judul-anggota" className="rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-4 px-4 pt-4 pb-2">
            <h2 id="judul-anggota" className="text-base font-semibold">
              Anggota keluarga
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {family.members.length} orang
            </span>
          </div>
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
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Anggota keluarga {family.family_head_name}</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="h-9 pr-4 pl-4 font-normal">
                    Nama
                  </th>
                  <th scope="col" className="hidden w-28 pr-4 font-normal md:table-cell">
                    Kategori
                  </th>
                  <th scope="col" className="hidden w-40 pr-4 font-normal sm:table-cell">
                    Sakramen
                  </th>
                  <th scope="col" className="w-14 pr-2">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          )}
        </section>

        <aside aria-labelledby="judul-kk" className="grid gap-2">
          <h2 id="judul-kk" className="sr-only">
            Data KK
          </h2>
          <dl className="rounded-lg border bg-card px-4 py-1 text-sm">
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
            <div className="flex flex-wrap gap-x-2">
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
        </aside>
      </div>

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
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
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
            <span className="flex-none rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
              {MEMBER_STATUS_LABELS[member.status]}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          {line2}
          <span className="sm:hidden">
            {' · '}
            {sacramentSummary(member)}
          </span>
        </p>
      </td>
      <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">
        {categoricalLabel(member.categorical_group) ?? '—'}
      </td>
      <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">
        {sacramentSummary(member)}
      </td>
      <td className="py-2 pr-2 text-right">{menu}</td>
    </tr>
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
    <div className="mx-4 mb-4 grid gap-3 rounded-lg border border-dashed px-4 py-4 text-sm">
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
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-t border-rule py-2.5 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-words', empty && 'text-muted-foreground')}>
        {empty ? '—' : children}
      </dd>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/dashboard/families"
      className="-mb-2 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Semua Kartu Keluarga
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  )
}
