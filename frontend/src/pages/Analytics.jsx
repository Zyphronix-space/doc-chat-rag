import { useEffect, useState } from 'react'
import { getAnalytics } from '../api/dashboard'
import StatCard from '../components/dashboard/StatCard'
import StatusChart from '../components/dashboard/StatusChart'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import GlassCard from '../components/glass/GlassCard'
import Evaluation from './Evaluation'

function ActivityBars({ days }) {
  const max = Math.max(...days.map((d) => d.count), 1)
  return (
    // The bars are percentage-height, which only resolves against a sized
    // ancestor — `items-end` (deliberately, so short bars sit on a shared
    // baseline) overrides flexbox's default `stretch`, so each day's column
    // needs an explicit `h-full` or its 0-height auto box makes every bar
    // collapse to nothing.
    <div className="flex items-end gap-[3px] h-28">
      {days.map((d) => (
        <div key={d.date} className="flex-1 h-full group relative flex items-end" title={`${d.date}: ${d.count}`}>
          <div
            className="w-full rounded-t bg-accent-400/70 dark:bg-accent-500/60 group-hover:bg-accent-500 transition-colors"
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function UsageTab({ data }) {
  const s = data.documents_by_status
  const other = (s.pending || 0) + (s.processing || 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Questions asked" value={data.total_questions_asked} accent />
        <StatCard label="Documents ready" value={s.ready || 0} />
        <StatCard label="Documents failed" value={s.failed || 0} />
      </div>

      <GlassCard>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Document processing status</h2>
        <StatusChart ready={s.ready || 0} failed={s.failed || 0} other={other} />
      </GlassCard>

      <GlassCard>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions asked · last 30 days</h2>
        <p className="text-xs text-gray-400 mb-4">Real activity from your account, nothing simulated.</p>
        <ActivityBars days={data.messages_over_time} />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
          <span>{data.messages_over_time[0]?.date.slice(5)}</span>
          <span>{data.messages_over_time[data.messages_over_time.length - 1]?.date.slice(5)}</span>
        </div>
      </GlassCard>
    </div>
  )
}

export default function Analytics() {
  const [tab, setTab] = useState('usage')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    getAnalytics().then(setData).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Real usage from your account, plus the RAG evaluation framework.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {[
          ['usage', 'Usage'],
          ['evaluation', 'Evaluation'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === key
                ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'usage' ? (
        error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !data ? (
          <div className="flex justify-center py-12">
            <Spinner size={28} />
          </div>
        ) : (
          <UsageTab data={data} />
        )
      ) : (
        <div className="-mx-6">
          <Evaluation />
        </div>
      )}
    </div>
  )
}
