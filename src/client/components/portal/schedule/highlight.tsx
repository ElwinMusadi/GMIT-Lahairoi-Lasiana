import { highlightParts } from '@/lib/schedule-calendar'

// Teks dengan bagian yang cocok dengan kata cari ditandai, untuk hasil pencarian jadwal.
export function Highlight({ text, terms }: { text: string; terms?: readonly string[] }) {
  if (!terms?.length) return text
  return (
    <>
      {highlightParts(text, terms).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-[3px] bg-site-accent/25 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  )
}
