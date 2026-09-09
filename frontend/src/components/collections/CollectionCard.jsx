import { Link } from 'react-router-dom'
import Icon from '../glass/Icon'

export default function CollectionCard({ collection, onDelete }) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <Link
          to={`/collections/${collection.id}`}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-accent-600 dark:hover:text-accent-400 flex items-center gap-1.5"
        >
          <Icon name="folder" size={15} className="shrink-0 text-gray-400" />
          {collection.name}
        </Link>
        <button onClick={() => onDelete(collection)} className="text-xs text-red-500 hover:underline">
          Delete
        </button>
      </div>
      {collection.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{collection.description}</p>}
      <p className="text-xs text-gray-400 mt-auto">{collection.document_count} document{collection.document_count === 1 ? '' : 's'}</p>
    </div>
  )
}
