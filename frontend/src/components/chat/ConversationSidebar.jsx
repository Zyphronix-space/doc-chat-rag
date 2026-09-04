import { NavLink, useNavigate } from 'react-router-dom'

export default function ConversationSidebar({ conversations, onNew, onDelete }) {
  const navigate = useNavigate()

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full text-sm px-3 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-medium"
        >
          + New chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-4 text-center">No conversations yet.</p>
        )}
        {conversations.map((c) => (
          <NavLink
            key={c.id}
            to={`/chat/${c.id}`}
            className={({ isActive }) =>
              `group flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-sm ${
                isActive ? 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`
            }
          >
            <span className="truncate">{c.title}</span>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(c)
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
              aria-label={`Delete ${c.title}`}
            >
              ×
            </button>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
