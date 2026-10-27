import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseRayonInput } from '@shared/congregation'
import type { RayonListItem, RayonResponse } from '@shared/types'
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
import { describedBy, inputClass } from '@/lib/form'
import { FieldError } from './form-parts'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah rayon baru.
  rayon?: RayonListItem
  onSaved: (result: RayonResponse, created: boolean) => void
}

export function RayonFormDialog({ open, onOpenChange, rayon, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rayon ? `Ubah Rayon ${rayon.name}` : 'Tambah rayon'}</DialogTitle>
          <DialogDescription>
            {rayon
              ? 'Nama baru langsung tampil di KK, akun Majelis, dan Portal Publik.'
              : 'Rayon baru bisa langsung dipilih saat menambah atau memindahkan KK.'}
          </DialogDescription>
        </DialogHeader>
        <RayonForm rayon={rayon} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}

function RayonForm({
  rayon,
  onCancel,
  onSaved,
}: Pick<Props, 'rayon' | 'onSaved'> & { onCancel: () => void }) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      name: String(form.get('name') ?? ''),
      coordinator_name: String(form.get('coordinator_name') ?? ''),
      description: String(form.get('description') ?? ''),
    }
    const { details } = parseRayonInput(body, 'create')
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      document.getElementById(details.name ? 'name' : 'coordinator_name')?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = rayon
        ? await api.put<RayonResponse>(`/rayons/${rayon.id}`, body)
        : await api.post<RayonResponse>('/rayons', body)
      onSaved(result, !rayon)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Nama rayon</Label>
        <Input
          id="name"
          name="name"
          defaultValue={rayon?.name}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy(errors, 'name')}
          className={inputClass}
        />
        <FieldError id="name-error" messages={errors.name} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="coordinator_name">Koordinator</Label>
        <Input
          id="coordinator_name"
          name="coordinator_name"
          defaultValue={rayon?.coordinator_name ?? ''}
          autoComplete="off"
          aria-invalid={Boolean(errors.coordinator_name)}
          aria-describedby={describedBy(errors, 'coordinator_name')}
          className={inputClass}
        />
        <FieldError id="coordinator_name-error" messages={errors.coordinator_name} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Keterangan</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={rayon?.description ?? ''}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy(errors, 'description')}
          className="rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
        <FieldError id="description-error" messages={errors.description} />
      </div>

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : rayon ? 'Simpan perubahan' : 'Tambah rayon'}
        </Button>
      </DialogFooter>
    </form>
  )
}
