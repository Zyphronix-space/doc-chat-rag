import { Outlet } from 'react-router-dom'
import GlassSidebar from '../glass/GlassSidebar'
import Topbar from './Topbar'
import CommandPalette from '../CommandPalette'

export default function AppShell() {
  return (
    <div className="flex h-screen app-bg text-gray-900 dark:text-gray-100">
      <GlassSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
