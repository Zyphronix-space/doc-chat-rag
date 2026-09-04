import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDocuments, deleteDocument } from '../api/documents'
import { listCollections } from '../api/collections'
import { createConversation } from '../api/conversations'
import UploadDropzone from '../components/documents/UploadDropzone'
import DocumentTable from '../components/documents/DocumentTable'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function Documents() {
  const [documents, setDocuments] = useState(null)
  const [collections, setCollections] = useState([])
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
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
        <EmptyState icon="📄" title="No documents yet" description="Upload a PDF, TXT, or MD file above to get started." />
      ) : (
        <DocumentTable
          documents={documents}
          collectionsById={collectionsById}
          onDelete={setPendingDelete}
          onChat={handleChat}
        />
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
