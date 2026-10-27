import { useDeferredValue, useId, useState } from 'react'
import { Search } from 'lucide-react'
import type { ApiPage, Family } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { familyName, type FamilyChoice } from '@/lib/congregation'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'
import { inputClass } from '@/lib/form'

// Memilih KK untuk anggota jemaat: KK terpilih tampil sebagai kartu; "Ganti" membuka
// pencarian nomor KK, nama kepala keluarga, atau nama anggotanya.
export function FamilyPicker({
  value,
  onChange,
  invalid,
  describedById,
}: {
  value: FamilyChoice | null
  onChange: (family: FamilyChoice | null) => void
  invalid?: boolean
  describedById?: string
}) {
  const [searching, setSearching] = useState(value === null)
  const [term, setTerm] = useState('')
  const deferredTerm = useDeferredValue(term.trim())
  const listId = useId()
  const results = useApiQuery<ApiPage<Family>>(searching ? '/families' : null, {
    q: deferredTerm,
    per_page: 6,
  })

  if (value && !searching) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-card px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{familyName(value)}</p>
          <p className="text-[0.8125rem] text-muted-foreground">Rayon {value.rayon_name}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setSearching(true)}>
          Ganti
        </Button>
      </div>
    )
  }

  const families = results.data?.data ?? []
  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="family_id"
          name="family_search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Cari nomor KK, kepala keluarga, atau anggota"
          autoComplete="off"
          aria-controls={listId}
          aria-invalid={invalid}
          aria-describedby={describedById}
          className={cn(inputClass, 'pl-9')}
        />
      </div>
      <ul
        id={listId}
        aria-label="Hasil pencarian KK"
        aria-busy={results.loading}
        className="grid max-h-56 overflow-y-auto rounded-lg border bg-card"
      >
        {results.error && <li className="px-3 py-2.5 text-muted-foreground">{results.error}</li>}
        {!results.error && results.data && families.length === 0 && (
          <li className="px-3 py-2.5 text-muted-foreground">
            Tidak ada KK yang cocok. Tambahkan KK-nya dulu di halaman Kartu Keluarga.
          </li>
        )}
        {!results.data && !results.error && (
          <li className="px-3 py-2.5 text-muted-foreground">Memuat KK…</li>
        )}
        {families.map((family) => (
          <li key={family.id} className="border-t border-rule first:border-t-0">
            <button
              type="button"
              onClick={() => {
                onChange(family)
                setSearching(false)
                setTerm('')
              }}
              className="grid w-full gap-0.5 px-3 py-2 text-left outline-offset-[-2px] hover:bg-muted/60"
            >
              <span className="truncate text-sm font-medium">{familyName(family)}</span>
              <span className="text-[0.8125rem] text-muted-foreground">
                Rayon {family.rayon_name} · {family.member_count} jiwa aktif
                {family.address && ` · ${family.address}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {value && (
        <Button
          type="button"
          variant="ghost"
          className="justify-self-start"
          onClick={() => setSearching(false)}
        >
          Batal ganti, tetap di {familyName(value)}
        </Button>
      )}
    </div>
  )
}
