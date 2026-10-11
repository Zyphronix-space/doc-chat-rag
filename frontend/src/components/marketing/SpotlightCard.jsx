/*
 * Adapted from React Bits "SpotlightCard" (https://reactbits.dev/components/spotlight-card)
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0.
 * See docs/ASSET-LICENSES.md.
 *
 * Changes for DocMind: reduced to the core pointer-following light (no
 * grain/flare/ambient modes) on DocMind's glass surface tokens; the light
 * position is written to CSS variables in a rAF-throttled handler, so there
 * is no per-frame animation loop. Keyboard focus inside the card lights it
 * too. Purely decorative: the light layer is aria-hidden, and nothing
 * moves with prefers-reduced-motion (the glow simply appears, no tracking).
 */
import { useRef } from 'react'

export default function SpotlightCard({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null)
  const frame = useRef(0)

  const place = (x, y) => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.style.setProperty('--spot-x', `${x}px`)
      el.style.setProperty('--spot-y', `${y}px`)
    })
  }

  const onPointerMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    place(e.clientX - rect.left, e.clientY - rect.top)
  }

  const onFocus = (e) => {
    const card = ref.current.getBoundingClientRect()
    const target = e.target.getBoundingClientRect()
    place(target.left + target.width / 2 - card.left, target.top + target.height / 2 - card.top)
  }

  return (
    <Tag ref={ref} className={`spotlight-card ${className}`} onPointerMove={onPointerMove} onFocus={onFocus} {...rest}>
      <span aria-hidden="true" className="spotlight-card__light" />
      {children}
    </Tag>
  )
}
