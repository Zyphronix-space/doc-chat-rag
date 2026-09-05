import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDocument, updateDocument, deleteDocument, openDocumentFile } from '../api/documents'
import { listCollections } from '../api/collections'
import { createConversation } from '../api/conversations'
import StatusBadge from '../components/documents/StatusBadge'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [doc, setDoc] = useState(null)
  const [collections, setCollections] = useState([])
  const [error, setError] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    setError(null)
    Promise.all([getDocument(id), listCollections()])
      .then(([d, c]) => {
        setDoc(d)
        setName(d.display_name)
        setCollections(c)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [id])

  const saveRename = async () => {
    try {
      const updated = await updateDocument(id, { display_name: name })
      setDoc(updated)
      setRenaming(false)
      toast.success('Renamed.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const moveTo = async (collectionId) => {
    try {
      const updated = await updateDocument(id, { collection_id: collectionId || null })
      setDoc(updated)
      toast.success(collectionId ? 'Moved.' : 'Removed from collection.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteDocument(id)
      toast.success('Document deleted.')
      navigate('/documents')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleChat = async () => {
    try {
      const conv = await createConversation({ scope_type: 'document_set', document_ids: [Number(id)] })
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!doc) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/documents')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-accent-600">
        ← Back to documents
      </button>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          {renaming ? (
            <div className="flex-1 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-lg font-semibold"
                autoFocus
              />
              <button onClick={saveRename} className="text-sm text-accent-600 dark:text-accent-400">
                Save
              </button>
              <button onClick={() => setRenaming(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          ) : (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-all">{doc.display_name}</h1>
          )}
          <StatusBadge status={doc.status} />
        </div>

        {doc.status === 'failed' && doc.status_error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-md p-2">
            {doc.status_error}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">File type</dt>
          <dd className="text-gray-800 dark:text-gray-200">{doc.file_type.toUpperCase()}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Uploaded</dt>
          <dd className="text-gray-800 dark:text-gray-200">{new Date(doc.uploaded_at).toLocaleString()}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Pages</dt>
          <dd className="text-gray-800 dark:text-gray-200">{doc.page_count ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Chunks</dt>
          <dd className="text-gray-800 dark:text-gray-200">{doc.chunk_count}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Collection</dt>
          <dd>
            <select
              value={doc.collection_id || ''}
              onChange={(e) => moveTo(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-1.5 py-0.5"
            >
              <option value="">Unfiled</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </dd>
        </dl>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => openDocumentFile(id).catch((err) => toast.error(err.message))}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Open
          </button>
          {doc.status === 'ready' && (
            <button onClick={handleChat} className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white">
              Chat
            </button>
          )}
          <button
            onClick={() => setRenaming(true)}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Rename
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm px-3 py-1.5 rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 ml-auto"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${doc.display_name}"?`}
        description="This removes the document, its extracted chunks, and the file on disk. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
