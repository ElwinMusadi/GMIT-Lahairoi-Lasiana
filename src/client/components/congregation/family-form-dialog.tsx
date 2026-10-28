import { useRef, useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseFamilyInput } from '@shared/congregation'
import type { Family, FamilyResponse, RayonListItem } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { describedBy, inputClass } from '@/lib/form'
import { FieldError, FieldHint } from '@/components/form-parts'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah KK baru.
  family?: Family
  rayons: RayonListItem[]
  // Majelis: KK selalu di rayonnya sendiri.
  fixedRayonId?: number | null
  // Nama Kepala Keluarga aktif di KK ini; nama kepala lalu mengikuti data anggotanya.
  headMemberName?: string | null
  onSaved: (result: FamilyResponse, created: boolean) => void
}

export function FamilyFormDialog({ open, onOpenChange, family, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {family ? `Ubah KK ${family.family_head_name}` : 'Tambah Kartu Keluarga'}
          </DialogTitle>
          <DialogDescription>
            {family
              ? 'Mengganti rayon ikut memindahkan seluruh anggota KK ini.'
              : 'Setelah KK tersimpan, tambahkan anggotanya mulai dari Kepala Keluarga.'}
          </DialogDescription>
        </DialogHeader>
        <FamilyForm family={family} onCancel={() => onOpenChange(false)} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function FamilyForm({
  family,
  rayons,
  fixedRayonId,
  headMemberName,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fixedRayon = fixedRayonId ? rayons.find((rayon) => rayon.id === fixedRayonId) : undefined

  function focusFirstError(details: FieldErrors) {
    const order = ['kk_number', 'family_head_name', 'rayon_id', 'address', 'phone']
    const field = order.find((name) => details[name])
    const element = field ? formRef.current?.elements.namedItem(field) : null
    if (element instanceof RadioNodeList) (element[0] as HTMLElement | undefined)?.focus()
    else if (element instanceof HTMLElement) element.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '')
    const rayonId = fixedRayonId ?? Number(text('rayon_id'))
    const body: Record<string, unknown> = {
      kk_number: text('kk_number'),
      rayon_id: rayonId || null,
      address: text('address'),
      phone: text('phone'),
    }
    // Nama kepala yang terkunci tidak dikirim, agar tidak ditolak API.
    if (!headMemberName) body.family_head_name = text('family_head_name')

    // Aturan yang sama dengan API (src/shared/congregation.ts).
    const { details } = parseFamilyInput(body, family ? 'update' : 'create')
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) return focusFirstError(details)

    setSubmitting(true)
    try {
      const result = family
        ? await api.put<FamilyResponse>(`/families/${family.id}`, body)
        : await api.post<FamilyResponse>('/families', body)
      onSaved(result, !family)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        setErrors(err.details)
        focusFirstError(err.details)
      }
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onChange={({ target }: { target: EventTarget }) => {
        if (target instanceof HTMLInputElement && errors[target.name]) {
          const next = { ...errors }
          delete next[target.name]
          setErrors(next)
        }
      }}
      className="grid gap-5"
    >
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor="kk_number">Nomor KK gereja</Label>
          <Input
            id="kk_number"
            name="kk_number"
            defaultValue={family?.kk_number ?? ''}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.kk_number)}
            aria-describedby={describedBy(errors, 'kk_number', 'kk_number-hint')}
            className={cn(inputClass, 'uppercase')}
          />
          <FieldHint id="kk_number-hint">Boleh kosong untuk data lama tanpa nomor.</FieldHint>
          <FieldError id="kk_number-error" messages={errors.kk_number} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="family_head_name">Nama kepala keluarga</Label>
          <Input
            id="family_head_name"
            name="family_head_name"
            defaultValue={headMemberName ?? family?.family_head_name ?? ''}
            readOnly={Boolean(headMemberName)}
            autoComplete="off"
            aria-invalid={Boolean(errors.family_head_name)}
            aria-describedby={describedBy(
              errors,
              'family_head_name',
              headMemberName ? 'family_head_name-hint' : undefined,
            )}
            className={cn(inputClass, headMemberName && 'bg-muted text-muted-foreground')}
          />
          {headMemberName && (
            <FieldHint id="family_head_name-hint">
              Mengikuti profil Kepala Keluarga; ubah namanya di profil anggota tersebut.
            </FieldHint>
          )}
          <FieldError id="family_head_name-error" messages={errors.family_head_name} />
        </div>
      </div>

      {fixedRayon ? (
        <div className="grid gap-1">
          <p className="text-sm font-medium">Rayon</p>
          <p className="text-sm">
            {fixedRayon.name}{' '}
            <span className="text-muted-foreground">· rayon Anda sebagai Majelis</span>
          </p>
        </div>
      ) : (
        <fieldset className="grid gap-2" aria-describedby={describedBy(errors, 'rayon_id')}>
          <legend className="mb-2 text-sm font-medium">Rayon</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {rayons.map((rayon) => (
              <label
                key={rayon.id}
                className={cn(
                  'grid cursor-pointer gap-0.5 rounded-lg border border-input bg-card px-3 py-2',
                  'has-checked:border-primary has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rayon_id"
                    value={rayon.id}
                    defaultChecked={family?.rayon_id === rayon.id}
                    onChange={() => {
                      if (!errors.rayon_id) return
                      const next = { ...errors }
                      delete next.rayon_id
                      setErrors(next)
                    }}
                    aria-invalid={Boolean(errors.rayon_id)}
                    className="size-4 flex-none accent-primary"
                  />
                  <span className="truncate text-sm font-medium">{rayon.name}</span>
                </span>
                {rayon.family_count !== undefined && (
                  <span className="pl-6 text-xs text-muted-foreground tabular-nums">
                    {rayon.family_count.toLocaleString('id-ID')} KK
                  </span>
                )}
              </label>
            ))}
          </div>
          <FieldError id="rayon_id-error" messages={errors.rayon_id} />
        </fieldset>
      )}

      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor="address">Alamat</Label>
          <Input
            id="address"
            name="address"
            defaultValue={family?.address ?? ''}
            autoComplete="off"
            aria-invalid={Boolean(errors.address)}
            aria-describedby={describedBy(errors, 'address')}
            className={inputClass}
          />
          <FieldError id="address-error" messages={errors.address} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="phone">Telepon / WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={family?.phone ?? ''}
            autoComplete="off"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy(errors, 'phone')}
            className={inputClass}
          />
          <FieldError id="phone-error" messages={errors.phone} />
        </div>
      </div>

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : family ? 'Simpan perubahan' : 'Simpan KK'}
        </Button>
      </DialogFooter>
    </form>
  )
}
