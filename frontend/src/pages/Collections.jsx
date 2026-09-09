import { useEffect, useState } from 'react'
import { listCollections, createCollection, deleteCollection } from '../api/collections'
import CollectionCard from '../components/collections/CollectionCard'
import CollectionForm from '../components/collections/CollectionForm'
import EmptyState from '../components/common/EmptyState'
import Icon from '../components/glass/Icon'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function Collections() {
  const [collections, setCollections] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const toast = useToast()

  const load = () => {
    setError(null)
    listCollections().then(setCollections).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleCreate = async (data) => {
    try {
      const coll = await createCollection(data)
      setCollections((prev) => [...prev, coll])
      setShowForm(false)
      toast.success(`Created "${coll.name}"`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCollection(pendingDelete.id)
      setCollections((prev) => prev.filter((c) => c.id !== pendingDelete.id))
      toast.success('Collection deleted. Documents were un-filed, not deleted.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingDelete(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Collections</h1>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white">
          + New collection
        </button>
      </div>

      {showForm && (
        <div className="glass-panel rounded-2xl p-4 max-w-sm">
          <CollectionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {collections === null ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<Icon name="folder" size={28} />}
          title="No collections yet"
          description="Group related documents into folders, like 'University' or 'Research'."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Documents inside it will be un-filed, not deleted."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
