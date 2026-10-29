import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setDashboardTheme, useDashboardThemeValue } from '@/lib/dashboard-theme'

// Tombol terang/gelap di topbar dashboard. Bawaannya terang; pilihan disimpan di perangkat ini
// (lib/dashboard-theme.ts), terpisah dari pilihan tema portal.
export function DashboardThemeToggle() {
  const dark = useDashboardThemeValue() === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => setDashboardTheme(dark ? 'light' : 'dark')}
      aria-pressed={dark}
      aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      title={dark ? 'Tema terang' : 'Tema gelap'}
      className="text-muted-foreground hover:text-foreground"
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
