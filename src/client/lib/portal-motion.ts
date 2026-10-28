import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { useLocation } from 'react-router'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Lapisan gerak Portal Publik, persis rancangan kage (design/stitch/manifest.json):
// gulir halus Lenis, parallax hero dan foto latar, elemen "muncul" sekali saat masuk
// layar, dan elemen yang melayang mengikuti gulir. Semuanya hanya transform/opacity,
// digerakkan satu loop requestAnimationFrame, dan mati bila pengunjung meminta kurangi
// gerak. Tanpa lapisan ini isi halaman tetap lengkap dan terbaca.

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const lerp = (from: number, to: number, t: number) => from + (to - from) * t

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// --- Satu loop untuk semua elemen yang bergerak --------------------------------------
// Setiap pembaruan membaca ukuran dulu lalu mengembalikan fungsi tulis, sehingga semua
// pembacaan layout terjadi sebelum semua penulisan transform (tanpa layout thrashing).

type Update = (viewportHeight: number) => (() => void) | void
const updates = new Set<Update>()
let ticking = false

function runUpdates() {
  ticking = false
  const viewportHeight = window.innerHeight
  const writes: (() => void)[] = []
  updates.forEach((update) => {
    const write = update(viewportHeight)
    if (write) writes.push(write)
  })
  writes.forEach((write) => write())
}

function scheduleUpdate() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(runUpdates)
}

function addUpdate(update: Update) {
  updates.add(update)
  scheduleUpdate()
  return () => {
    updates.delete(update)
  }
}

// --- Gulir halus (Lenis) ---------------------------------------------------------------

let lenis: Lenis | null = null

// Konfigurasi runnova.ai dari manifest rancangan. syncTouch tidak dinyalakan: gulir
// sentuh tetap gulir asli ponsel; Lenis menghaluskan roda tetikus dan tautan jangkar.
const LENIS_OPTIONS = {
  duration: 1.1,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.5,
  anchors: true,
  // Isi dialog, sheet, menu, dan popover Radix digulir sendiri oleh browser.
  prevent: (node: HTMLElement) =>
    node.getAttribute('role') === 'dialog' ||
    node.getAttribute('role') === 'menu' ||
    node.hasAttribute('data-radix-popper-content-wrapper'),
} as const

// Dipanggil sekali oleh PublicLayout: menyalakan Lenis dan loop gerak, lalu mematikan
// semuanya saat pindah ke dashboard atau halaman login.
export function usePortalMotion() {
  const location = useLocation()

  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = document.documentElement
    root.classList.add('portal-motion')

    const instance = new Lenis(LENIS_OPTIONS)
    lenis = instance
    let frame = requestAnimationFrame(function loop(time) {
      instance.raf(time)
      frame = requestAnimationFrame(loop)
    })

    // Radix mengunci gulir halaman saat dialog/sheet terbuka (body[data-scroll-locked]);
    // Lenis ikut berhenti agar roda tetikus tidak menggulir halaman di belakangnya.
    const lockObserver = new MutationObserver(() => {
      if (document.body.hasAttribute('data-scroll-locked')) instance.stop()
      else instance.start()
    })
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked'],
    })

    // Gulir dari luar Lenis (tombol keyboard, bilah gulir, scrollTo, Cari di halaman).
    // Lenis hanya menyelaraskannya saat diam; saat sedang meluncur ia menimpanya pada frame
    // berikutnya. Di sini luncuran dihentikan di posisi baru itu. Lompatan asli browser ke
    // jangkar menuju sasaran yang sama dengan luncuran Lenis, jadi dibiarkan ditimpa agar
    // jangkar tetap meluncur halus. Diperiksa juga sebelum roda tetikus diolah, untuk gulir
    // yang event scroll-nya belum sempat terkirim.
    const followNativeScroll = () => {
      const actual = instance.actualScroll
      if (
        instance.isScrolling !== 'native' &&
        Math.abs(actual - instance.animatedScroll) > 2 &&
        Math.abs(actual - instance.targetScroll) > 4
      ) {
        instance.scrollTo(actual, { immediate: true, force: true })
      }
    }
    window.addEventListener('scroll', followNativeScroll, { passive: true })
    window.addEventListener('wheel', followNativeScroll, { capture: true, passive: true })

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()

    return () => {
      cancelAnimationFrame(frame)
      lockObserver.disconnect()
      window.removeEventListener('scroll', followNativeScroll)
      window.removeEventListener('wheel', followNativeScroll, { capture: true })
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      instance.destroy()
      lenis = null
      root.classList.remove('portal-motion')
    }
  }, [])

  // Pindah halaman: ScrollRestoration memulihkan atau menaikkan posisi gulir dengan
  // gulir asli; Lenis disamakan sesudahnya agar animasi lama tidak berlanjut.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      lenis?.resize()
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
      scheduleUpdate()
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key])
}

