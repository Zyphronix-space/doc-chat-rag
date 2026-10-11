// Shared GSAP setup for the public marketing pages. Plugins are registered
// once here; components import gsap from this module rather than 'gsap'
// directly so registration always happens first.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// Every animation is wrapped in this media query: with reduced motion
// requested, no tween is ever created and all content is simply visible.
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
