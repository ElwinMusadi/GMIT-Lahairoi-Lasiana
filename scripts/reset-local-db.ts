// Menghapus database D1 lokal (.wrangler/state/v3/d1) sebelum migrasi & seed ulang.
// Dipanggil oleh `npm run db:reset:local`.
//
// Folder dipindahkan dulu (operasi atomik) baru dihapus. Di Windows pemindahan
// gagal utuh jika ada file database yang masih dibuka dev server, sehingga
// database tidak pernah terhapus setengah jalan.

import { renameSync, rmSync } from 'node:fs'
import path from 'node:path'

const d1StateDir = path.resolve(import.meta.dirname, '..', '.wrangler', 'state', 'v3', 'd1')
const trashDir = `${d1StateDir}.deleting-${Date.now()}`

try {
  renameSync(d1StateDir, trashDir)
} catch (err) {
  const code = (err as NodeJS.ErrnoException).code
  if (code === 'ENOENT') {
    console.log('Database D1 lokal belum ada; lanjut ke migrasi.')
    process.exit(0)
  }
  if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
    console.error(
      '✖ Database D1 lokal sedang dipakai, tidak ada yang dihapus. Hentikan dulu `npm run dev`,\n' +
        '  `npm run preview`, atau `wrangler dev` yang sedang berjalan, lalu ulangi perintah ini.',
    )
    process.exit(1)
  }
  throw err
}

rmSync(trashDir, { recursive: true, force: true })
console.log('Database D1 lokal dihapus.')
