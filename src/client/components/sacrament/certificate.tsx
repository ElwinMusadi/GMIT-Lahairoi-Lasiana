import type { CSSProperties, ReactNode } from 'react'
import { WellMark } from '@/components/brand/well'
import type { CertificateContent, Margins } from '@/lib/sacrament-admin'
import { cn } from '@/lib/utils'

// Lembar sertifikat A4 tegak (210 × 297 mm), semua posisi dalam milimeter agar sama di
// layar dan di kertas.
//
// - Format Desain Lengkap: kop GMIT, bingkai, judul, label, ayat, dan isian, untuk
//   kertas HVS kosong.
// - Format Blangko: hanya isian (nomor register, data, tanggal, pendeta) di posisi yang
//   sama, digeser margin atas/kiri untuk menyesuaikan printer dan blangko fisik. Label
//   dan bingkai tampil samar di layar sebagai panduan, tidak ikut tercetak.

export type CertificateMode = 'lengkap' | 'blangko'

const INK = '#1b2333'
const NAVY = '#1d2b53'
const GOLD = '#9a6b12'
// Garis isian: tipis dan abu-abu, agar tetap rata di PDF dan printer.
const RULE = '#8a90a0'

// Tata letak baris isian.
const ROWS_TOP = 104
const ROW_HEIGHT = 9
const LABEL_X = 30
const COLON_X = 80
const VALUE_X = 84
const VALUE_WIDTH = 98
const SIGN_TOP = 226

const mm = (value: number) => `${value}mm`

function at(top: number, left: number, extra: CSSProperties = {}): CSSProperties {
  return { position: 'absolute', top: mm(top), left: mm(left), ...extra }
}

// Isian panjang (mis. nama gereja asal) diperkecil agar tetap satu baris.
function valueSize(value: string) {
  return value.length > 52 ? '9.5pt' : value.length > 40 ? '10.5pt' : '11.5pt'
}

type PlacedGroup = {
  heading: string | null
  headingTop: number | null
  rows: (CertificateContent['groups'][number]['rows'][number] & { top: number })[]
}

// Posisi tiap baris dalam mm; kelompok berjudul memakan satu baris untuk judulnya.
function placeRows(groups: CertificateContent['groups']): PlacedGroup[] {
  const placed: PlacedGroup[] = []
  let cursor = ROWS_TOP
  for (const group of groups) {
    const headingTop = group.heading ? cursor : null
    if (group.heading) cursor += ROW_HEIGHT
    const rows = []
    for (const row of group.rows) {
      rows.push({ ...row, top: cursor })
      cursor += ROW_HEIGHT
    }
    if (group.heading) cursor += 2
    placed.push({ heading: group.heading, headingTop, rows })
  }
  return placed
}