// Gulir ke sebuah elemen: halus lewat Lenis bila aktif, jika tidak memakai gulir asli
// (instan bila pengguna meminta kurangi gerak). scroll-margin-top elemen dihormati.
export function scrollToElement(element: HTMLElement) {
  if (lenis) lenis.scrollTo(element)
  else element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

// --- Muncul (reveal) -------------------------------------------------------------------
// Elemen [data-reveal] disembunyikan CSS hanya selama html.portal-motion aktif, lalu
// diberi kelas is-visible sekali saat masuk layar (margin −80px). Elemen yang sudah
// terlewati tanpa sempat terlihat (lompatan jangkar) langsung ditampilkan.

let revealObserver: IntersectionObserver | null = null
const pendingReveals = new Set<Element>()

function showReveal(element: Element) {
  element.classList.add('is-visible')
  pendingReveals.delete(element)
  revealObserver?.unobserve(element)
}

const revealPastUpdate: Update = () => {
  if (pendingReveals.size === 0) return
  const passed = [...pendingReveals].filter((element) => element.getBoundingClientRect().bottom < 0)
  if (passed.length > 0) return () => passed.forEach(showReveal)
}

// Ref callback untuk <Reveal>; mengembalikan fungsi pembersih (React 19).
export function registerReveal(element: Element | null) {
  if (!element) return
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    element.classList.add('is-visible')
    return
  }
  revealObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && showReveal(entry.target)),
    { rootMargin: '-80px 0px' },
  )
  if (pendingReveals.size === 0) addUpdate(revealPastUpdate)
  pendingReveals.add(element)
  revealObserver.observe(element)
  return () => {
    pendingReveals.delete(element)
    revealObserver?.unobserve(element)
    if (pendingReveals.size === 0) updates.delete(revealPastUpdate)
  }
}

// --- Parallax hero ---------------------------------------------------------------------
// Offset ["start start", "end start"]: foto turun 0→28% dan membesar 1,02→1,15; judul
// turun 0→10% dan memudar 1→0,15 selama hero digulir keluar.

export function useHeroParallax(
  hero: RefObject<HTMLElement | null>,
  media: RefObject<HTMLElement | null>,
  copy?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const heroEl = hero.current
    const mediaEl = media.current
    const copyEl = copy?.current ?? null
    if (!heroEl || !mediaEl || prefersReducedMotion()) return
    const remove = addUpdate(() => {
      const rect = heroEl.getBoundingClientRect()
      const p = rect.height > 0 ? clamp(-rect.top / rect.height, 0, 1) : 0
      return () => {
        mediaEl.style.transform = `translate3d(0, ${(p * 28).toFixed(2)}%, 0) scale(${lerp(1.02, 1.15, p).toFixed(4)})`
        if (copyEl) {
          copyEl.style.transform = `translate3d(0, ${(clamp(p / 0.8, 0, 1) * 10).toFixed(2)}%, 0)`
          copyEl.style.opacity = lerp(1, 0.15, clamp(p / 0.65, 0, 1)).toFixed(3)
        }
      }
    })
    return () => {
      remove()
      mediaEl.style.removeProperty('transform')
      copyEl?.style.removeProperty('transform')
      copyEl?.style.removeProperty('opacity')
    }
  }, [hero, media, copy])
}

// --- Parallax foto latar ---------------------------------------------------------------
// Foto di-pan setinggi aslinya tanpa zoom (band ±340px, footer ±420px). Offset
// ["start end", "end start"] terhadap bingkainya; tinggi minimum 100% + 2×travel agar
// tepi foto tidak pernah terlihat. Posisi diam (tanpa gerak) dipasang oleh CSS
// [data-parallax-bg]: tepat di tengah bingkai.

export function useBackgroundParallax(image: RefObject<HTMLElement | null>, travel: number) {
  useLayoutEffect(() => {
    const imageEl = image.current
    if (!imageEl || prefersReducedMotion()) return
    imageEl.style.setProperty('min-height', `calc(100% + ${2 * travel}px)`)
    const remove = addUpdate((viewportHeight) => {
      const frame = imageEl.parentElement?.getBoundingClientRect()
      if (!frame) return
      const p = clamp((viewportHeight - frame.top) / (viewportHeight + frame.height), 0, 1)
      return () => {
        imageEl.style.transform = `translate3d(0, calc(-50% + ${lerp(-travel, travel, p).toFixed(1)}px), 0)`
      }
    })
    return () => {
      remove()
      imageEl.style.removeProperty('min-height')
      imageEl.style.removeProperty('transform')
    }
  }, [image, travel])
}

// --- Melayang (float) ------------------------------------------------------------------
// Elemen bergeser dari `from` ke `to` piksel selama bingkainya (scope) melintasi layar.

export function useFloat(
  element: RefObject<HTMLElement | null>,
  from: number,
  to: number,
  scope?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const el = element.current
    const frameEl = scope?.current ?? el
    if (!el || !frameEl || prefersReducedMotion()) return
    const remove = addUpdate((viewportHeight) => {
      const rect = frameEl.getBoundingClientRect()
      const p = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1)
      return () => {
        el.style.transform = `translate3d(0, ${lerp(from, to, p).toFixed(2)}px, 0)`
      }
    })
    return () => {
      remove()
      el.style.removeProperty('transform')
    }
  }, [element, from, to, scope])
}
