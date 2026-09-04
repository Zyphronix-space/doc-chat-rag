import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/documents', label: 'Documents', icon: '\u{1F4C4}' },
  { to: '/collections', label: 'Collections', icon: '\u{1F4C1}' },
  { to: '/conversations', label: 'Chat', icon: '\u{1F4AC}' },
  { to: '/eval', label: 'Evaluation', icon: '\u{1F9EA}' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <div className="px-4 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-accent-500 flex items-center justify-center text-white text-sm font-bold">
          D
        </div>
        <span className="font-semibold text-gray-900 dark:text-gray-100">DocIntel</span>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-800">
        AI Document Intelligence Platform
      </div>
    </aside>
  )
}
