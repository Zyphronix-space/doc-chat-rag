import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../../lib/navLinks'

const ICONS = {
  '/dashboard': '⌂',
  '/documents': '\u{1F4C4}',
  '/collections': '\u{1F4C1}',
  '/chat': '\u{1F4AC}',
  '/conversations': '\u{1F553}',
  '/sources': '\u{1F4CE}',
  '/analytics': '\u{1F4CA}',
  '/settings': '\u{2699}\u{FE0F}',
}
const LINKS = NAV_LINKS.map((l) => ({ ...l, icon: ICONS[l.to] }))

export default function GlassSidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col glass-panel rounded-none border-y-0 border-l-0">
      <div className="px-4 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
          D
        </div>
        <span className="font-semibold text-gray-900 dark:text-gray-100">DocMind</span>
      </div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`
            }
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 text-xs text-gray-400 border-t border-black/[0.06] dark:border-white/[0.06]">
        AI Document Intelligence Workspace
      </div>
    </aside>
  )
}
