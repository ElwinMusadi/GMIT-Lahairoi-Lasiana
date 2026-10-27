import { useState } from 'react'
import { toast } from 'sonner'
import type { FamilyRelation, MemberWithFamily } from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { api } from '@/lib/api'
import { familyName, type FamilyChoice } from '@/lib/congregation'
import { useCan } from '@/lib/session'
import { MemberFormDialog } from './member-form-dialog'
import { MemberProfileSheet } from './member-profile-sheet'

type FormState = {
  member?: MemberWithFamily
  family?: FamilyChoice
  preset?: { full_name?: string; family_relation?: FamilyRelation }
}

export type MemberActions = ReturnType<typeof useMemberActions>

// Panel profil, form tambah/ubah, dan konfirmasi hapus anggota jemaat, dipakai oleh
// halaman Anggota Jemaat dan rincian KK. `onChanged` dipanggil setelah data berubah.
export function useMemberActions({
  onChanged,
  showFamilyLink = true,
}: {
  onChanged: () => void
  showFamilyLink?: boolean
}) {
  const canEdit = useCan(['ADMIN', 'ELDER'])
  const isAdmin = useCan(['ADMIN'])
  const [viewing, setViewing] = useState<MemberWithFamily | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  function handleSaved(member: MemberWithFamily, created: boolean) {
    setForm(null)
    // Panel profil yang terbuka ikut menampilkan data terbaru.
    setViewing((current) => (current?.id === member.id ? member : current))
    onChanged()
    toast.success(
      created
        ? `${member.full_name} ditambahkan ke KK ${familyName(member)}.`
        : `Profil ${member.full_name} disimpan.`,
    )
  }

  function remove(member: MemberWithFamily) {
    setConfirmation({
      title: `Hapus data ${member.full_name}?`,
      description:
        'Hapus hanya untuk data yang salah input. Jemaat yang pindah atau meninggal cukup diubah status keanggotaannya di profil, agar riwayatnya tetap ada.',
      confirmLabel: 'Hapus data',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/members/${member.id}`)
        setViewing(null)
        onChanged()
        toast.success(`Data ${member.full_name} dihapus.`)
      },
    })
  }

  return {
    canEdit,
    isAdmin,
    view: setViewing,
    edit: (member: MemberWithFamily) => setForm({ member }),
    add: (options: Omit<FormState, 'member'> = {}) => setForm(options),
    remove,
    dialogs: (
      <>
        <MemberProfileSheet
          member={viewing}
          onClose={() => setViewing(null)}
          onEdit={(member) => setForm({ member })}
          canEdit={canEdit}
          showHistory={isAdmin}
          showFamilyLink={showFamilyLink}
        />
        <MemberFormDialog
          open={form !== null}
          onOpenChange={(open) => !open && setForm(null)}
          member={form?.member}
          family={form?.family}
          preset={form?.preset}
          onSaved={handleSaved}
        />
        <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
      </>
    ),
  }
}
