import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listConversations } from '../api/conversations'

const STATIC_COMMANDS = [
  { label: 'Upload Document', to: '/documents' },
  { label: 'New Chat', to: '/chat' },
  { label: 'Search Documents', to: '/documents' },
  { label: 'Open Collections', to: '/collections' },
  { label: 'Sources', to: '/sources' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Settings', to: '/settings' },
  { label: 'Dashboard', to: '/dashboard' },
]

// Ctrl/Cmd+K anywhere in the authenticated shell opens this (Topbar's
// search pill also dispatches the same open event). Hand-rolled — no
// cmdk/kbar dependency, just a substring filter + arrow-key nav.
export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentConversations, setRecentConversations] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const commands = useMemo(() => {
    const recent = recentConversations.slice(0, 5).map((c) => ({
      label: c.title,
      to: `/chat/${c.id}`,
      hint: 'Recent conversation',
    }))
    return [...STATIC_COMMANDS, ...recent]
  }, [recentConversations])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    function onKeyDown(e) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isToggle) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    function onOpenEvent() {
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('docmind:open-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('docmind:open-palette', onOpenEvent)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      listConversations().then(setRecentConversations).catch(() => {})
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const choose = (command) => {
    setOpen(false)
    if (command) navigate(command.to)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[activeIndex])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh] px-4"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-panel glass-panel-raised rounded-2xl w-full max-w-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full border-0 border-b border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3.5 text-sm focus:outline-none"
          placeholder="Upload, chat, search documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search commands"
        />
        {results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No matching command.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1.5" role="listbox">
            {results.map((c, i) => (
              <li key={`${c.to}-${c.label}`}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 ${
                    i === activeIndex
                      ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(c)}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <span className="truncate">{c.label}</span>
                  {c.hint && <span className="text-xs text-gray-400 shrink-0">{c.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
          ↑↓ Navigate · Enter Select · Esc Close
        </p>
      </div>
    </div>
  )
}
