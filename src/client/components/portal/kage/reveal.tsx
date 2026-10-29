import type { ComponentProps, ElementType } from 'react'
import { registerReveal } from '@/lib/portal-motion'

// Penanda gerak "muncul" rancangan kage: naik 25px dan memudar sekali saat masuk layar.
// Pengamatnya ada di lapisan gerak portal (lib/portal-motion.ts); tanpa lapisan itu,
// atau saat pengguna meminta kurangi gerak, isinya langsung tampil.

type Props<T extends ElementType> = { as?: T } & Omit<ComponentProps<T>, 'as'>

export function Reveal<T extends ElementType = 'div'>({ as, ...props }: Props<T>) {
  const Tag: ElementType = as ?? 'div'
  return <Tag data-reveal="" {...props} ref={registerReveal} />
}
