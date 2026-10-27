import { type ReactNode, useEffect, useState } from 'react'
import { Church, Database, RefreshCw, Server } from 'lucide-react'
import type { ApiList, HealthStatus, Rayon } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api'

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

function toLoadable<T>(result: PromiseSettledResult<T>): Loadable<T> {
  if (result.status === 'fulfilled') return { status: 'success', data: result.value }
  const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
  return { status: 'error', message }
}

// /api/health mengembalikan HealthStatus baik saat 200 maupun 503 (D1 bermasalah).
async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health')
  return (await res.json()) as HealthStatus
}

async function loadOverview() {
  const [healthResult, rayonResult] = await Promise.allSettled([
    fetchHealth(),
    apiGet<ApiList<Rayon>>('/rayons').then((res) => res.data),
  ])
  return { health: toLoadable(healthResult), rayons: toLoadable(rayonResult) }
}

export default function App() {
  const [health, setHealth] = useState<Loadable<HealthStatus>>({ status: 'loading' })
  const [rayons, setRayons] = useState<Loadable<Rayon[]>>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    void loadOverview().then((result) => {
      if (ignore) return
      setHealth(result.health)
      setRayons(result.rayons)
    })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function refresh() {
    setHealth({ status: 'loading' })
    setRayons({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Church className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">GMIT Jemaat</p>
            <h1 className="font-heading text-base leading-tight font-semibold">
              Lahairoi Tuak Sabu Lasiana
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Sistem</CardTitle>
            <CardDescription>
              Koneksi frontend React ke API Hono dan database Cloudflare D1.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StatusRow
              icon={<Server />}
              label="API Hono (Cloudflare Worker)"
              state={health.status === 'loading' ? 'loading' : health.status === 'success'}
              okText="Aktif"
            />
            <Separator />
            <StatusRow
              icon={<Database />}
              label="Database D1 (binding DB)"
              state={
                health.status === 'loading'
                  ? 'loading'
                  : health.status === 'success' && health.data.database === 'ok'
              }
              okText="Terhubung"
            />
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {health.status === 'success'
                ? `Diperiksa ${new Date(health.data.timestamp).toLocaleTimeString('id-ID')}`
                : health.status === 'error'
                  ? health.message
                  : 'Memeriksa…'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={health.status === 'loading'}
            >
              <RefreshCw data-icon="inline-start" />
              Periksa ulang
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rayon Pelayanan</CardTitle>
            <CardDescription>Data awal rayon dari tabel D1 `rayons`.</CardDescription>
          </CardHeader>
          <CardContent>
            {rayons.status === 'loading' && (
              <div className="grid gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            )}
            {rayons.status === 'error' && (
              <p className="text-sm text-destructive">
                {rayons.message}. Jalankan <code>npm run db:migrate:local</code> lalu muat ulang.
              </p>
            )}
            {rayons.status === 'success' && (
              <ol className="grid gap-2">
                {rayons.data.map((rayon) => (
                  <li
                    key={rayon.id}
                    className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                  >
                    <Badge variant="secondary">{rayon.id}</Badge>
                    <span className="font-medium">{rayon.name}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function StatusRow({
  icon,
  label,
  state,
  okText,
}: {
  icon: ReactNode
  label: string
  state: boolean | 'loading'
  okText: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-sm [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {state === 'loading' ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <Badge variant={state ? 'default' : 'destructive'}>{state ? okText : 'Gagal'}</Badge>
      )}
    </div>
  )
}
