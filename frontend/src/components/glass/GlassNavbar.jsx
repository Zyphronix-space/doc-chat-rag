import { Link, useNavigate } from 'react-router-dom'
import GlassButton from './GlassButton'

// Public marketing nav — Landing/Features/Login/Signup. The authenticated
// shell uses GlassSidebar instead, not this.
export default function GlassNavbar() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 glass-panel rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent-500 flex items-center justify-center text-white font-bold shadow-sm">
            D
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">DocMind</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
          <Link to="/" className="hover:text-accent-600 dark:hover:text-accent-400">
            Home
          </Link>
          <Link to="/features" className="hover:text-accent-600 dark:hover:text-accent-400">
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <GlassButton variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Log in
          </GlassButton>
          <GlassButton size="sm" onClick={() => navigate('/signup')}>
            Get started
          </GlassButton>
        </div>
      </div>
    </header>
  )
}
