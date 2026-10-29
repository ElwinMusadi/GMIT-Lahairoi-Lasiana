import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/zenith/panel'
import { cn } from '@/lib/utils'

// Kartu grafik Ringkasan (gaya Zenith): judul, keterangan, kendali, dan tombol untuk
// beralih ke tampilan tabel (padanan aksesibel setiap grafik).
export function ChartCard({
  title,
  meta,
  controls,
  legend,
  table,
  footer,
  busy = false,
  className,
  children,
}: {
  title: string
  meta?: ReactNode
  controls?: ReactNode
  legend?: ReactNode
  // Tanpa `table`, kartu tidak punya tombol tampilan tabel.
  table?: ReactNode
  // Bagian di bawah grafik yang tetap tampil di tampilan tabel.
  footer?: ReactNode
  // Data sedang dimuat ulang: tampilan lama dipertahankan, sedikit pudar.
  busy?: boolean
  className?: string
  children: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Panel
      title={title}
      description={meta}
      busy={busy}
      className={className}
      contentClassName="grid content-start gap-4"
      action={
        (controls || table) && (
          <>
            {controls}
            {table && (
              <Button
                variant="outline"
                aria-pressed={asTable}
                onClick={() => setAsTable((value) => !value)}
              >
                {asTable ? (
                  <BarChart3 data-icon="inline-start" />
                ) : (
                  <Table2 data-icon="inline-start" />
                )}
                {asTable ? 'Grafik' : 'Tabel'}
              </Button>
            )}
          </>
        )
      }
    >
      {legend}
      <div className="min-w-0">{asTable && table ? table : children}</div>
      {footer && <div className="border-t pt-4">{footer}</div>}
    </Panel>
  )
}

// Legenda yang ikut membawa angka: penanda, nama seri, dan nilainya.
export function LegendItem({
  swatch,
  label,
  value,
}: {
  swatch: ReactNode
  label: string
  value?: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.8125rem] whitespace-nowrap">
      {swatch}
      <span className="text-muted-foreground">{label}</span>
      {value !== undefined && <span className="font-medium tabular-nums">{value}</span>}
    </span>
  )
}

// Tabel sederhana untuk tampilan tabel grafik.
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: ReactNode[]
  // Kolom pertama label, sisanya angka (rata kanan).
  rows: { key: string; cells: ReactNode[] }[]
}) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="text-xs text-muted-foreground">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className={cn('h-9 font-normal', index === 0 ? 'text-left' : 'pl-4 text-right')}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-rule">
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" className="py-2 text-left font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={index} className="py-2 pl-4 text-right tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
