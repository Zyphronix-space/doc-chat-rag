import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { NAV_LINKS } from '../../lib/navLinks'

export default function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="glass-panel rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          className="md:hidden text-gray-600 dark:text-gray-300"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <button
          className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400"
          onClick={() => window.dispatchEvent(new CustomEvent('docmind:open-palette'))}
        >
          <span aria-hidden>⌘K</span> Search or jump to…
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            title="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            {theme === 'dark' ? '☀️' : '\u{1F319}'}
          </button>
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          >
            Log out
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden px-4 pb-3 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
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
