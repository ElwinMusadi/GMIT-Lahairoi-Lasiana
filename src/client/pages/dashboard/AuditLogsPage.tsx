import { useState } from 'react'
import { ListFilter, RefreshCw, X, type LucideIcon } from 'lucide-react'
import {
  ROLE_LABELS,
  type ApiList,
  type ApiPage,
  type AuditLogItem,
  type UserListItem,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SkeletonRows,
  TableCard,
  TableMessage,
  TablePagination,
  selectClass,
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { StatusBadge } from '@/components/zenith/status-badge'
import { ACTION_LABELS, ENTITY_LABELS, auditIcon, describeAudit } from '@/lib/audit-format'
import { formatDayHeading, formatTime, witaDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'

const PER_PAGE = 50
const FILTER_KEYS = ['from', 'to', 'action', 'entity_type', 'user_id', 'entity_id'] as const

// Log Aktivitas (khusus Admin): siapa mengubah apa, dan kapan. Filter disimpan di URL
// agar bisa dibagikan dan tombol Kembali di browser berfungsi. Tabel bergaya Zenith:
// filter di bilah alat, baris dikelompokkan per hari (WITA).
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

  const clearAll = () => setParams(new URLSearchParams())

  const result = logs.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  // Baris dikelompokkan per hari (WITA); tiap hari menjadi satu kelompok baris berjudul.
  const days: { date: string; items: AuditLogItem[] }[] = []
  for (const item of items) {
    const date = witaDate(new Date(item.created_at))
    const group = days.at(-1)
    if (group?.date === date) group.items.push(item)
    else days.push({ date, items: [item] })
  }
  const userOptions = [...(users.data?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const entityFocus = filters.entity_id
    ? filters.entity_type === 'users'
      ? (userOptions.find((user) => String(user.id) === filters.entity_id)?.name ??
        `akun #${filters.entity_id}`)
      : `${ENTITY_LABELS[filters.entity_type] ?? 'data'} #${filters.entity_id}`
    : null
  const bodyClass = cn('transition-opacity', logs.loading && result && 'opacity-60')

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Log Aktivitas"
        description={
          failed.data ? (
            failed.data.meta.total > 0 ? (
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
            )
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <Button variant="outline" size="lg" onClick={reloadAll} disabled={logs.loading}>
            <RefreshCw data-icon="inline-start" className={cn(logs.loading && 'animate-spin')} />
            Muat ulang
          </Button>
        }
      />

      <TableCard
        aria-label="Log Aktivitas"
        toolbar={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                className="md:hidden"
                aria-expanded={showFilters}
                aria-controls="filter-log"
                onClick={() => setShowFilters((shown) => !shown)}
              >
                <ListFilter data-icon="inline-start" />
                Filter{activeFilters > 0 && ` (${activeFilters})`}
              </Button>
              {/* Di ponsel filter dilipat di balik tombol Filter; di layar lebar selalu tampil. */}
              <div
                id="filter-log"
                role="group"
                aria-label="Filter"
                className={cn(
                  'grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap',
                  !showFilters && 'hidden md:flex',
                )}
              >
                {/* Tanpa label di atas kontrol: tanda pisah di antara dua tanggal sudah
                    membacakan rentang, label lengkapnya ada di aria-label. */}
                <div
                  role="group"
                  aria-label="Rentang tanggal"
                  className="col-span-2 flex items-center gap-2"
                >
                  <input
                    type="date"
                    aria-label="Dari tanggal"
                    value={filters.from}
                    max={filters.to || today}
                    onChange={(event) => update({ from: event.target.value })}
                    className={cn(selectClass, 'flex-1 tabular-nums md:w-36 md:flex-none')}
                  />
                  <span aria-hidden="true" className="text-muted-foreground">
                    –
                  </span>
                  <input
                    type="date"
                    aria-label="Sampai tanggal"
                    value={filters.to}
                    min={filters.from || undefined}
                    max={today}
                    onChange={(event) => update({ to: event.target.value })}
                    className={cn(selectClass, 'flex-1 tabular-nums md:w-36 md:flex-none')}
                  />
                </div>
                <select
                  aria-label="Aksi"
                  value={filters.action}
                  onChange={(event) => update({ action: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Semua aksi</option>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Jenis data"
                  value={filters.entity_type}
                  onChange={(event) => update({ entity_type: event.target.value, entity_id: '' })}
                  className={selectClass}
                >
                  <option value="">Semua data</option>
                  {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Pengguna"
                  value={filters.user_id}
                  onChange={(event) => update({ user_id: event.target.value })}
                  className={cn(selectClass, 'col-span-2 md:max-w-56')}
                >
                  <option value="">Semua pengguna</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.is_active ? '' : ' (nonaktif)'}
                    </option>
                  ))}
                </select>
              </div>
              {activeFilters > 0 && (
                <Button variant="ghost" size="lg" onClick={clearAll}>
                  <X data-icon="inline-start" />
                  Hapus filter
                </Button>
              )}
            </div>
            {entityFocus && (
              <p className="flex items-center gap-1 text-sm">
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
          </>
        }
        footer={
          result && (
            <TablePagination
              label="Halaman Log Aktivitas"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="aktivitas"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={logs.loading}>
          <caption className="sr-only">Log Aktivitas, terbaru di atas</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Aktivitas</TableHead>
              <TableHead className="hidden w-48 sm:table-cell">Pengguna</TableHead>
              <TableHead className="w-24 text-right">Jam (WITA)</TableHead>
            </TableRow>
          </TableHeader>
          {logs.error ? (
            <TableBody>
              <TableMessage colSpan={3}>
                Log Aktivitas tidak dapat dimuat: {logs.error}{' '}
                <button type="button" onClick={logs.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            </TableBody>
          ) : !result ? (
            <TableBody>
              <SkeletonRows avatar={false} cells={['', 'hidden sm:table-cell', '']} />
            </TableBody>
          ) : items.length === 0 ? (
            <TableBody>
              <TableMessage colSpan={3}>
                {activeFilters > 0 ? (
                  <>
                    Tidak ada aktivitas yang cocok dengan filter ini.{' '}
                    <button type="button" className="font-medium underline" onClick={clearAll}>
                      Hapus filter
                    </button>
                  </>
                ) : (
                  'Belum ada aktivitas yang tercatat.'
                )}
              </TableMessage>
            </TableBody>
          ) : (
            days.map((day) => (
              <TableBody key={day.date} className={bodyClass}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <th
                    scope="rowgroup"
                    colSpan={3}
                    className="px-4 py-2 text-left text-[0.8125rem] font-semibold"
                  >
                    {formatDayHeading(day.items[0].created_at)}
                  </th>
                </TableRow>
                {day.items.map((item) => (
                  <LogRow key={item.id} item={item} icon={auditIcon(item)} />
                ))}
              </TableBody>
            ))
          )}
        </Table>
      </TableCard>
    </div>
  )
}

function LogRow({ item, icon: Icon }: { item: AuditLogItem; icon: LucideIcon }) {
  const { summary, detail, flag } = describeAudit(item)
  const actor = item.user_name ?? 'Tanpa akun'

  return (
    <TableRow className="[&>td]:align-top">
      <TableCell>
        {/* Ikon modul polos (tanpa kotak) agar baris mudah dipindai per modul. */}
        <div className="flex min-w-0 gap-3">
          <Icon
            aria-hidden="true"
            className={cn(
              'mt-0.5 size-4 shrink-0',
              flag ? 'text-destructive' : 'text-muted-foreground',
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium break-words">{summary}</span>
              {flag && (
                <StatusBadge tone="danger" className="flex-none">
                  {flag}
                </StatusBadge>
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
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span
          className={cn(
            'block break-words lg:truncate',
            !item.user_name && 'text-muted-foreground',
          )}
        >
          {actor}
        </span>
        {item.user_role && (
          <span className="block text-[0.8125rem] text-muted-foreground">
            {ROLE_LABELS[item.user_role]}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
        {formatTime(item.created_at)}
      </TableCell>
    </TableRow>
  )
}
