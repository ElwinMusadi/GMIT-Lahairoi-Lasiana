import { Moon, Sun } from 'lucide-react'
import { setPortalTheme, usePortalThemeValue } from '@/lib/portal-theme'
import { cn } from '@/lib/utils'

// Tombol bundar terang/gelap di header portal. Bawaan portal selalu terang; pilihan
// pengunjung disimpan di perangkat ini (lib/portal-theme.ts).
export function ThemeToggle({ className }: { className?: string }) {
  const theme = usePortalThemeValue()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setPortalTheme(dark ? 'light' : 'dark')}
      aria-pressed={dark}
      aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      title={dark ? 'Tema terang' : 'Tema gelap'}
      className={cn(
        'inline-flex size-11 flex-none items-center justify-center rounded-full border border-site-rule bg-site-glass text-site-ink shadow-sm transition-colors outline-none hover:border-site-ink/40 focus-visible:ring-3 focus-visible:ring-ring',
        className,
      )}
    >
      {dark ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}
