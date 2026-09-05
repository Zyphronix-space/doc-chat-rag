import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRecent, getSummary } from '../api/dashboard'
import StatCard from '../components/dashboard/StatCard'
import StatusChart from '../components/dashboard/StatusChart'
import StatusBadge from '../components/documents/StatusBadge'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import GlassEmptyState from '../components/glass/GlassEmptyState'
import GlassCard from '../components/glass/GlassCard'
import GlassButton from '../components/glass/GlassButton'
import CollectionForm from '../components/collections/CollectionForm'
import { createCollection } from '../api/collections'
import { useToast } from '../context/ToastContext'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState(null)
  const [error, setError] = useState(null)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const load = () => {
    setError(null)
    Promise.all([getSummary(), getRecent()])
      .then(([s, r]) => {
        setSummary(s)
        setRecent(r)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleNewCollection = async (data) => {
    try {
      await createCollection(data)
      setShowNewCollection(false)
      toast.success(`Created "${data.name}"`)
      navigate('/collections')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!summary || !recent) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Spinner size={28} />
      </div>
    )
  }

  const other = summary.total_documents - summary.documents_ready - summary.documents_failed

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex gap-2">
          <GlassButton variant="ghost" size="sm" onClick={() => navigate('/documents')}>
            Upload Document
          </GlassButton>
          <GlassButton variant="ghost" size="sm" onClick={() => setShowNewCollection(true)}>
            New Collection
          </GlassButton>
          <GlassButton size="sm" onClick={() => navigate('/chat')}>
            New Chat
          </GlassButton>
        </div>
      </div>

      {showNewCollection && (
        <GlassCard className="max-w-sm">
          <CollectionForm onSubmit={handleNewCollection} onCancel={() => setShowNewCollection(false)} />
        </GlassCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Documents" value={summary.total_documents} accent />
        <StatCard label="Collections" value={summary.total_collections} />
        <StatCard label="Conversations" value={summary.total_conversations} />
        <StatCard label="Failed uploads" value={summary.documents_failed} />
      </div>

      <GlassCard>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Document status</h2>
        <StatusChart ready={summary.documents_ready} failed={summary.documents_failed} other={Math.max(other, 0)} />
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent documents</h2>
            <Link to="/documents" className="text-xs text-accent-600 dark:text-accent-400">
              View all
            </Link>
          </div>
          {recent.recent_documents.length === 0 ? (
            <GlassEmptyState title="No documents yet" description="Upload your first document to get started." className="py-8" />
          ) : (
            <ul className="space-y-2">
              {recent.recent_documents.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/documents/${d.id}`}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    <span className="truncate">{d.display_name}</span>
                    <StatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent conversations</h2>
            <Link to="/conversations" className="text-xs text-accent-600 dark:text-accent-400">
              View all
            </Link>
          </div>
          {recent.recent_conversations.length === 0 ? (
            <GlassEmptyState title="No conversations yet" description="Start a chat scoped to a document or collection." className="py-8" />
          ) : (
            <ul className="space-y-2">
              {recent.recent_conversations.map((c) => (
                <li key={c.id}>
                  <Link to={`/chat/${c.id}`} className="block text-sm py-1.5 truncate hover:text-accent-600 dark:hover:text-accent-400">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
