// Hash kata sandi PBKDF2-SHA256 memakai Web Crypto, sehingga modul ini berjalan
// sama persis di Cloudflare Workers maupun Node.js (dipakai oleh scripts/seed.ts).
//
// Format tersimpan: pbkdf2_sha256$<iterasi>$<salt base64>$<hash base64>
// Jumlah iterasi ikut disimpan agar nilainya bisa dinaikkan kelak tanpa
// membuat hash lama tidak valid.

const ALGORITHM = 'pbkdf2_sha256'
// Batas maksimum iterasi PBKDF2 yang didukung runtime Cloudflare Workers.
const ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, ITERATIONS)
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(hash)].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText] = stored.split('$')
  const iterations = Number(iterationsText)
  if (algorithm !== ALGORITHM || !Number.isInteger(iterations) || iterations <= 0) return false
  if (!saltText || !hashText) return false

  const expected = fromBase64(hashText)
  const actual = await derive(password, fromBase64(saltText), iterations)
  return timingSafeEqual(actual, expected)
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    HASH_BITS,
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
}
