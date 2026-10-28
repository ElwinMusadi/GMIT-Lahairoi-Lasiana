import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseLoanInput } from '@shared/assets'
import { witaToday } from '@shared/dates'
import type { ApiList, Asset, AssetLoanResponse, AssetPage, RayonListItem } from '@shared/types'
import { FieldError, FieldHint } from '@/components/form-parts'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api, errorMessage } from '@/lib/api'
import { stockText, unlendableReason } from '@/lib/assets'
import { describedBy, inputClass, selectClass, textareaClass } from '@/lib/form'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'

const FIELD_ORDER = [
  'asset_id',
  'quantity_borrowed',
  'rayon_id',
  'borrower_name',
  'borrow_date',
  'due_date',
  'notes',
]

const NO_CATEGORY = 'Tanpa kategori'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Barang yang langsung dipilih, mis. dari tombol Pinjamkan di Katalog.
  assetId?: number
  onSaved: (result: AssetLoanResponse) => void
}

// Mencatat peminjaman barang oleh rayon atau warga jemaat. Daftar barang yang masih
// punya unit tersedia dimuat setiap dialog dibuka, sehingga sisa unit adalah stok terkini.
export function LoanFormDialog({ open, onOpenChange, assetId, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Catat peminjaman</DialogTitle>
          <DialogDescription>
            Stok tersedia langsung berkurang dan kembali bertambah saat barang dikembalikan.
          </DialogDescription>
        </DialogHeader>
        <LoanForm
          key={assetId ?? 'any'}
          assetId={assetId}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

function LoanForm({
  assetId,
  onCancel,
  onSaved,
}: Pick<Props, 'assetId' | 'onSaved'> & { onCancel: () => void }) {
  const user = useCurrentUser()
  const [today] = useState(witaToday)
  const catalog = useApiQuery<AssetPage>('/assets', { available: 'true', per_page: 100 })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const [selected, setSelected] = useState(assetId ? String(assetId) : '')
  const [quantity, setQuantity] = useState('1')
  const [rayon, setRayon] = useState(
    user.role === 'ELDER' && user.rayon_id ? String(user.rayon_id) : '',
  )
  const [borrower, setBorrower] = useState('')
  const [borrowDate, setBorrowDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const assets = catalog.data?.data ?? []
  const asset = assets.find((item) => String(item.id) === selected)
  const blocked = asset ? unlendableReason(asset) : null
  const groups = groupByCategory(assets)

  function clearError(...fields: string[]) {
    if (!fields.some((field) => errors[field])) return
    const next = { ...errors }
    for (const field of fields) delete next[field]
    setErrors(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      asset_id: selected ? Number(selected) : null,
      quantity_borrowed: quantity,
      rayon_id: rayon ? Number(rayon) : null,
      borrower_name: borrower,
      borrow_date: borrowDate,
      due_date: dueDate,
      notes,
    }
    const { input, details } = parseLoanInput(body, today)
    if (asset && blocked) details.asset_id = [`${asset.name}: ${blocked.toLowerCase()}.`]
    else if (
      asset &&
      input.quantity_borrowed &&
      input.quantity_borrowed > asset.available_quantity
    ) {
      details.quantity_borrowed = [`Tersedia ${stockText(asset)}.`]
    }
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      const first = FIELD_ORDER.find((key) => details[key])
      if (first) document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      onSaved(await api.post<AssetLoanResponse>('/asset-loans', body))
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
      // Stok bisa berubah karena peminjaman lain; tampilkan angka terbaru.
      if (err instanceof ApiError && err.status === 409) catalog.reload()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="grid min-w-0 content-start gap-2">
          <Label htmlFor="asset_id">Barang</Label>
          {catalog.data ? (
            <select
              id="asset_id"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value)
                clearError('asset_id', 'quantity_borrowed')
              }}
              aria-invalid={Boolean(errors.asset_id)}
              aria-describedby={describedBy(errors, 'asset_id', 'asset_id-hint')}
              className={selectClass}
            >
              <option value="">Pilih barang</option>
              {groups.map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((item) => {
                    const reason = unlendableReason(item)
                    return (
                      <option key={item.id} value={item.id} disabled={reason !== null}>
                        {item.name} ·{' '}
                        {reason
                          ? reason.toLowerCase()
                          : `sisa ${item.available_quantity.toLocaleString('id-ID')}`}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
          ) : catalog.error ? (
            <p className="text-sm text-destructive">
              Daftar barang tidak dapat dimuat: {catalog.error}{' '}
              <button type="button" onClick={catalog.reload} className="font-medium underline">
                Coba lagi
              </button>
            </p>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
          <FieldHint id="asset_id-hint">
            {asset ? (
              <>
                <span className="font-mono">{asset.asset_code}</span> · tersedia{' '}
                <span className="font-medium text-foreground tabular-nums">{stockText(asset)}</span>
                {asset.location && ` · ${asset.location}`}
              </>
            ) : (
              'Hanya barang yang masih punya unit tersedia. Barang rusak berat atau dalam perbaikan tidak dapat dipilih.'
            )}
          </FieldHint>
          <FieldError id="asset_id-error" messages={errors.asset_id} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="quantity_borrowed">Jumlah</Label>
          <Input
            id="quantity_borrowed"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value.replace(/\D/g, '').slice(0, 6))
              clearError('quantity_borrowed')
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.quantity_borrowed)}
            aria-describedby={describedBy(
              errors,
              'quantity_borrowed',
              asset && !blocked ? 'quantity_borrowed-hint' : undefined,
            )}
            className={`${inputClass} tabular-nums`}
          />
          {asset && !blocked && (
            <FieldHint id="quantity_borrowed-hint">
              Maks. {asset.available_quantity.toLocaleString('id-ID')}
            </FieldHint>
          )}
          <FieldError id="quantity_borrowed-error" messages={errors.quantity_borrowed} />
        </div>
      </div>

      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="rayon_id">Rayon peminjam</Label>
          <select
            id="rayon_id"
            value={rayon}
            onChange={(event) => {
              setRayon(event.target.value)
              clearError('rayon_id')
            }}
            aria-invalid={Boolean(errors.rayon_id)}
            aria-describedby={describedBy(errors, 'rayon_id')}
            className={selectClass}
          >
            <option value="">Bukan atas nama rayon</option>
            {(rayons.data?.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                Rayon {item.name}
              </option>
            ))}
          </select>
          <FieldError id="rayon_id-error" messages={errors.rayon_id} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="borrower_name">Nama peminjam</Label>
          <Input
            id="borrower_name"
            value={borrower}
            onChange={(event) => {
              setBorrower(event.target.value)
              clearError('borrower_name')
            }}
            placeholder="mis. Pnt. Yohanis Dimu"
            autoComplete="off"
            aria-invalid={Boolean(errors.borrower_name)}
            aria-describedby={describedBy(errors, 'borrower_name', 'borrower_name-hint')}
            className={inputClass}
          />
          <FieldHint id="borrower_name-hint">Penanggung jawab yang mengembalikan.</FieldHint>
          <FieldError id="borrower_name-error" messages={errors.borrower_name} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="borrow_date">Tanggal pinjam</Label>
          <Input
            id="borrow_date"
            type="date"
            max={today}
            value={borrowDate}
            onChange={(event) => {
              setBorrowDate(event.target.value)
              clearError('borrow_date', 'due_date')
            }}
            aria-invalid={Boolean(errors.borrow_date)}
            aria-describedby={describedBy(errors, 'borrow_date')}
            className={inputClass}
          />
          <FieldError id="borrow_date-error" messages={errors.borrow_date} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="due_date">Batas kembali</Label>
          <Input
            id="due_date"
            type="date"
            min={borrowDate || undefined}
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value)
              clearError('due_date')
            }}
            aria-invalid={Boolean(errors.due_date)}
            aria-describedby={describedBy(errors, 'due_date')}
            className={inputClass}
          />
          <FieldError id="due_date-error" messages={errors.due_date} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Keperluan</Label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value)
            clearError('notes')
          }}
          placeholder="mis. Ibadah syukur ulang tahun di rumah Kel. Ndun"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy(errors, 'notes')}
          className={textareaClass}
        />
        <FieldError id="notes-error" messages={errors.notes} />
      </div>

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting || !catalog.data}>
          {submitting ? 'Menyimpan…' : 'Catat peminjaman'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Barang dikelompokkan per kategori (urut abjad), tanpa kategori di akhir.
function groupByCategory(assets: Asset[]): [string, Asset[]][] {
  const groups = new Map<string, Asset[]>()
  for (const asset of assets) {
    const key = asset.category ?? NO_CATEGORY
    groups.set(key, [...(groups.get(key) ?? []), asset])
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b, 'id'),
  )
}
