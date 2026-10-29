import { useState, type FormEvent } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  PORTAL_THEMES,
  PORTAL_THEME_LABELS,
  type PortalThemeCode,
  type SiteSettingsResponse,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/zenith/page-header'
import { Panel } from '@/components/zenith/panel'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import { apiFailure } from '@/lib/contents'
import { formatDate, formatTime } from '@/lib/format'
import { CHURCH_PHOTO } from '@/lib/portal'
import { refreshPortalThemeCode } from '@/lib/portal-theme'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Pengaturan > Tampilan (khusus Admin): tema Portal Publik untuk semua pengunjung. Pilihan
// terang/gelap tetap milik tiap pengunjung, di kedua tema.

const THEME_NOTES: Record<PortalThemeCode, string> = {
  DEFAULT: 'Kanvas putih bersih, panel hitam pekat, dan pil kaca tipis. Rancangan asli portal.',
  GLASS:
    'Panel kaca buram melayang di atas latar warna senja Pantai Lasiana. Lebih berwarna dan berlapis.',
}

export default function AppearanceSettingsPage() {
  const query = useApiQuery<SiteSettingsResponse>('/settings')
  const settings = query.data?.settings
  // null: belum diubah di halaman ini, jadi mengikuti nilai tersimpan.
  const [choice, setChoice] = useState<PortalThemeCode | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const saved = settings?.portal_theme
  const selected = choice ?? saved
  const dirty = selected !== undefined && selected !== saved

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dirty || !selected) return
    setSaving(true)
    setFormError(null)
    try {
      const { settings: next } = await api.put<SiteSettingsResponse>('/settings', {
        portal_theme: selected,
      })
      refreshPortalThemeCode(next.portal_theme)
      setChoice(null)
      query.reload()
      toast.success(`Tema Portal Publik kini ${PORTAL_THEME_LABELS[next.portal_theme]}.`, {
        description: 'Pengunjung melihatnya saat membuka portal atau memuat ulang halaman.',
      })
    } catch (err) {
      setFormError(apiFailure(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tampilan"
        description="Atur tampilan Portal Publik. Perubahan berlaku untuk semua pengunjung."
        actions={
          <Button variant="outline" size="lg" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              Buka portal
              <span className="sr-only"> (membuka tab baru)</span>
            </a>
          </Button>
        }
      />

      {query.error && !settings && (
        <div role="alert" className="rounded-xl border bg-card px-5 py-4 text-sm">
          Pengaturan tidak dapat dimuat: {query.error}{' '}
          <button type="button" onClick={query.reload} className="font-medium underline">
            Coba lagi
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Panel
          title="Tema Portal Publik"
          description="Pengunjung tetap bisa memilih tema terang atau gelap di kedua tema."
          busy={query.loading && settings !== undefined}
          contentClassName="grid gap-5"
        >
          <fieldset disabled={!settings || saving} className="min-w-0">
            <legend className="sr-only">Tema Portal Publik</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {PORTAL_THEMES.map((code) =>
                settings ? (
                  <ThemeOption
                    key={code}
                    code={code}
                    checked={selected === code}
                    current={saved === code}
                    onSelect={() => setChoice(code)}
                  />
                ) : (
                  <Skeleton key={code} className="aspect-[16/13] rounded-xl" />
                ),
              )}
            </div>
          </fieldset>

          <div role="alert" aria-live="assertive" className="empty:hidden">
            {formError && (
              <p className="rounded-xl border border-destructive/40 bg-negative-soft px-4 py-3 text-sm text-negative-ink">
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {settings ? (
              <p className="text-sm text-muted-foreground">
                {settings.updated_at
                  ? `Terakhir diubah ${formatDate(settings.updated_at)} pukul ${formatTime(settings.updated_at)}${settings.updated_by_name ? ` oleh ${settings.updated_by_name}` : ''}.`
                  : 'Belum pernah diubah; portal memakai tema bawaan.'}
              </p>
            ) : (
              <Skeleton className="h-4 w-56" />
            )}
            <div className="flex items-center gap-2">
              {dirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => setChoice(null)}
                  disabled={saving}
                >
                  Batalkan
                </Button>
              )}
              <Button type="submit" size="lg" disabled={!dirty || saving}>
                {saving ? 'Menyimpan…' : 'Simpan tema'}
              </Button>
            </div>
          </div>
        </Panel>
      </form>
    </div>
  )
}

function ThemeOption({
  code,
  checked,
  current,
  onSelect,
}: {
  code: PortalThemeCode
  checked: boolean
  current: boolean
  onSelect: () => void
}) {
  const id = `tema-${code.toLowerCase()}`
  return (
    <label
      htmlFor={id}
      className="group grid cursor-pointer content-start gap-3 rounded-xl border bg-card p-2.5 transition-colors outline-none hover:border-foreground/30 has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-default"
    >
      <input
        id={id}
        type="radio"
        name="portal_theme"
        value={code}
        checked={checked}
        onChange={onSelect}
        aria-labelledby={`${id}-nama`}
        aria-describedby={`${id}-catatan`}
        className="sr-only"
      />
      <ThemePreview code={code} />
      <span className="flex items-start gap-3 px-1.5 pb-1.5">
        <span className="grid min-w-0 flex-1 gap-1">
          <span id={`${id}-nama`} className="flex flex-wrap items-center gap-2 font-medium">
            {PORTAL_THEME_LABELS[code]}
            {current && <StatusBadge tone="success">Dipakai</StatusBadge>}
          </span>
          <span id={`${id}-catatan`} className="text-sm text-muted-foreground">
            {THEME_NOTES[code]}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-input text-transparent transition-colors group-has-checked:border-foreground group-has-checked:bg-foreground group-has-checked:text-background"
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>
    </label>
  )
}

// Miniatur halaman depan portal dengan warna aslinya (selalu versi terang): hero berfoto dengan
// pil header yang melayang di atasnya, lalu kartu terang dan panel gelap. Glassmorphism memakai
// latar senja dan permukaan kaca yang sama dengan portal.
function ThemePreview({ code }: { code: PortalThemeCode }) {
  const glass = code === 'GLASS'
  const pill = glass ? 'bg-white/60 ring-1 ring-white/80' : 'bg-white ring-1 ring-[#e7e7e7]'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid aspect-[16/10] grid-rows-[minmax(0,1fr)_32%] gap-[4%] overflow-hidden rounded-lg p-[3%] ring-1 ring-border',
        glass ? 'site-aurora' : 'bg-white',
      )}
    >
      <span className="relative overflow-hidden rounded-md bg-[#07151a]">
        <img
          src={CHURCH_PHOTO.src}
          srcSet={CHURCH_PHOTO.srcSet}
          sizes="320px"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[center_20%]"
        />
        <span className="site-hero-scrim absolute inset-0" />
        <span className="absolute inset-x-[4%] top-[8%] flex items-center justify-between">
          <span className={cn('h-2 w-[18%] rounded-full', pill)} />
          <span className={cn('h-2 w-[36%] rounded-full', pill)} />
          <span className="h-2 w-[12%] rounded-full bg-[#111113]" />
        </span>
        <span className="absolute inset-x-[8%] bottom-[16%] grid justify-items-center gap-1">
          <span className="h-1.5 w-1/2 rounded-full bg-white/90" />
          <span className="h-1 w-1/3 rounded-full bg-white/60" />
        </span>
      </span>
      <span className="grid grid-cols-2 gap-[4%]">
        <span
          className={cn(
            'grid content-start gap-1 rounded-md p-[6%]',
            glass
              ? 'bg-white/55 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.75),0_6px_16px_-8px_rgb(40_30_25/0.35)]'
              : 'bg-[#f6f6f4]',
          )}
        >
          <span className="h-1.5 w-2/3 rounded-full bg-[#111113]/80" />
          <span className="h-1 w-full rounded-full bg-[#111113]/25" />
          <span className="h-1 w-4/5 rounded-full bg-[#111113]/25" />
        </span>
        <span
          className={cn(
            'grid content-start gap-1 rounded-md p-[6%]',
            glass
              ? 'bg-[rgb(8_22_27/0.86)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]'
              : 'bg-[#111113]',
          )}
        >
          <span className="h-1.5 w-1/2 rounded-full bg-white/85" />
          <span className="h-1 w-full rounded-full bg-white/30" />
          <span className="h-1 w-3/5 rounded-full bg-[#f08a2b]" />
        </span>
      </span>
    </span>
  )
}
