import type { RayonListItem } from '@shared/types'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError } from '@/components/portal/kage/site-section'

// Tabel lima rayon bergaya tabel perbandingan kage: Rayon n · nama, koordinator (serif
// miring), dan wilayah. Di ponsel menjadi daftar bertumpuk. Dipakai Beranda dan Profil.
export function RayonTable({
  rayons,
  error,
  onRetry,
}: {
  rayons: RayonListItem[] | undefined
  error: string | null
  onRetry: () => void
}) {
  if (error && !rayons) {
    return <LoadError message="Daftar rayon tidak dapat dimuat." onRetry={onRetry} />
  }
  if (!rayons) {
    return (
      <div aria-hidden="true" className="grid gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl bg-site-paper" />
        ))}
      </div>
    )
  }
  return (
    <Reveal>
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">Rayon pelayanan, koordinator, dan wilayahnya</caption>
        <thead>
          <tr className="border-b border-site-rule">
            {['Rayon', 'Koordinator', 'Wilayah'].map((label) => (
              <th
                key={label}
                scope="col"
                className="px-3 py-4 text-sm font-semibold text-site-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-site-rule">
          {rayons.map((rayon, index) => (
            <tr key={rayon.id}>
              <th scope="row" className="w-[32%] px-3 py-5 align-top font-normal">
                <span className="block text-[13px] text-site-muted">Rayon {index + 1}</span>
                <span className="font-site-display text-lg font-bold">{rayon.name}</span>
              </th>
              <td className="w-[32%] px-3 py-5 align-top">
                <Coordinator name={rayon.coordinator_name} />
              </td>
              <td className="px-3 py-5 align-top text-base text-site-ink/80">
                {rayon.description ?? 'Wilayah belum diumumkan'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="grid gap-8 md:hidden">
        {rayons.map((rayon, index) => (
          <li key={rayon.id} className="grid gap-1">
            <span className="text-[13px] text-site-muted">Rayon {index + 1}</span>
            <span className="font-site-display text-lg font-bold">{rayon.name}</span>
            <Coordinator name={rayon.coordinator_name} />
            {rayon.description && (
              <span className="text-base text-site-ink/80">{rayon.description}</span>
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

function Coordinator({ name }: { name: string | null }) {
  return name ? (
    <span className="font-site-serif text-2xl leading-snug italic">{name}</span>
  ) : (
    <span className="text-base text-site-muted">Koordinator belum diumumkan</span>
  )
}
