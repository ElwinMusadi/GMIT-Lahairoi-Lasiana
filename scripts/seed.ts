// Seed data awal D1: 5 rayon bawaan (jika tabel rayons masih kosong), akun Admin
// awal, dan contoh Pos Kas dasar. Aman dijalankan berulang kali: data yang sudah
// ada tidak diubah, termasuk kata sandi Admin.
//
//   npm run db:seed:local
//   npm run db:seed:remote
//   npm run db:seed:local -- --sample-users   (khusus lokal: + akun contoh Bendahara,
//                                              Pendeta, dan Majelis untuk mencoba hak akses)
//
// Variabel lingkungan opsional:
//   SEED_ADMIN_NAME      bawaan: Administrator
//   SEED_ADMIN_EMAIL     bawaan: admin@gmit-lahairoi.local
//   SEED_ADMIN_USERNAME  bawaan: admin
//   SEED_ADMIN_PASSWORD  minimal 12 karakter; jika kosong, dibuat acak dan ditampilkan sekali

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { hashPassword } from '../src/worker/lib/password.ts'

const RAYONS = ['Getsemani', 'Golgota', 'Tiberias', 'Galilea', 'Kapernaum']

const FUNDS = [
  {
    code: 'UMUM',
    name: 'Kas Umum / Sinode',
    description: 'Kas operasional jemaat dan setoran ke Sinode.',
  },
  {
    code: 'PEMBANGUNAN',
    name: 'Kas Pembangunan',
    description: 'Dana pembangunan dan pemeliharaan gedung gereja.',
  },
  {
    code: 'DIAKONIA',
    name: 'Kas Diakonia',
    description: 'Dana pelayanan kasih bagi warga jemaat yang membutuhkan.',
  },
  {
    code: 'KATEGORIAL',
    name: 'Kas Kategorial',
    description: 'Dana kegiatan PAR, Pemuda, Kaum Ibu, Kaum Bapak, dan Lansia.',
  },
]

// Akun contoh (bukan pengurus sebenarnya) untuk mencoba RBAC di database lokal.
const SAMPLE_USERS = [
  { name: 'Marthen Bire', username: 'bendahara', role: 'TREASURER', rayon: null },
  { name: 'Pdt. Agustina Riwu Kaho', username: 'pendeta', role: 'PASTOR', rayon: null },
  { name: 'Yohanis Dimu', username: 'majelis.golgota', role: 'ELDER', rayon: 'Golgota' },
] as const

const MIN_PASSWORD_LENGTH = 12

const OWN_FLAGS = ['--local', '--remote', '--sample-users']
const target = process.argv.includes('--remote') ? '--remote' : '--local'
const withSampleUsers = process.argv.includes('--sample-users')
// Argumen lain diteruskan ke `wrangler d1 execute`, contoh: --persist-to <dir>.
const extraArgs = process.argv.slice(2).filter((arg) => !OWN_FLAGS.includes(arg))
const root = path.resolve(import.meta.dirname, '..')
const wranglerBin = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const seedFile = path.join(root, '.wrangler', 'tmp', 'seed.sql')

const admin = {
  name: process.env.SEED_ADMIN_NAME || 'Administrator',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@gmit-lahairoi.local',
  username: process.env.SEED_ADMIN_USERNAME || 'admin',
  password: process.env.SEED_ADMIN_PASSWORD || undefined,
}

function fail(message: string): never {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

// Output wrangler hanya ditampilkan jika perintah gagal.
function d1Execute(args: string[]): string {
  const result = spawnSync(
    process.execPath,
    [wranglerBin, 'd1', 'execute', 'DB', target, '--yes', '--json', ...extraArgs, ...args],
    { cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] },
  )
  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr)
    fail(`wrangler d1 execute gagal. Pastikan migrasi sudah diterapkan (npm run db:migrate:${target.slice(2)}).`)
  }
  return result.stdout
}

