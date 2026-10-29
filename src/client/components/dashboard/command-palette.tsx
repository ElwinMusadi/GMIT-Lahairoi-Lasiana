import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { House, Search, Users, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/zenith/kbd'
import { dashboardPath, modulesForRole, quickActionsForRole } from '@/lib/navigation'
import { useCurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'

type Entry = {
  group: string
  title: string
  hint?: string
  to: string
  icon: LucideIcon
  keywords: string
}

// Palet perintah Ctrl+K / ⌘K bergaya Zenith (pola HRIS): halaman yang boleh dibuka peran ini,
// aksi "Buat", dan pencarian anggota jemaat atau Kartu Keluarga. Panah memilih, Enter
// membuka, Esc menutup.
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const groups = useMemo(() => modulesForRole(user.role), [user.role])
  const entries = useMemo<Entry[]>(
    () => [
      ...groups.flatMap((group) =>
        group.items.map((item) => ({
          group: 'Halaman',
          title: item.title,
          hint: group.label,
          to: dashboardPath(item),
          icon: item.icon,
          keywords: `${item.title} ${group.label} ${item.description}`.toLowerCase(),
        })),
      ),
      ...quickActionsForRole(user.role).map((action) => ({
        group: 'Buat',
        title: action.title,
        to: action.to,
        icon: action.icon,
        keywords: `buat tambah ${action.title}`.toLowerCase(),
      })),
    ],
    [groups, user.role],
  )

  const text = query.trim()
  const canSee = (path: string) =>
    groups.some((group) => group.items.some((item) => item.path === path))
  const items: Entry[] = [
    ...(text ? entries.filter((entry) => entry.keywords.includes(text.toLowerCase())) : entries),
    ...(text && canSee('members')
      ? [
          {
            group: 'Cari',
            title: `Cari anggota jemaat “${text}”`,
            to: `/dashboard/members?q=${encodeURIComponent(text)}`,
            icon: Users,
            keywords: '',
          },
        ]
      : []),
    ...(text && canSee('families')
      ? [
          {
            group: 'Cari',
            title: `Cari Kartu Keluarga “${text}”`,
            to: `/dashboard/families?q=${encodeURIComponent(text)}`,
            icon: House,
            keywords: '',
          },
        ]
      : []),
  ]

  // Pilihan tetap terlihat saat bergulir dengan panah.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function go(entry: Entry | undefined) {
    if (!entry) return
    onOpenChange(false)
    setQuery('')
    navigate(entry.to)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (items.length ? (index + step + items.length) % items.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(items[active])
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value)
        if (!value) setQuery('')
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Cari halaman, aksi, atau jemaat</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari halaman, aksi, atau anggota jemaat…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="Hasil"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {items.map((entry, index) => (
            <div key={`${entry.group}-${entry.to}`} role="presentation">
              {entry.group !== items[index - 1]?.group && (
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  {entry.group}
                </p>
              )}
              <div
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                data-index={index}
                onMouseMove={() => setActive(index)}
                onClick={() => go(entry)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm',
                  index === active && 'bg-accent text-accent-foreground',
                )}
              >
                <entry.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                {entry.hint && <span className="text-xs text-muted-foreground">{entry.hint}</span>}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="px-2 py-10 text-center text-sm text-muted-foreground">
              Tidak ada yang cocok.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> pilih
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd> buka
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> tutup
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
