import { Link, Outlet } from 'react-router-dom'
import GlassNavbar from '../glass/GlassNavbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col app-bg text-gray-900 dark:text-gray-100">
      <GlassNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-6 space-y-2">
        <p>DocMind. Semantic search over your documents, with page-accurate citations, never fabricated.</p>
        <nav className="flex items-center justify-center gap-4">
          <Link to="/privacy-policy" className="hover:text-accent-600 dark:hover:text-accent-400">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-accent-600 dark:hover:text-accent-400">
            Terms and Conditions
          </Link>
          <Link to="/cookie-policy" className="hover:text-accent-600 dark:hover:text-accent-400">
            Cookie Policy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
