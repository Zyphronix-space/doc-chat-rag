import { useEffect, useId, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog: labelled by its title, traps Tab focus inside,
 * closes on Escape and on backdrop click, and puts focus back where it was
 * when it closes. `data-lenis-prevent` lets its content scroll normally
 * while smooth scrolling is active on the page behind it.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  className = '',
  initialFocusRef,
  role = 'dialog',
  children,
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descId = useId()
  // Callers pass inline handlers; reading them through refs keeps the effect
  // below from re-running (and re-grabbing focus) on every parent render.
  const onCloseRef = useRef(onClose)
  const initialFocusRefRef = useRef(initialFocusRef)
  useEffect(() => {
    onCloseRef.current = onClose
    initialFocusRefRef.current = initialFocusRef
  })

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    const first = initialFocusRefRef.current?.current || panel?.querySelector(FOCUSABLE) || panel
    first?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (nodes.length === 0) {
        e.preventDefault()
        return
      }
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-lenis-prevent
        onMouseDown={(e) => e.stopPropagation()}
        className={`glass-panel glass-panel-raised rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 focus:outline-none ${className}`}
      >
        <h2 id={titleId} className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        {description && (
          <p id={descId} className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
