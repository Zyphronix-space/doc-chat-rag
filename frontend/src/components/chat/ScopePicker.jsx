import { useEffect, useState } from 'react'
import { listDocuments } from '../../api/documents'
import { listCollections } from '../../api/collections'

export default function ScopePicker({ open, onClose, onCreate }) {
  const [mode, setMode] = useState('documents') // 'documents' | 'collection'
  const [documents, setDocuments] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [selectedCollectionId, setSelectedCollectionId] = useState(null)

  useEffect(() => {
    if (!open) return
    listDocuments({ status_filter: 'ready' }).then(setDocuments).catch(() => {})
    listCollections().then(setCollections).catch(() => {})
    setSelectedDocIds([])
    setSelectedCollectionId(null)
  }, [open])

  if (!open) return null

  const toggleDoc = (id) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const canCreate = mode === 'documents' ? selectedDocIds.length > 0 : !!selectedCollectionId

  const handleCreate = () => {
    if (mode === 'documents') {
      onCreate({ scope_type: 'document_set', document_ids: selectedDocIds })
    } else {
      onCreate({ scope_type: 'collection', collection_id: selectedCollectionId })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-5 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Start a new chat</h3>

        <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMode('documents')}
            className={`flex-1 text-sm py-1.5 rounded-md ${mode === 'documents' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}
          >
            Documents
          </button>
          <button
            onClick={() => setMode('collection')}
            className={`flex-1 text-sm py-1.5 rounded-md ${mode === 'collection' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}
          >
            Collection
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === 'documents' ? (
            documents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No ready documents yet. Upload one first.</p>
            ) : (
              <ul className="space-y-1">
                {documents.map((d) => (
                  <li key={d.id}>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedDocIds.includes(d.id)} onChange={() => toggleDoc(d.id)} />
                      <span className="truncate">{d.display_name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )
          ) : collections.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No collections yet.</p>
          ) : (
            <ul className="space-y-1">
              {collections.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="collection"
                      checked={selectedCollectionId === c.id}
                      onChange={() => setSelectedCollectionId(c.id)}
                    />
                    <span className="truncate">
                      📁 {c.name} <span className="text-gray-400">({c.document_count})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white"
          >
            Start chat
          </button>
        </div>
      </div>
    </div>
  )
}
