import { useEffect, useState } from 'react'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import {
  ROLE_LABELS,
  type ApiList,
  type ApiPage,
  type AuditLogItem,
  type HealthStatus,
  type Rayon,
} from '@shared/types'
import { Can } from '@/components/session-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import { describeAudit } from '@/lib/audit-format'
import { formatRecent } from '@/lib/format'
import { dashboardPath, modulesForRole } from '@/lib/navigation'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'

type Loadable<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; message: string }

function settle<T>(result: PromiseSettledResult<T>): Loadable<T> {
  return result.status === 'fulfilled'
    ? { status: 'success', data: result.value }
    : { status: 'error', message: errorMessage(result.reason) }
}

// /api/health mengembalikan HealthStatus baik saat 200 maupun 503 (D1 bermasalah).
async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health')
  return (await res.json()) as HealthStatus
}

export default function OverviewPage() {
  const user = useCurrentUser()
  const modules = modulesForRole(user.role)
    .flatMap((group) => group.items)
    .filter((item) => item.path !== '')

  const [rayons, setRayons] = useState<Loadable<Rayon[]>>({ status: 'loading' })
  const [health, setHealth] = useState<Loadable<HealthStatus>>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      api.get<ApiList<Rayon>>('/rayons', { signal: controller.signal }).then((res) => res.data),
      fetchHealth(),
    ]).then(([rayonResult, healthResult]) => {
      if (controller.signal.aborted) return
      setRayons(settle(rayonResult))
      setHealth(settle(healthResult))
    })
    return () => controller.abort()
  }, [reloadKey])

  function recheck() {
    setHealth({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Ringkasan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GMIT Jemaat Lahairoi Tuak Sabu Lasiana · masuk sebagai {ROLE_LABELS[user.role]}
        </p>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="judul-modul" className="rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-4 px-5 pt-5 pb-2">
            <h2 id="judul-modul" className="text-base font-semibold">
              Modul untuk {ROLE_LABELS[user.role]}
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {modules.length} modul
            </span>
          </div>
          <ul>
            {modules.map((item) => (
              <li key={item.path} className="border-t border-rule first:border-t-0">
                <Link
                  to={dashboardPath(item)}
                  className="group grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-3.5 outline-offset-[-2px] hover:bg-muted/60"
                >
                  <item.icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
                    Fase {item.phase}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-4">
          <Can roles={['ADMIN']}>
            <RecentActivity />
          </Can>

          <section aria-labelledby="judul-rayon" className="grid gap-2">
            <h2 id="judul-rayon" className="text-base font-semibold">
              Rayon pelayanan
            </h2>
            <div className="rounded-lg border bg-card px-5 py-2">
              {rayons.status === 'loading' && (
                <ul aria-busy="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex h-11 items-center">
                      <Skeleton className="h-4 w-32" />
                    </li>
                  ))}
                </ul>
              )}
              {rayons.status === 'error' && (
                <p className="py-3 text-sm">
                  Data rayon tidak dapat dimuat: {rayons.message}{' '}
                  <button type="button" onClick={recheck} className="font-medium underline">
                    Coba lagi
                  </button>
                </p>
              )}
              {rayons.status === 'success' && (
                <ol>
                  {rayons.data.map((rayon) => (
                    <li
                      key={rayon.id}
                      className="flex h-11 items-center justify-between gap-3 border-t border-rule first:border-t-0"
                    >
                      <span className="text-sm font-medium">{rayon.name}</span>
                      <span className="truncate text-[0.8125rem] text-muted-foreground">
                        {rayon.coordinator_name ?? 'Koordinator —'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section aria-labelledby="judul-status" className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <h2 id="judul-status" className="text-base font-semibold">
                Status sistem
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={recheck}
                disabled={health.status === 'loading'}
                className="-mr-2 text-muted-foreground"
              >
                <RefreshCw data-icon="inline-start" />
                Periksa ulang
              </Button>
            </div>
            <dl className="rounded-lg border bg-card px-5 py-2 text-sm">
              <StatusRow label="API (Cloudflare Worker)" state={healthState(health, 'api')} />
              <StatusRow label="Database D1" state={healthState(health, 'database')} />
            </dl>
            <p className="text-xs text-muted-foreground">
              {health.status === 'success'
                ? `Diperiksa ${new Date(health.data.timestamp).toLocaleTimeString('id-ID')}`
                : health.status === 'error'
                  ? health.message
                  : 'Memeriksa…'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

// Khusus Admin: lima aktivitas terakhir, dengan tautan ke Log Aktivitas lengkap.
function RecentActivity() {
  const logs = useApiQuery<ApiPage<AuditLogItem>>('/audit-logs', { per_page: 5 })

  return (
    <section aria-labelledby="judul-aktivitas" className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="judul-aktivitas" className="text-base font-semibold">
          Aktivitas terbaru
        </h2>
        <Link
          to="/dashboard/audit-logs"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Lihat semua
        </Link>
      </div>
      <div className="rounded-lg border bg-card px-5 py-1">
        {logs.error && !logs.data && (
          <p className="py-3 text-sm">
            Log Aktivitas tidak dapat dimuat: {logs.error}{' '}
            <button type="button" onClick={logs.reload} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        )}
        {!logs.data && !logs.error && (
          <ul aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="grid gap-1.5 border-t border-rule py-3 first:border-t-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </li>
            ))}
          </ul>
        )}
        {logs.data && logs.data.data.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
        )}
        {logs.data && logs.data.data.length > 0 && (
          <ol>
            {logs.data.data.map((item) => {
              const { summary, flag } = describeAudit(item)
              return (
                <li
                  key={item.id}
                  className="grid gap-0.5 border-t border-rule py-3 first:border-t-0"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="truncate">{summary}</span>
                    {flag && (
                      <span className="flex-none rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium text-negative-ink">
                        {flag}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {item.user_name ?? 'Tanpa akun'} · {formatRecent(item.created_at)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

type RowState = 'loading' | 'ok' | 'down'

function healthState(health: Loadable<HealthStatus>, part: 'api' | 'database'): RowState {
  if (health.status === 'loading') return 'loading'
  if (health.status === 'error') return 'down'
  if (part === 'api') return 'ok'
  return health.data.database === 'ok' ? 'ok' : 'down'
}

function StatusRow({ label, state }: { label: string; state: RowState }) {
  return (
    <div className="flex h-11 items-center justify-between gap-3 border-t border-rule first:border-t-0">
      <dt>{label}</dt>
      <dd>
        {state === 'loading' ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <span
            className={
              state === 'ok'
                ? 'rounded-full bg-positive-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-positive-ink'
                : 'rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-negative-ink'
            }
          >
            {state === 'ok' ? 'Berjalan' : 'Gagal'}
          </span>
        )}
      </dd>
    </div>
  )
}
