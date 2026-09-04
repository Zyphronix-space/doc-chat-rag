import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentTable({ documents, collectionsById, onDelete, onChat }) {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Name</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-left px-4 py-2.5 font-medium">Collection</th>
            <th className="text-left px-4 py-2.5 font-medium">Chunks</th>
            <th className="text-left px-4 py-2.5 font-medium">Uploaded</th>
            <th className="text-right px-4 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {documents.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <td className="px-4 py-2.5">
                <Link to={`/documents/${d.id}`} className="font-medium text-gray-800 dark:text-gray-100 hover:text-accent-600 dark:hover:text-accent-400">
                  {d.display_name}
                </Link>
                <div className="text-xs text-gray-400">{d.file_type.toUpperCase()} · {formatSize(d.file_size_bytes)}</div>
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={d.status} />
              </td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                {d.collection_id ? collectionsById?.[d.collection_id]?.name || '—' : '—'}
              </td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{d.chunk_count}</td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{new Date(d.uploaded_at).toLocaleDateString()}</td>
              <td className="px-4 py-2.5 text-right space-x-2">
                {d.status === 'ready' && (
                  <button onClick={() => onChat(d)} className="text-xs text-accent-600 dark:text-accent-400 hover:underline">
                    Chat
                  </button>
                )}
                <button onClick={() => onDelete(d)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
