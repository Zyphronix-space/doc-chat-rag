import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listSources } from '../api/sources'
import { listDocuments } from '../api/documents'
import GlassCard from '../components/glass/GlassCard'
import GlassEmptyState from '../components/glass/GlassEmptyState'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function Sources() {
  const [searchParams, setSearchParams] = useSearchParams()
  const documentId = searchParams.get('document_id') || ''
  const [sources, setSources] = useState(null)
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    const params = documentId ? { document_id: documentId } : {}
    listSources(params)
      .then(setSources)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [documentId])
  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => {})
  }, [])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sources</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Every citation DocMind has ever produced across your conversations, most recent first.
          </p>
        </div>
        <select
          value={documentId}
          onChange={(e) => setSearchParams(e.target.value ? { document_id: e.target.value } : {})}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm px-2.5 py-1.5"
        >
          <option value="">All documents</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name}
            </option>
          ))}
        </select>
      </div>

      {sources === null ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : sources.length === 0 ? (
        <GlassEmptyState
          icon="📎"
          title="No citations yet"
          description="Ask a question in a chat scoped to your documents — the citations it produces will show up here."
        />
      ) : (
        <div className="space-y-2.5">
          {sources.map((s) => (
            <GlassCard key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/documents/${s.document_id}`}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    {s.document_name}
                  </Link>
                  {s.page_number != null && <span className="text-xs text-gray-400 ml-1.5">· p.{s.page_number}</span>}
                </div>
                <Link
                  to={`/chat/${s.conversation_id}`}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:underline shrink-0"
                >
                  Open conversation →
                </Link>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">{s.snippet}</p>
              <p className="text-xs text-gray-400 mt-2">
                from "{s.conversation_title}" · {formatTime(s.created_at)}
              </p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
