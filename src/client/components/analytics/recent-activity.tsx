import { History, LogIn, LogOut, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { ApiPage, AuditLogItem } from '@shared/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel, PanelLink } from '@/components/zenith/panel'
import { StatusBadge } from '@/components/zenith/status-badge'
import { describeAudit } from '@/lib/audit-format'
import { formatRecent } from '@/lib/format'
import { allModules } from '@/lib/navigation'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Tabel audit → modul dashboard, untuk ikon tiap aktivitas (sama dengan ikon di sidebar).
const ENTITY_MODULE: Record<string, string> = {
  users: 'users',
  rayons: 'rayons',
  families: 'families',
  members: 'members',
  finance_funds: 'finance/budgets',
  finance_budgets: 'finance/budgets',
  finance_transactions: 'finance/transactions',
  public_contents: 'contents',
  worship_schedules: 'worships',
  worship_servants: 'worships',
  sacrament_applications: 'sacraments',
  mail_archives: 'mails',
  assets: 'assets',
  asset_loans: 'assets',
}

function activityIcon(item: AuditLogItem): LucideIcon {
  if (item.action === 'LOGIN') return LogIn
  if (item.action === 'LOGOUT') return LogOut
  if (item.action.startsWith('LOGIN_')) return ShieldAlert
  const path = ENTITY_MODULE[item.entity_type]
  return allModules.find((module) => module.path === path)?.icon ?? History
}

// Khusus Admin: linimasa lima aktivitas terakhir (Zenith "Recent activity"), dengan tautan
// ke Log Aktivitas lengkap. Ikonnya mengikuti ikon modul di sidebar.
export function RecentActivity({ className }: { className?: string }) {
  const logs = useApiQuery<ApiPage<AuditLogItem>>('/audit-logs', { per_page: 5 })

  return (
    <Panel
      title="Aktivitas terbaru"
      description="Perubahan data dan akses dashboard"
      action={<PanelLink to="/dashboard/audit-logs">Lihat semua</PanelLink>}
      className={className}
      contentClassName="min-h-0 flex-1 overflow-y-auto"
    >
      {logs.error && !logs.data && (
        <p className="text-sm">
          Log Aktivitas tidak dapat dimuat: {logs.error}{' '}
          <button type="button" onClick={logs.reload} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      )}
      {!logs.data && !logs.error && (
        <ul aria-busy="true" className="grid gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex gap-3">
              <Skeleton className="size-4 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {logs.data && logs.data.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
      )}
      {logs.data && logs.data.data.length > 0 && (
        <ol>
          {logs.data.data.map((item) => {
            const { summary, flag } = describeAudit(item)
            const Icon = activityIcon(item)
            return (
              // Linimasa: ikon polos di rel kiri, disambung garis tipis ke aktivitas berikutnya.
              <li
                key={item.id}
                className="relative flex gap-3 pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-6 [&:not(:last-child)]:before:bottom-1 [&:not(:last-child)]:before:left-2 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    flag ? 'text-destructive' : 'text-muted-foreground',
                  )}
                />
                <div className="grid min-w-0 gap-0.5">
                  <p className="line-clamp-2 text-sm font-medium">
                    {summary}
                    {flag && (
                      <>
                        {' '}
                        <StatusBadge tone="danger" className="align-middle">
                          {flag}
                        </StatusBadge>
                      </>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.user_name ?? 'Tanpa akun'} · {formatRecent(item.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
