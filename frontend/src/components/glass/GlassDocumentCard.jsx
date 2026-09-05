import { Link } from 'react-router-dom'
import StatusBadge from '../documents/StatusBadge'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FILE_ICON = { pdf: '📕', txt: '📄', md: '📝' }

// A card-view alternative to DocumentTable's rows, for the grid layout on
// the Documents page — same data shape, same actions.
export default function GlassDocumentCard({ document: doc, collectionName, onDelete, onChat }) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden="true">
          {FILE_ICON[doc.file_type] || '📄'}
        </span>
        <StatusBadge status={doc.status} />
      </div>
      <Link
        to={`/documents/${doc.id}`}
        className="font-medium text-gray-900 dark:text-gray-100 hover:text-accent-600 dark:hover:text-accent-400 line-clamp-2 leading-snug"
      >
        {doc.display_name}
      </Link>
      <p className="text-xs text-gray-400">
        {doc.file_type.toUpperCase()} · {formatSize(doc.file_size_bytes)}
        {collectionName ? ` · ${collectionName}` : ''}
      </p>
      <div className="flex items-center gap-3 mt-1 pt-2 border-t border-gray-100 dark:border-gray-800">
        {doc.status === 'ready' && (
          <button onClick={() => onChat(doc)} className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:underline">
            Chat
          </button>
        )}
        <button onClick={() => onDelete(doc)} className="text-xs text-red-500 hover:underline ml-auto">
          Delete
        </button>
      </div>
    </div>
  )
}
