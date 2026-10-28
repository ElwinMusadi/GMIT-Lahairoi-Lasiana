import type { ReactNode } from 'react'
import { BookOpen, Church, Compass, MapPin, Users } from 'lucide-react'
import type { ApiList, ApiPage, PublicContent, RayonListItem } from '@shared/types'
import { EmptyNote, PortalCard, PortalSection, SectionHeading } from '@/components/portal/parts'
import { Skeleton } from '@/components/ui/skeleton'
import { initials, paragraphs, parseRoster, profileSlot, type ProfileSlot } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'

// Profil & Sejarah jemaat (PRD: sejarah, visi misi, 5 rayon pelayanan, Pendeta dan
// Majelis periode berjalan). Isinya dari konten Profil di CMS (/dashboard/contents, tab
// Profil) dan daftar rayon. Konten Profil masuk ke bagiannya menurut judul: "Sejarah",
// "Visi"/"Misi", atau "Majelis"/"Pendeta"; lainnya tampil di bagian akhir.
export default function ProfilePage() {
  const profile = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'PROFILE',
    with_body: 'true',
    per_page: 50,
  })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')

  const contents = profile.data?.data ?? []
  const bySlot = (slot: ProfileSlot) => contents.filter((item) => profileSlot(item) === slot)
  const loading = !profile.data && !profile.error

  return (
    <>
      <section aria-labelledby="judul-profil" className="bg-portal-low px-4 py-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <SectionHeading
            id="judul-profil"
            level={1}
            eyebrow="Profil jemaat"
            title="Profil & Sejarah GMIT Lahairoi Tuak Sabu"
            lead="Perjalanan jemaat, visi dan misi pelayanan, lima rayon di Lasiana, serta Pendeta dan Majelis Jemaat periode berjalan."
          />
          <nav aria-label="Bagian halaman" className="flex flex-wrap gap-2">
            {[
              ['#sejarah', 'Sejarah'],
              ['#visi-misi', 'Visi & Misi'],
              ['#rayon', '5 Rayon Pelayanan'],
              ['#majelis', 'Pendeta & Majelis'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-portal-navy shadow-sm hover:bg-portal-high"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {profile.error && !profile.data && (
        <PortalSection>
          <EmptyNote>
            Profil jemaat tidak dapat dimuat.{' '}
            <button
              type="button"
              onClick={profile.reload}
              className="font-semibold text-portal-navy underline"
            >
              Coba lagi
            </button>
          </EmptyNote>
        </PortalSection>
      )}

      <PortalSection id="sejarah" labelledBy="judul-sejarah">
        <SectionHeading
          id="judul-sejarah"
          eyebrow="Sejarah"
          title={singleTitle(bySlot('history')) ?? 'Sejarah Jemaat Lahairoi'}
        />
        <ArticleSlot
          loading={loading}
          items={bySlot('history')}
          icon={<BookOpen className="size-5" aria-hidden="true" />}
          empty="Sejarah jemaat sedang disusun pengurus."
        />
      </PortalSection>

      <PortalSection id="visi-misi" tone="low" labelledBy="judul-visi">
        <SectionHeading
          id="judul-visi"
          eyebrow="Arah pelayanan"
          title={singleTitle(bySlot('vision')) ?? 'Visi & Misi'}
        />
        <ArticleSlot
          loading={loading}
          items={bySlot('vision')}
          icon={<Compass className="size-5" aria-hidden="true" />}
          empty="Visi dan misi jemaat sedang disusun pengurus."
          columns
        />
      </PortalSection>

      <PortalSection id="rayon" labelledBy="judul-rayon">
        <SectionHeading
          id="judul-rayon"
          eyebrow="Wilayah pelayanan"
          title="Lima Rayon Pelayanan"
          lead="Setiap keluarga jemaat tergabung dalam satu rayon, tempat ibadah rumah tangga dan pelayanan majelis berlangsung."
        />
        <RayonGrid rayons={rayons.data?.data} error={rayons.error} />
      </PortalSection>

      <PortalSection id="majelis" tone="low" labelledBy="judul-majelis">
        <SectionHeading
          id="judul-majelis"
          eyebrow="Struktur pelayanan"
          title="Pendeta & Majelis Jemaat"
          lead="Pelayan jemaat periode berjalan."
        />
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : bySlot('leaders').length === 0 ? (
          <EmptyNote>Daftar Pendeta dan Majelis Jemaat sedang disusun pengurus.</EmptyNote>
        ) : (
          bySlot('leaders').map((item) => <Roster key={item.id} content={item} />)
        )}
      </PortalSection>

      {bySlot('other').length > 0 && (
        <PortalSection labelledBy="judul-lainnya">
          <SectionHeading id="judul-lainnya" eyebrow="Tentang jemaat" title="Informasi Lainnya" />
          <ArticleSlot
            loading={false}
            items={bySlot('other')}
            icon={<Church className="size-5" aria-hidden="true" />}
            empty=""
          />
        </PortalSection>
      )}
    </>
  )
}

