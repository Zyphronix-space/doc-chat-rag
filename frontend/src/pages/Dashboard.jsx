import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecent, getSummary } from '../api/dashboard'
import StatCard from '../components/dashboard/StatCard'
import StatusChart from '../components/dashboard/StatusChart'
import StatusBadge from '../components/documents/StatusBadge'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState(null)
  const [error, setError] = useState(null)

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
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Documents" value={summary.total_documents} accent />
        <StatCard label="Collections" value={summary.total_collections} />
        <StatCard label="Conversations" value={summary.total_conversations} />
        <StatCard label="Failed uploads" value={summary.documents_failed} />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Document status</h2>
        <StatusChart ready={summary.documents_ready} failed={summary.documents_failed} other={Math.max(other, 0)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent documents</h2>
            <Link to="/documents" className="text-xs text-accent-600 dark:text-accent-400">
              View all
            </Link>
          </div>
          {recent.recent_documents.length === 0 ? (
            <EmptyState title="No documents yet" description="Upload your first document to get started." />
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
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent conversations</h2>
            <Link to="/conversations" className="text-xs text-accent-600 dark:text-accent-400">
              View all
            </Link>
          </div>
          {recent.recent_conversations.length === 0 ? (
            <EmptyState title="No conversations yet" description="Start a chat scoped to a document or collection." />
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
        </div>
      </div>
    </div>
  )
}
