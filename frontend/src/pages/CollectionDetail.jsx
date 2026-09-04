import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCollection, updateCollection, removeDocumentFromCollection, addDocumentToCollection } from '../api/collections'
import { listDocuments } from '../api/documents'
import { createConversation } from '../api/conversations'
import StatusBadge from '../components/documents/StatusBadge'
import CollectionForm from '../components/collections/CollectionForm'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

export default function CollectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [collection, setCollection] = useState(null)
  const [unfiled, setUnfiled] = useState([])
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const load = () => {
    setError(null)
    Promise.all([getCollection(id), listDocuments()])
      .then(([c, allDocs]) => {
        setCollection(c)
        setUnfiled(allDocs.filter((d) => d.collection_id !== Number(id) && d.status === 'ready'))
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [id])

  const handleSave = async (data) => {
    try {
      const updated = await updateCollection(id, data)
      setCollection((prev) => ({ ...prev, ...updated }))
      setEditing(false)
      toast.success('Saved.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRemove = async (docId) => {
    try {
      await removeDocumentFromCollection(id, docId)
      load()
      toast.success('Removed from collection.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleChatWithCollection = async () => {
    try {
      const conv = await createConversation({ scope_type: 'collection', collection_id: Number(id) })
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!collection) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/collections')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-accent-600">
        ← Back to collections
      </button>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
        {editing ? (
          <CollectionForm initial={collection} onSubmit={handleSave} onCancel={() => setEditing(false)} submitLabel="Save" />
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📁 {collection.name}</h1>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-accent-600">
                  Edit
                </button>
                <button onClick={handleChatWithCollection} className="text-xs px-2 py-1 rounded-md bg-accent-500 hover:bg-accent-600 text-white">
                  Chat with this collection
                </button>
              </div>
            </div>
            {collection.description && <p className="text-sm text-gray-500 dark:text-gray-400">{collection.description}</p>}
          </>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Documents ({collection.documents.length})
        </h2>
        {collection.documents.length === 0 ? (
          <EmptyState title="No documents in this collection yet" description="Add documents below." />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {collection.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900">
                <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{d.display_name}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <button onClick={() => handleRemove(d.id)} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unfiled.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add a document</h2>
          <AddDocumentPicker collectionId={id} candidates={unfiled} onAdded={load} />
        </div>
      )}
    </div>
  )
}

function AddDocumentPicker({ collectionId, candidates, onAdded }) {
  const toast = useToast()

  const handleAdd = async (docId) => {
    try {
      await addDocumentToCollection(collectionId, docId)
      onAdded()
      toast.success('Added.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <select
      onChange={(e) => {
        if (e.target.value) handleAdd(Number(e.target.value))
        e.target.value = ''
      }}
      className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-2 py-1.5"
      defaultValue=""
    >
      <option value="" disabled>
        Select a document to add…
      </option>
      {candidates.map((d) => (
        <option key={d.id} value={d.id}>
          {d.display_name}
        </option>
      ))}
    </select>
  )
}