// Satu konten di bagiannya: judul kontennya menjadi judul bagian, bukan judul kedua.
function singleTitle(items: PublicContent[]) {
  return items.length === 1 ? items[0].title : null
}

function ArticleSlot({
  loading,
  items,
  icon,
  empty,
  columns = false,
}: {
  loading: boolean
  items: PublicContent[]
  icon: ReactNode
  empty: string
  columns?: boolean
}) {
  if (loading) return <Skeleton className="h-56 rounded-xl" />
  if (items.length === 0) return <EmptyNote>{empty}</EmptyNote>
  return (
    <div className={columns && items.length > 1 ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
      {items.map((item) => (
        <PortalCard as="article" key={item.id} className="grid gap-4 p-6 lg:grid-cols-12 lg:gap-8">
          <div
            className={
              item.thumbnail_url && !columns
                ? 'grid content-start gap-3 lg:col-span-7'
                : 'grid content-start gap-3 lg:col-span-12'
            }
          >
            {items.length > 1 ? (
              <h3 className="flex items-center gap-2 font-portal-heading text-xl leading-7 font-semibold text-portal-navy">
                <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-portal-blue-soft text-portal-navy">
                  {icon}
                </span>
                {item.title}
              </h3>
            ) : (
              <span className="flex size-9 items-center justify-center rounded-lg bg-portal-blue-soft text-portal-navy">
                {icon}
              </span>
            )}
            {item.summary && (
              <p className="max-w-[70ch] text-lg font-medium text-portal-ink">{item.summary}</p>
            )}
            <div className="grid max-w-[70ch] gap-3 leading-relaxed text-portal-muted">
              {paragraphs(item.content_body).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          {item.thumbnail_url && !columns && (
            <img
              src={item.thumbnail_url}
              alt={item.summary ?? item.title}
              loading="lazy"
              className="h-64 w-full rounded-lg object-cover lg:col-span-5 lg:h-full lg:max-h-96"
            />
          )}
        </PortalCard>
      ))}
    </div>
  )
}

function RayonGrid({
  rayons,
  error,
}: {
  rayons: RayonListItem[] | undefined
  error: string | null
}) {
  if (error && !rayons) return <EmptyNote>Daftar rayon tidak dapat dimuat.</EmptyNote>
  if (!rayons) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {rayons.map((rayon, index) => (
        <li key={rayon.id}>
          <PortalCard className="relative flex h-full flex-col gap-3 overflow-hidden p-5">
            <span className="absolute inset-x-0 top-0 h-1 bg-portal-navy" aria-hidden="true" />
            <span className="w-fit rounded-full bg-portal-blue-soft px-2.5 py-0.5 text-xs font-bold text-portal-blue-ink uppercase">
              Rayon {index + 1}
            </span>
            <h3 className="font-portal-heading text-xl leading-7 font-semibold text-portal-navy">
              {rayon.name}
            </h3>
            <p className="flex items-start gap-1.5 text-sm text-portal-muted">
              <Users className="mt-0.5 size-4 flex-none text-portal-amber" aria-hidden="true" />
              {rayon.coordinator_name
                ? `Koordinator: ${rayon.coordinator_name}`
                : 'Koordinator belum diumumkan'}
            </p>
            {rayon.description && (
              <p className="flex items-start gap-1.5 text-sm text-portal-muted">
                <MapPin className="mt-0.5 size-4 flex-none text-portal-navy" aria-hidden="true" />
                {rayon.description}
              </p>
            )}
          </PortalCard>
        </li>
      ))}
    </ol>
  )
}

// Konten "Pendeta & Majelis": satu baris per orang ("Jabatan: Nama") menjadi kartu.
function Roster({ content }: { content: PublicContent }) {
  const { entries, notes } = parseRoster(content.content_body)
  return (
    <div className="grid gap-4">
      {content.thumbnail_url && (
        <figure className="overflow-hidden rounded-xl bg-white shadow-sm">
          <img
            src={content.thumbnail_url}
            alt={content.summary ?? content.title}
            loading="lazy"
            className="max-h-[28rem] w-full object-cover"
          />
          {content.summary && (
            <figcaption className="px-5 py-3 text-sm text-portal-muted">
              {content.summary}
            </figcaption>
          )}
        </figure>
      )}
      {entries.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, index) => (
            <li key={`${entry.name}-${index}`}>
              <PortalCard className="flex h-full items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  className={
                    index === 0
                      ? 'flex size-11 flex-none items-center justify-center rounded-full bg-portal-navy text-sm font-bold text-white'
                      : 'flex size-11 flex-none items-center justify-center rounded-full bg-portal-blue-soft text-sm font-bold text-portal-navy'
                  }
                >
                  {initials(entry.name)}
                </span>
                <span className="grid min-w-0">
                  <span className="font-bold text-portal-ink">{entry.name}</span>
                  <span className="text-xs font-semibold text-portal-amber">{entry.role}</span>
                </span>
              </PortalCard>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <div className="grid gap-2 text-sm text-portal-muted">
          {notes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </div>
      )}
    </div>
  )
}
