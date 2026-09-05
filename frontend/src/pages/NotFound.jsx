import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-5xl">🤷</p>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Page not found</h1>
      <Link to="/dashboard" className="text-sm text-accent-600 dark:text-accent-400">
        Back to dashboard
      </Link>
    </div>
  )
}
