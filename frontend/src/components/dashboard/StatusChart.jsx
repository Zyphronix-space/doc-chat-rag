const COLORS = {
  ready: '#10b981',
  processing: '#f59e0b',
  failed: '#ef4444',
  other: '#9ca3af',
}

export default function StatusChart({ ready, failed, other }) {
  const total = ready + failed + other || 1
  const segments = [
    { key: 'ready', label: 'Ready', value: ready },
    { key: 'failed', label: 'Failed', value: failed },
    { key: 'other', label: 'Processing / pending', value: other },
  ].filter((s) => s.value > 0)

  if (segments.length === 0) {
    return <p className="text-sm text-gray-400">No documents yet.</p>
  }

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden w-full bg-gray-100 dark:bg-gray-800">
        {segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: COLORS[s.key] }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[s.key] }} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  )
}
