import { useEffect, useState } from 'react'
import { api, errorMessage, type ApiRequestOptions } from '@/lib/api'

export type ApiQuery<T> = {
  // Data terakhir yang berhasil dimuat. Tetap tersedia selama memuat ulang atau saat
  // filter berganti, agar tata letak tidak melompat.
  data: T | undefined
  loading: boolean
  // Pesan error untuk permintaan terakhir, atau null.
  error: string | null
  reload: () => void
}

type Settled<T> = { key: string; data: T | undefined; error: string | null }

// GET ke API dengan pembatalan otomatis saat komponen dilepas atau query berubah.
// `path` null berarti tidak memuat apa pun (mis. untuk peran yang tidak berhak).
export function useApiQuery<T>(
  path: string | null,
  query?: ApiRequestOptions['query'],
): ApiQuery<T> {
  const queryKey = JSON.stringify(query ?? {})
  const [version, setVersion] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const key = `${path}?${queryKey}#${version}`

  useEffect(() => {
    if (path === null) return
    const controller = new AbortController()
    api
      .get<T>(path, {
        query: JSON.parse(queryKey) as ApiRequestOptions['query'],
        signal: controller.signal,
      })
      .then(
        (data) => setSettled({ key, data, error: null }),
        (err: unknown) => {
          if (controller.signal.aborted) return
          setSettled((previous) => ({ key, data: previous?.data, error: errorMessage(err) }))
        },
      )
    return () => controller.abort()
  }, [path, queryKey, key])

  const isCurrent = settled?.key === key
  return {
    data: settled?.data,
    loading: path !== null && !isCurrent,
    error: isCurrent ? settled.error : null,
    reload: () => setVersion((v) => v + 1),
  }
}
