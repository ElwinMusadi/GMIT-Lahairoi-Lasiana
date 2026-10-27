import { Fragment, useState, type ReactNode } from 'react'
import { ListFilter, RefreshCw, X } from 'lucide-react'
import {
  ROLE_LABELS,
  type ApiList,
  type ApiPage,
  type AuditLogItem,
  type UserListItem,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ACTION_LABELS, ENTITY_LABELS, describeAudit } from '@/lib/audit-format'
import { formatDayHeading, formatTime, witaDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'

const PER_PAGE = 50
const FILTER_KEYS = ['from', 'to', 'action', 'entity_type', 'user_id', 'entity_id'] as const

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Log Aktivitas (khusus Admin): siapa mengubah apa, dan kapan. Filter disimpan di URL
// agar bisa dibagikan dan tombol Kembali di browser berfungsi.
export default function AuditLogsPage() {
  const { params, setParams, update } = useUrlFilters()
  const [showFilters, setShowFilters] = useState(false)
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? '']))
  const page = Math.max(1, Number(params.get('page')) || 1)
  const activeFilters = FILTER_KEYS.filter((key) => filters[key]).length

  const logs = useApiQuery<ApiPage<AuditLogItem>>('/audit-logs', {
    ...filters,
    page,
    per_page: PER_PAGE,
  })
  const users = useApiQuery<ApiList<UserListItem>>('/users')
  // Temuan di bawah judul: percobaan masuk yang gagal dalam 7 hari terakhir (hari ini termasuk).
  const [{ today, weekStart }] = useState(() => ({
    today: witaDate(),
    weekStart: witaDate(new Date(Date.now() - 6 * 86_400_000)),
  }))
  const failed = useApiQuery<ApiPage<AuditLogItem>>('/audit-logs', {
    action: 'LOGIN_FAILED',
    from: weekStart,
    per_page: 1,
  })

  function reloadAll() {
    logs.reload()
    failed.reload()
  }

  const result = logs.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const userOptions = [...(users.data?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const entityFocus = filters.entity_id
    ? filters.entity_type === 'users'
      ? (userOptions.find((user) => String(user.id) === filters.entity_id)?.name ??
        `akun #${filters.entity_id}`)
      : `${ENTITY_LABELS[filters.entity_type] ?? 'data'} #${filters.entity_id}`
    : null

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Log Aktivitas</h1>
          {failed.data ? (
            <p className="text-sm text-muted-foreground">
              {failed.data.meta.total > 0 ? (
                <>
                  <span className="font-medium text-foreground tabular-nums">
                    {failed.data.meta.total} percobaan masuk gagal
                  </span>{' '}
                  dalam 7 hari terakhir ·{' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-4"
                    onClick={() =>
                      setParams(new URLSearchParams({ action: 'LOGIN_FAILED', from: weekStart }))
                    }
                  >
                    Tampilkan
                  </button>
                </>
              ) : (
                'Tidak ada percobaan masuk yang gagal dalam 7 hari terakhir.'
              )}
            </p>
          ) : (
            <Skeleton className="h-5 w-72" />
          )}
        </div>
        <Button
          variant="ghost"
          size="lg"
          onClick={reloadAll}
          disabled={logs.loading}
          className="mt-1 text-muted-foreground max-sm:size-9"
        >
          <RefreshCw data-icon="inline-start" className={cn(logs.loading && 'animate-spin')} />
          <span className="sr-only sm:not-sr-only">Muat ulang</span>
        </Button>
      </header>

      <section aria-label="Filter" className="grid gap-3">
        <Button
          variant="outline"
          size="lg"
          className="justify-self-start md:hidden"
          aria-expanded={showFilters}
          aria-controls="filter-log"
          onClick={() => setShowFilters((shown) => !shown)}
        >
          <ListFilter data-icon="inline-start" />
          Filter{activeFilters > 0 && ` (${activeFilters})`}
        </Button>
        <div
          id="filter-log"
          className={cn(
            'grid grid-cols-2 items-end gap-3 md:grid md:grid-cols-[repeat(2,9.5rem)_repeat(3,minmax(0,13rem))_auto]',
            !showFilters && 'hidden',
          )}
        >
          <FilterField id="filter-from" label="Dari tanggal">
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              max={filters.to || today}
              onChange={(event) => update({ from: event.target.value })}
              className={controlClass}
            />
          </FilterField>
          <FilterField id="filter-to" label="Sampai tanggal">
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              max={today}
              onChange={(event) => update({ to: event.target.value })}
              className={controlClass}
            />
          </FilterField>
          <FilterField id="filter-action" label="Aksi">
            <select
              id="filter-action"
              value={filters.action}
              onChange={(event) => update({ action: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua aksi</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-entity" label="Data">
            <select
              id="filter-entity"
              value={filters.entity_type}
              onChange={(event) => update({ entity_type: event.target.value, entity_id: '' })}
              className={controlClass}
            >
              <option value="">Semua data</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-user" label="Pengguna">
            <select
              id="filter-user"
              value={filters.user_id}
              onChange={(event) => update({ user_id: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua pengguna</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {user.is_active ? '' : ' (nonaktif)'}
                </option>
              ))}
            </select>
          </FilterField>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="lg"
              className="justify-self-start"
              onClick={() => setParams(new URLSearchParams())}
            >
              Hapus filter
            </Button>
          )}
        </div>
        {entityFocus && (
          <p className="flex items-center gap-2 text-sm">
            <span>
              Riwayat <span className="font-medium">{entityFocus}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => update({ entity_id: '' })}
              className="text-muted-foreground"
            >
              <X />
              <span className="sr-only">
                Tampilkan semua {ENTITY_LABELS[filters.entity_type] ?? 'data'}
              </span>
            </Button>
          </p>
        )}
      </section>

      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm" aria-busy={logs.loading}>
          <caption className="sr-only">Log Aktivitas, terbaru di atas</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th
                scope="col"
                className="sticky top-0 z-10 h-10 rounded-tl-lg bg-card pr-4 pl-4 font-normal"
              >
                Aktivitas
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 hidden w-48 bg-card pr-4 font-normal sm:table-cell"
              >
                Pengguna
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 w-24 rounded-tr-lg bg-card pr-4 text-right font-normal"
              >
                Jam (WITA)
              </th>
            </tr>
          </thead>
          <tbody className={cn('transition-opacity', logs.loading && result && 'opacity-60')}>
            {logs.error && (
              <MessageRow>
                Log Aktivitas tidak dapat dimuat: {logs.error}{' '}
                <button type="button" onClick={logs.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </MessageRow>
            )}
            {!result &&
              !logs.error &&
              Array.from({ length: 6 }, (_, index) => <SkeletonRow key={index} />)}
            {result && !logs.error && items.length === 0 && (
              <MessageRow>
                {activeFilters > 0 ? (
                  <>
                    Tidak ada aktivitas yang cocok dengan filter ini.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => setParams(new URLSearchParams())}
                    >
                      Hapus filter
                    </button>
                  </>
                ) : (
                  'Belum ada aktivitas yang tercatat.'
                )}
              </MessageRow>
            )}
            {!logs.error &&
              items.map((item, index) => {
                // Baris dikelompokkan per hari (WITA); judul hari muncul saat tanggalnya berganti.
                const day = witaDate(new Date(item.created_at))
                const newDay =
                  index === 0 || day !== witaDate(new Date(items[index - 1].created_at))
                return (
                  <Fragment key={item.id}>
                    {newDay && (
                      <tr className="border-t border-rule">
                        <th
                          scope="colgroup"
                          colSpan={3}
                          className="px-4 pt-4 pb-1 text-left text-[0.8125rem] font-medium"
                        >
                          {formatDayHeading(item.created_at)}
                        </th>
                      </tr>
                    )}
                    <LogRow item={item} />
                  </Fragment>
                )
              })}
          </tbody>
        </table>

        {result && total > 0 && (
          <nav
            aria-label="Halaman Log Aktivitas"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')} aktivitas
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                disabled={last >= total}
                onClick={() => update({ page: String(page + 1) })}
              >
                Berikutnya
              </Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}

function LogRow({ item }: { item: AuditLogItem }) {
  const { summary, detail, flag } = describeAudit(item)
  const actor = item.user_name ?? 'Tanpa akun'

  return (
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{summary}</span>
          {flag && (
            <span className="flex-none rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-negative-ink">
              {flag}
            </span>
          )}
        </div>
        {/* Di ponsel kolom Pengguna disembunyikan; namanya pindah ke baris kedua. */}
        <p
          className={cn(
            'mt-0.5 text-[0.8125rem] break-words text-muted-foreground',
            !detail && 'sm:hidden',
          )}
        >
          <span className="sm:hidden">
            {actor}
            {detail && ' · '}
          </span>
          {detail}
        </p>
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        <span className={cn('block truncate', !item.user_name && 'text-muted-foreground')}>
          {actor}
        </span>
        {item.user_role && (
          <span className="block text-[0.8125rem] text-muted-foreground">
            {ROLE_LABELS[item.user_role]}
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-right whitespace-nowrap text-muted-foreground tabular-nums">
        {formatTime(item.created_at)}
      </td>
    </tr>
  )
}

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={3} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-40" />
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        <Skeleton className="h-5 w-28" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="ml-auto h-5 w-20" />
      </td>
    </tr>
  )
}
