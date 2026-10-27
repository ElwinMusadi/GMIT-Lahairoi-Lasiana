import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useMatches } from 'react-router'
import type { RouteHandle } from '@/router'

const SITE_NAME = 'GMIT Lahairoi Tuak Sabu Lasiana'

export default function RootLayout() {
  const title = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .filter(Boolean)
    .at(-1)

  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
