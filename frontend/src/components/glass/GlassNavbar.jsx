import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { scrollToSection } from '../marketing/useSmoothScroll'
import BrandMark from '../marketing/BrandMark'

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'privacy', label: 'Your data' },
  { id: 'faq', label: 'FAQ' },
]

const linkClass =
  'rounded-md px-1 py-0.5 text-gray-700 hover:text-accent-700 dark:text-gray-200 dark:hover:text-accent-300'

// Public site header. The signed-in workspace uses GlassSidebar instead.
export default function GlassNavbar() {
  const { isAuthenticated } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const goToSection = (e, id) => {
    setMenuOpen(false)
    if (location.pathname === '/') {
      e.preventDefault()
      window.history.replaceState(null, '', `#${id}`)
      scrollToSection(id)
    }
    // Elsewhere, the Link navigates to /#id and Landing scrolls on arrival.
  }

  const sectionLinks = SECTIONS.map((s) => (
    <Link key={s.id} to={`/#${s.id}`} onClick={(e) => goToSection(e, s.id)} className={linkClass}>
      {s.label}
    </Link>
  ))

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <header className="sticky top-0 z-30 glass-panel rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md" aria-label="DocMind home">
          <BrandMark />
          <span className="font-semibold text-gray-900 dark:text-gray-100">DocMind</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
          {sectionLinks}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-full bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
            >
              Open workspace
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 sm:inline-flex dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex rounded-full bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
              >
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 md:hidden dark:text-gray-100 dark:hover:bg-gray-800"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {menuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="flex flex-col gap-3 border-t border-[var(--glass-border)] px-4 py-4 text-base md:hidden"
        >
          {sectionLinks}
          {!isAuthenticated && (
            <Link to="/login" className={linkClass}>
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
