import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// Warna identitas pucat per orang (bukan data): hue stabil dari nama, tanpa ungu/nila.
const PERSON_HUES = [12, 35, 95, 150, 190, 205]

function personTint(name: string) {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  const hue = PERSON_HUES[hash % PERSON_HUES.length]
  return { backgroundColor: `hsl(${hue} 55% 90%)`, color: `hsl(${hue} 45% 24%)` }
}

// Dua huruf awal nama, tanpa gelar gerejawi (Pdt., Pnt., Dkn.).
function initials(name: string) {
  const words = name
    .replace(/^(Pdt|Pnt|Dkn)\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

// Avatar inisial seseorang (sel nama tabel jemaat, menu pengguna). Hanya hiasan: namanya
// selalu tertulis di sebelahnya.
export function PersonAvatar({
  name,
  muted = false,
  className,
}: {
  name: string
  // Anggota yang pindah atau meninggal: abu-abu, tanpa warna identitas.
  muted?: boolean
  className?: string
}) {
  return (
    <Avatar aria-hidden="true" className={cn('size-8', className)}>
      <AvatarFallback
        style={muted ? undefined : personTint(name)}
        className={cn('text-xs font-semibold', muted && 'bg-muted text-muted-foreground')}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
