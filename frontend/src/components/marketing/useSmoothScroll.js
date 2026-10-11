import { useEffect } from 'react'
import Lenis from 'lenis'
import { ScrollTrigger, gsap, prefersReducedMotion } from './motion'

let activeLenis = null

/**
 * Lenis smooth scrolling for the public marketing pages only (the signed-in
 * workspace keeps native scrolling, which suits reading documents better).
 * Driven by GSAP's ticker so Lenis and ScrollTrigger share one animation
 * loop instead of competing rAF loops. Skipped entirely when the visitor
 * prefers reduced motion. Touch devices keep native scrolling (Lenis's
 * default `syncTouch: false`), and keyboard scrolling stays native.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    const lenis = new Lenis({ autoRaf: false, lerp: 0.12 })
    activeLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      activeLenis = null
    }
  }, [])
}

/**
 * Scrolls to an in-page section and moves keyboard focus to it, so skip
 * links and nav anchors work the same for keyboard and screen-reader users
 * as for mouse users -- with or without smooth scrolling.
 */
export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const focus = () => el.focus({ preventScroll: true })
  if (activeLenis) {
    activeLenis.scrollTo(el, { offset: -72, onComplete: focus })
  } else {
    el.scrollIntoView({ block: 'start' })
    focus()
  }
}
