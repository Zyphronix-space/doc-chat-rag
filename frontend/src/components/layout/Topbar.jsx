import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/documents', label: 'Documents' },
  { to: '/collections', label: 'Collections' },
  { to: '/conversations', label: 'Chat' },
  { to: '/eval', label: 'Evaluation' },
]

export default function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          className="md:hidden text-gray-600 dark:text-gray-300"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            title="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === 'dark' ? '☀️' : '\u{1F319}'}
          </button>
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Log out
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden px-4 pb-3 flex flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300' : 'text-gray-600 dark:text-gray-300'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
