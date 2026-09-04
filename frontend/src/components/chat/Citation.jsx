import { useState } from 'react'

export default function Citation({ citation, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="w-4 h-4 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] shrink-0">
          {index + 1}
        </span>
        <span className="truncate font-medium text-gray-700 dark:text-gray-200">{citation.source}</span>
        {citation.page_number != null && <span className="text-gray-400 shrink-0">· p.{citation.page_number}</span>}
        <span className="ml-auto text-gray-400 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-2.5 py-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="whitespace-pre-wrap">{citation.snippet}</p>
          {citation.distance != null && (
            <p className="text-gray-400 mt-1.5">retrieval distance: {citation.distance.toFixed(3)} (lower = closer match)</p>
          )}
        </div>
      )}
    </div>
  )
}