export function Certificate({
  content,
  mode,
  margins,
  showGuide,
}: {
  content: CertificateContent
  mode: CertificateMode
  margins: Margins
  showGuide: boolean
}) {
  const blank = mode === 'blangko'
  const layout = placeRows(content.groups)

  return (
    <div
      className="certificate-sheet relative h-[297mm] w-[210mm] overflow-hidden bg-white"
      style={{ color: INK, fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {/* Lapisan cetakan tetap: tercetak di format lengkap, panduan samar di blangko. */}
      {(!blank || showGuide) && (
        <div
          aria-hidden={blank ? true : undefined}
          className={cn('absolute inset-0', blank && 'opacity-25 print:hidden')}
        >
          <Frame />
          <Letterhead />
          <div style={at(56, 20, { width: mm(170), textAlign: 'center' })}>
            <p
              style={{
                fontSize: '21pt',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: NAVY,
              }}
            >
              {content.title}
            </p>
          </div>
          <p style={at(70, 20, { width: mm(78), textAlign: 'right', fontSize: '11pt' })}>
            Nomor register:
          </p>
          <p
            style={at(82, 28, {
              width: mm(154),
              fontSize: '11pt',
              lineHeight: 1.5,
              textAlign: 'center',
            })}
          >
            {content.statement}
          </p>
          {layout.map((group) => (
            <div key={group.heading ?? 'data'}>
              {group.heading && group.headingTop !== null && (
                <p
                  style={at(group.headingTop, LABEL_X, {
                    fontSize: '11pt',
                    fontWeight: 700,
                    color: NAVY,
                  })}
                >
                  {group.heading}
                </p>
              )}
              {group.rows.map((row) => (
                <div key={row.key}>
                  <p style={at(row.top, LABEL_X + (group.heading ? 4 : 0), { fontSize: '11pt' })}>
                    {row.label}
                  </p>
                  <p style={at(row.top, COLON_X, { fontSize: '11pt' })}>:</p>
                  <span
                    style={at(row.top + 6, VALUE_X, {
                      width: mm(VALUE_WIDTH),
                      borderBottom: `0.15mm solid ${RULE}`,
                    })}
                  />
                </div>
              ))}
            </div>
          ))}
          <div style={at(203, 30, { width: mm(150), textAlign: 'center' })}>
            <p style={{ fontSize: '10.5pt', fontStyle: 'italic' }}>“{content.verse}”</p>
            <p style={{ fontSize: '9.5pt', marginTop: '1.5mm', color: GOLD }}>
              {content.verseSource}
            </p>
          </div>
          <SignatureCaption left={28} top={SIGN_TOP + 6} title="Ketua Majelis Jemaat," />
          <SignatureCaption left={112} top={SIGN_TOP + 6} title="Pendeta yang melayani," />
          <span
            style={at(SIGN_TOP + 36, 28, { width: mm(70), borderBottom: `0.3mm solid ${INK}` })}
          />
          <span
            style={at(SIGN_TOP + 36, 112, { width: mm(70), borderBottom: `0.3mm solid ${INK}` })}
          />
          <p
            style={at(276, 20, {
              width: mm(170),
              textAlign: 'center',
              fontSize: '8pt',
              color: '#5b6275',
            })}
          >
            Dicatat dalam Buku Induk Sakramen Jemaat GMIT Lahairoi Tuak Sabu Lasiana.
          </p>
        </div>
      )}

      {/* Isian: tercetak di kedua format; di blangko digeser sesuai kalibrasi printer. */}
      <div
        className="absolute inset-0"
        style={
          blank ? { transform: `translate(${mm(margins.left)}, ${mm(margins.top)})` } : undefined
        }
      >
        <Value top={70} left={100} width={80}>
          <span style={{ fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace' }}>
            {content.number}
          </span>
        </Value>
        {layout.flatMap((group) =>
          group.rows.map((row) => (
            <Value key={row.key} top={row.top} left={VALUE_X + 1} width={VALUE_WIDTH - 1} bold>
              {row.value}
            </Value>
          )),
        )}
        <Value top={SIGN_TOP} left={112} width={70}>
          {content.signedAt}
        </Value>
        <Value top={SIGN_TOP + 37.5} left={112} width={70} bold center>
          {content.pastor}
        </Value>
      </div>
    </div>
  )
}

function Value({
  top,
  left,
  width,
  bold = false,
  center = false,
  children,
}: {
  top: number
  left: number
  width: number
  bold?: boolean
  center?: boolean
  children: ReactNode
}) {
  const textValue = typeof children === 'string' ? children : ''
  return (
    <p
      style={at(top, left, {
        width: mm(width),
        whiteSpace: 'nowrap',
        fontSize: valueSize(textValue),
        fontWeight: bold ? 700 : 400,
        textAlign: center ? 'center' : 'left',
      })}
    >
      {children}
    </p>
  )
}

function SignatureCaption({ left, top, title }: { left: number; top: number; title: string }) {
  return (
    <p style={at(top, left, { width: mm(70), textAlign: 'center', fontSize: '10.5pt' })}>{title}</p>
  )
}

// Bingkai ganda dengan cincin sumur Lahai-roi di keempat sudut.
function Frame() {
  const corners: [number, number][] = [
    [12.5, 12.5],
    [12.5, 190.5],
    [277.5, 12.5],
    [277.5, 190.5],
  ]
  return (
    <>
      <span
        style={{
          position: 'absolute',
          inset: '9mm',
          border: `0.9mm solid ${NAVY}`,
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: '11.5mm',
          border: `0.25mm solid ${GOLD}`,
        }}
      />
      {corners.map(([top, left]) => (
        <span
          key={`${top}-${left}`}
          style={at(top, left, { width: mm(7), height: mm(7), color: GOLD })}
        >
          <WellMark className="size-full" />
        </span>
      ))}
    </>
  )
}

function Letterhead() {
  return (
    <>
      <span style={at(20, 26, { width: mm(20), height: mm(20), color: NAVY })}>
        <WellMark className="size-full" />
      </span>
      <div style={at(19, 48, { width: mm(136), textAlign: 'center' })}>
        <p style={{ fontSize: '15pt', fontWeight: 700, letterSpacing: '0.04em', color: NAVY }}>
          GEREJA MASEHI INJILI DI TIMOR
        </p>
        <p style={{ fontSize: '12pt', fontWeight: 700, marginTop: '1mm' }}>
          MAJELIS JEMAAT LAHAIROI TUAK SABU LASIANA
        </p>
        <p style={{ fontSize: '9pt', marginTop: '1mm', color: '#5b6275' }}>
          Lasiana, Kota Kupang, Nusa Tenggara Timur
        </p>
      </div>
      <span style={at(45, 20, { width: mm(170), borderBottom: `0.8mm solid ${NAVY}` })} />
      <span style={at(46.6, 20, { width: mm(170), borderBottom: `0.25mm solid ${NAVY}` })} />
    </>
  )
}
