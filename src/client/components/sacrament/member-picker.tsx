import { useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  MARRIAGE_STATUS_LABELS,
  type ApiPage,
  type MemberWithFamily,
  type SacramentType,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { formatLongDate } from '@/lib/finance'
import { inputClass } from '@/lib/form'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

export type PickedMember = { id: number; name: string }

// Status sakramen anggota yang relevan untuk layanan ini, agar Pendeta tidak menautkan
// orang yang sudah tercatat menerimanya.
function sacramentNote(member: MemberWithFamily, type: SacramentType) {
  if (type === 'BAPTISM') {
    return member.baptism_status
      ? `Sudah dibaptis${member.baptism_date ? ` ${formatLongDate(member.baptism_date)}` : ''}`
      : 'Belum dibaptis'
  }
  if (type === 'SIDI') {
    return member.sidi_status
      ? `Sudah sidi${member.sidi_date ? ` ${formatLongDate(member.sidi_date)}` : ''}`
      : 'Belum sidi'
  }
  return member.marriage_status ? MARRIAGE_STATUS_LABELS[member.marriage_status] : 'Status nikah —'
}

// Menautkan pendaftaran ke anggota jemaat aktif (pencarian nama di data jemaat).
export function MemberPicker({
  id,
  label,
  type,
  value,
  initialQuery,
  onChange,
  error,
}: {
  id: string
  label: string
  type: SacramentType
  value: PickedMember | null
  initialQuery: string
  onChange: (member: PickedMember | null) => void
  error?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [debounced, setDebounced] = useState(initialQuery)
  const timer = useRef<number | undefined>(undefined)
  const searching = !value && debounced.trim().length >= 2
  const results = useApiQuery<ApiPage<MemberWithFamily>>(searching ? '/members' : null, {
    q: debounced.trim(),
    status: 'ACTIVE',
    per_page: 6,
  })

  function handleQuery(text: string) {
    setQuery(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDebounced(text), 300)
  }

  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </span>
      {value ? (
        <div className="flex items-center gap-2.5 rounded-lg border py-1.5 pr-1.5 pl-2">
          <PersonAvatar name={value.name} className="size-7" />
          <span className="min-w-0 flex-1 text-sm font-medium break-words">{value.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X />
            <span className="sr-only">Lepas tautan {value.name}</span>
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={id}
              type="search"
              value={query}
              onChange={(event) => handleQuery(event.target.value)}
              placeholder="Cari nama di data jemaat"
              autoComplete="off"
              aria-labelledby={`${id}-label`}
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          {searching && (
            <div aria-live="polite" className="overflow-hidden rounded-lg border">
              {!results.data ? (
                <p className="px-3 py-2 text-[0.8125rem] text-muted-foreground">Mencari…</p>
              ) : results.data.data.length === 0 ? (
                <p className="px-3 py-2 text-[0.8125rem] text-muted-foreground">
                  Tidak ada anggota aktif bernama “{debounced.trim()}”. Pendaftaran tetap bisa
                  diselesaikan tanpa tautan.
                </p>
              ) : (
                <ul className="divide-y">
                  {results.data.data.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        onClick={() => onChange({ id: member.id, name: member.full_name })}
                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                      >
                        <PersonAvatar name={member.full_name} className="mt-0.5 size-7" />
                        <span className="grid min-w-0 gap-0.5">
                          <span className="text-sm font-medium">{member.full_name}</span>
                          <span className="text-[0.8125rem] text-muted-foreground">
                            Rayon {member.rayon_name} · KK {member.family_head_name}
                            {member.birth_date &&
                              ` · lahir ${formatLongDate(member.birth_date)}`} ·{' '}
                            {sacramentNote(member, type)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <p id={errorId} className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