function query<T>(sql: string): T[] {
  const output = d1Execute(['--command', sql])
  return (JSON.parse(output) as { results: T[] }[])[0]?.results ?? []
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function generatePassword(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64url')
}

if (admin.password && admin.password.length < MIN_PASSWORD_LENGTH) {
  fail(`SEED_ADMIN_PASSWORD minimal ${MIN_PASSWORD_LENGTH} karakter.`)
}
if (withSampleUsers && target === '--remote') {
  fail('--sample-users hanya untuk database lokal, bukan database Cloudflare.')
}

console.log(`Seed database D1 (${target === '--remote' ? 'remote' : 'lokal'})...`)

const adminExists =
  query<{ id: number }>(
    `SELECT id FROM users WHERE email = ${quote(admin.email)} OR username = ${quote(admin.username)}`,
  ).length > 0
const adminPassword = admin.password ?? generatePassword()

const statements = [
  // Rayon juga dibuat oleh migrasi 0001; ini hanya berjalan jika tabel rayons kosong.
  `INSERT INTO rayons (name)
SELECT column1 FROM (VALUES ${RAYONS.map((name) => `(${quote(name)})`).join(', ')})
WHERE NOT EXISTS (SELECT 1 FROM rayons);`,
  ...FUNDS.map(
    (fund) =>
      `INSERT INTO finance_funds (code, name, description)
VALUES (${quote(fund.code)}, ${quote(fund.name)}, ${quote(fund.description)})
ON CONFLICT (code) DO NOTHING;`,
  ),
]

if (!adminExists) {
  const passwordHash = await hashPassword(adminPassword)
  statements.push(
    `INSERT INTO users (name, email, username, password_hash, role, is_active)
VALUES (${quote(admin.name)}, ${quote(admin.email)}, ${quote(admin.username)}, ${quote(passwordHash)}, 'ADMIN', 1);`,
  )
}

const createdSampleUsers: { username: string; role: string; password: string }[] = []
if (withSampleUsers) {
  const existing = new Set(
    query<{ username: string }>(
      `SELECT username FROM users WHERE username IN (${SAMPLE_USERS.map((u) => quote(u.username)).join(', ')})`,
    ).map((row) => row.username.toLowerCase()),
  )
  for (const sample of SAMPLE_USERS) {
    if (existing.has(sample.username)) continue
    const password = generatePassword()
    const rayonId = sample.rayon ? `(SELECT id FROM rayons WHERE name = ${quote(sample.rayon)})` : 'NULL'
    statements.push(
      `INSERT INTO users (name, username, password_hash, role, rayon_id, is_active)
VALUES (${quote(sample.name)}, ${quote(sample.username)}, ${quote(await hashPassword(password))}, '${sample.role}', ${rayonId}, 1);`,
    )
    createdSampleUsers.push({ username: sample.username, role: sample.role, password })
  }
}

mkdirSync(path.dirname(seedFile), { recursive: true })
writeFileSync(seedFile, `${statements.join('\n\n')}\n`)
try {
  d1Execute(['--file', seedFile])
} finally {
  rmSync(seedFile, { force: true })
}

const [summary] = query<{ rayons: number; funds: number; active_admins: number }>(
  `SELECT
    (SELECT COUNT(*) FROM rayons) AS rayons,
    (SELECT COUNT(*) FROM finance_funds) AS funds,
    (SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = 1) AS active_admins`,
)

console.log('\n✔ Seed selesai')
console.log(`  Rayon        : ${summary?.rayons}`)
console.log(`  Pos Kas      : ${summary?.funds}`)
console.log(`  Admin aktif  : ${summary?.active_admins}`)

if (adminExists) {
  console.log(`\nAkun Admin "${admin.email}" sudah ada; data dan kata sandinya tidak diubah.`)
} else {
  console.log('\nAkun Admin awal dibuat:')
  console.log(`  Email    : ${admin.email}`)
  console.log(`  Username : ${admin.username}`)
  console.log(
    admin.password
      ? '  Password : sesuai SEED_ADMIN_PASSWORD'
      : `  Password : ${adminPassword}\n\n  Simpan kata sandi ini sekarang; tidak akan ditampilkan lagi.`,
  )
}

if (withSampleUsers) {
  if (createdSampleUsers.length === 0) {
    console.log('\nAkun contoh per peran sudah ada; tidak diubah.')
  } else {
    console.log('\nAkun contoh per peran dibuat (khusus lokal, kata sandi tampil sekali):')
    for (const sample of createdSampleUsers) {
      console.log(`  ${sample.username.padEnd(16)} ${sample.role.padEnd(10)} ${sample.password}`)
    }
  }
}
