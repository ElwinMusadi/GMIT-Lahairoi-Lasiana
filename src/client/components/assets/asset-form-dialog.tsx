import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { SUGGESTED_CATEGORIES, parseAssetInput } from '@shared/assets'
import { witaToday } from '@shared/dates'
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  type Asset,
  type AssetCondition,
  type AssetResponse,
} from '@shared/types'
import { RupiahInput } from '@/components/finance/money-fields'
import { FieldError, FieldHint, FormSection } from '@/components/form-parts'
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
import { describedBy, inputClass, selectClass, textareaClass } from '@/lib/form'

const FIELD_ORDER = [
  'name',
  'asset_code',
  'category',
  'location',
  'quantity',
  'condition',
  'acquisition_source',
  'acquisition_year',
  'estimated_value',
  'notes',
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah aset baru.
  asset?: Asset
  // Kondisi awal yang diusulkan, mis. kondisi saat barang dikembalikan.
  suggestedCondition?: AssetCondition
  // Kategori dan lokasi yang sudah dipakai, sebagai pilihan isian.
  categories: string[]
  locations: string[]
  onSaved: (result: AssetResponse, created: boolean) => void
}

// Menambah atau mengubah data aset inventaris (Admin dan Majelis). Stok tersedia tidak
// diisi di sini: berubah lewat peminjaman dan ikut bergeser bila jumlah unit diubah.
export function AssetFormDialog({ open, onOpenChange, asset, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{asset ? `Ubah ${asset.name}` : 'Tambah aset'}</DialogTitle>
          <DialogDescription>
            {asset
              ? `Kode ${asset.asset_code}. Perubahan tercatat di Log Aktivitas.`
              : 'Barang milik gereja beserta lokasi, kondisi, dan asal perolehannya.'}
          </DialogDescription>
        </DialogHeader>
        <AssetForm
          key={`${asset?.id ?? 'new'}-${props.suggestedCondition ?? ''}`}
          asset={asset}
          onCancel={() => onOpenChange(false)}
          {...props}
        />
      </DialogContent>
    </Dialog>
  )
}

