/*
 * Adapted from React Bits "SplitText" (https://reactbits.dev/text-animations/split-text)
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0.
 * See docs/ASSET-LICENSES.md.
 *
 * Changes for DocMind: animates once on mount (it's used above the fold, so
 * no ScrollTrigger), splits by words so line breaks stay natural, runs only
 * under prefers-reduced-motion: no-preference via gsap.matchMedia, and
 * relies on GSAP SplitText's built-in `aria: 'auto'` so screen readers get
 * the whole sentence instead of one word at a time.
 */
import { useRef } from 'react'
import { MOTION_OK, SplitText as GSAPSplitText, gsap, useGSAP } from './motion'

export default function SplitText({ text, as: Tag = 'p', className = '', delay = 0.05, duration = 0.9, ...rest }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        let tween
        const split = GSAPSplitText.create(ref.current, {
          type: 'words',
          wordsClass: 'split-word',
          aria: 'auto',
          onSplit(self) {
            tween?.kill()
            tween = gsap.from(self.words, {
              yPercent: 60,
              opacity: 0,
              filter: 'blur(6px)',
              duration,
              ease: 'power3.out',
              stagger: delay,
              clearProps: 'filter',
            })
            return tween
          },
        })
        return () => split.revert()
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [text] },
  )

  return (
    <Tag ref={ref} className={className} {...rest}>
      {text}
    </Tag>
  )
}
