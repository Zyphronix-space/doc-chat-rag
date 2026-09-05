import { Outlet } from 'react-router-dom'
import GlassNavbar from '../glass/GlassNavbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col app-bg text-gray-900 dark:text-gray-100">
      <GlassNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-6">
        DocMind · Semantic search over your documents · page-accurate citations, never fabricated
      </footer>
    </div>
  )
}