function AssetForm({
  asset,
  suggestedCondition,
  categories,
  locations,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [currentYear] = useState(() => Number(witaToday().slice(0, 4)))
  const [name, setName] = useState(asset?.name ?? '')
  const [code, setCode] = useState(asset?.asset_code ?? '')
  const [category, setCategory] = useState(asset?.category ?? '')
  const [location, setLocation] = useState(asset?.location ?? '')
  const [quantity, setQuantity] = useState(asset ? String(asset.quantity) : '')
  const [condition, setCondition] = useState<AssetCondition>(
    suggestedCondition ?? asset?.condition ?? 'GOOD',
  )
  const [source, setSource] = useState(asset?.acquisition_source ?? '')
  const [year, setYear] = useState(asset?.acquisition_year ? String(asset.acquisition_year) : '')
  const [value, setValue] = useState<number | null>(asset?.estimated_value ?? null)
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const lent = asset ? asset.quantity - asset.available_quantity : 0
  const categoryOptions = [...new Set([...categories, ...SUGGESTED_CATEGORIES])].sort((a, b) =>
    a.localeCompare(b, 'id'),
  )

  function clearError(field: string) {
    if (!errors[field]) return
    const next = { ...errors }
    delete next[field]
    setErrors(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      name,
      asset_code: code,
      category,
      location,
      quantity,
      condition,
      acquisition_source: source,
      acquisition_year: year,
      estimated_value: value,
      notes,
    }
    const { input, details } = parseAssetInput(body, asset ? 'update' : 'create', currentYear)
    if (input.quantity !== undefined && input.quantity < lent) {
      details.quantity = [`${lent.toLocaleString('id-ID')} unit sedang dipinjam; minimal ${lent}.`]
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
      const result = asset
        ? await api.put<AssetResponse>(`/assets/${asset.id}`, body)
        : await api.post<AssetResponse>('/assets', body)
      onSaved(result, !asset)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2 sm:col-span-2">
          <Label htmlFor="name">Nama barang</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearError('name')
            }}
            placeholder="mis. Kursi plastik Napolly"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy(errors, 'name')}
            className={inputClass}
          />
          <FieldError id="name-error" messages={errors.name} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="asset_code">Kode inventaris</Label>
          <Input
            id="asset_code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              clearError('asset_code')
            }}
            placeholder={asset ? undefined : 'Otomatis'}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.asset_code)}
            aria-describedby={describedBy(errors, 'asset_code', 'asset_code-hint')}
            className={`${inputClass} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
          />
          <FieldHint id="asset_code-hint">
            {asset
              ? 'Kode yang tertempel di barang.'
              : 'Kosongkan untuk kode otomatis berurutan: INV-0001, INV-0002, …'}
          </FieldHint>
          <FieldError id="asset_code-error" messages={errors.asset_code} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="category">Kategori</Label>
          <Input
            id="category"
            list="asset-categories"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              clearError('category')
            }}
            placeholder="mis. Alat musik"
            autoComplete="off"
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy(errors, 'category')}
            className={inputClass}
          />
          <datalist id="asset-categories">
            {categoryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <FieldError id="category-error" messages={errors.category} />
        </div>
        <div className="grid content-start gap-2 sm:col-span-2">
          <Label htmlFor="location">Lokasi penyimpanan</Label>
          <Input
            id="location"
            list="asset-locations"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value)
              clearError('location')
            }}
            placeholder="mis. Gudang belakang gedung kebaktian"
            autoComplete="off"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={describedBy(errors, 'location')}
            className={inputClass}
          />
          <datalist id="asset-locations">
            {locations.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <FieldError id="location-error" messages={errors.location} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="quantity">Jumlah unit</Label>
          <Input
            id="quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value.replace(/\D/g, '').slice(0, 6))
              clearError('quantity')
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={describedBy(errors, 'quantity', asset ? 'quantity-hint' : undefined)}
            className={`${inputClass} tabular-nums`}
          />
          {asset && (
            <FieldHint id="quantity-hint">
              {lent > 0
                ? `${lent.toLocaleString('id-ID')} unit sedang dipinjam; stok tersedia ikut menyesuaikan.`
                : 'Stok tersedia ikut menyesuaikan.'}
            </FieldHint>
          )}
          <FieldError id="quantity-error" messages={errors.quantity} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="condition">Kondisi fisik</Label>
          <select
            id="condition"
            value={condition}
            onChange={(event) => {
              setCondition(event.target.value as AssetCondition)
              clearError('condition')
            }}
            aria-invalid={Boolean(errors.condition)}
            aria-describedby={describedBy(errors, 'condition', 'condition-hint')}
            className={selectClass}
          >
            {ASSET_CONDITIONS.map((option) => (
              <option key={option} value={option}>
                {ASSET_CONDITION_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldHint id="condition-hint">
            {asset && suggestedCondition && suggestedCondition !== asset.condition
              ? `Dari kondisi saat dikembalikan; tercatat sebelumnya ${ASSET_CONDITION_LABELS[asset.condition].toLowerCase()}.`
              : 'Rusak berat dan dalam perbaikan tidak dipinjamkan.'}
          </FieldHint>
          <FieldError id="condition-error" messages={errors.condition} />
        </div>
      </div>

      <FormSection title="Perolehan" className="sm:grid-cols-2">
        <div className="grid content-start gap-2 sm:col-span-2">
          <Label htmlFor="acquisition_source">Sumber perolehan</Label>
          <Input
            id="acquisition_source"
            value={source}
            onChange={(event) => {
              setSource(event.target.value)
              clearError('acquisition_source')
            }}
            placeholder="mis. Persembahan syukur Kel. Ndun-Dimu"
            autoComplete="off"
            aria-invalid={Boolean(errors.acquisition_source)}
            aria-describedby={describedBy(errors, 'acquisition_source')}
            className={inputClass}
          />
          <FieldError id="acquisition_source-error" messages={errors.acquisition_source} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="acquisition_year">Tahun perolehan</Label>
          <Input
            id="acquisition_year"
            inputMode="numeric"
            value={year}
            onChange={(event) => {
              setYear(event.target.value.replace(/\D/g, '').slice(0, 4))
              clearError('acquisition_year')
            }}
            placeholder={String(currentYear)}
            autoComplete="off"
            aria-invalid={Boolean(errors.acquisition_year)}
            aria-describedby={describedBy(errors, 'acquisition_year')}
            className={`${inputClass} tabular-nums`}
          />
          <FieldError id="acquisition_year-error" messages={errors.acquisition_year} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="estimated_value">Estimasi nilai</Label>
          <RupiahInput
            id="estimated_value"
            value={value}
            onChange={(next) => {
              setValue(next)
              clearError('estimated_value')
            }}
            invalid={Boolean(errors.estimated_value)}
            describedBy={describedBy(errors, 'estimated_value')}
          />
          <FieldError id="estimated_value-error" messages={errors.estimated_value} />
        </div>
      </FormSection>

      <div className="grid gap-2">
        <Label htmlFor="notes">Catatan & riwayat pemeliharaan</Label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value)
            clearError('notes')
          }}
          placeholder="mis. 12 Agu 2026: kabel daya diganti di Toko Elektronik Oebobo."
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
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : asset ? 'Simpan perubahan' : 'Tambah aset'}
        </Button>
      </DialogFooter>
    </form>
  )
}
