import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDocuments, deleteDocument } from '../api/documents'
import { listCollections } from '../api/collections'
import { createConversation } from '../api/conversations'
import UploadDropzone from '../components/documents/UploadDropzone'
import DocumentTable from '../components/documents/DocumentTable'
import GlassDocumentCard from '../components/glass/GlassDocumentCard'
import GlassEmptyState from '../components/glass/GlassEmptyState'
import { GlassSearchInput } from '../components/glass/GlassInput'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useToast } from '../context/ToastContext'

const SORTS = {
  newest: (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at),
  oldest: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at),
  name: (a, b) => a.display_name.localeCompare(b.display_name),
  size: (a, b) => b.file_size_bytes - a.file_size_bytes,
}

export default function Documents() {
  const [documents, setDocuments] = useState(null)
  const [collections, setCollections] = useState([])
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [q, setQ] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState('grid')
  const toast = useToast()
  const navigate = useNavigate()

  const load = () => {
    setError(null)
    Promise.all([listDocuments(), listCollections()])
      .then(([docs, colls]) => {
        setDocuments(docs)
        setCollections(colls)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  // Documents can still be `processing`/`pending` briefly after upload;
  // poll while any are in that state so the status badge updates live.
  useEffect(() => {
    if (!documents?.some((d) => d.status === 'pending' || d.status === 'processing')) return
    const id = setInterval(() => listDocuments().then(setDocuments).catch(() => {}), 2000)
    return () => clearInterval(id)
  }, [documents])

  const collectionsById = Object.fromEntries(collections.map((c) => [c.id, c]))

  const filtered = useMemo(() => {
    if (!documents) return []
    let result = documents
    const needle = q.trim().toLowerCase()
    if (needle) result = result.filter((d) => d.display_name.toLowerCase().includes(needle))
    if (collectionFilter) result = result.filter((d) => String(d.collection_id) === collectionFilter)
    if (statusFilter) result = result.filter((d) => d.status === statusFilter)
    return [...result].sort(SORTS[sort])
  }, [documents, q, collectionFilter, statusFilter, sort])

  const handleDelete = async () => {
    try {
      await deleteDocument(pendingDelete.id)
      setDocuments((prev) => prev.filter((d) => d.id !== pendingDelete.id))
      toast.success(`Deleted "${pendingDelete.display_name}"`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingDelete(null)
    }
  }

  const handleChat = async (doc) => {
    try {
      const conv = await createConversation({ scope_type: 'document_set', document_ids: [doc.id] })
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Documents</h1>
      </div>

      <UploadDropzone onUploaded={(doc) => setDocuments((prev) => (prev ? [doc, ...prev] : [doc]))} />

      {documents === null ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : documents.length === 0 ? (
        <GlassEmptyState icon="📄" title="No documents yet" description="Upload a PDF, TXT, or MD file above to get started." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <GlassSearchInput
              placeholder="Search by filename…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-[180px]"
            />
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-2.5 py-2"
            >
              <option value="">All collections</option>
              <option value="null">Unfiled</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-2.5 py-2"
            >
              <option value="">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-2.5 py-2"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="size">Largest first</option>
            </select>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setView('grid')}
                className={`text-xs px-2.5 py-1 rounded-md ${view === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setView('table')}
                className={`text-xs px-2.5 py-1 rounded-md ${view === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                Table
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No documents match your filters.</p>
          ) : view === 'table' ? (
            <DocumentTable documents={filtered} collectionsById={collectionsById} onDelete={setPendingDelete} onChat={handleChat} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <GlassDocumentCard
                  key={d.id}
                  document={d}
                  collectionName={d.collection_id ? collectionsById[d.collection_id]?.name : null}
                  onDelete={setPendingDelete}
                  onChat={handleChat}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.display_name}"?`}
        description="This removes the document, its extracted chunks, and the file on disk. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
