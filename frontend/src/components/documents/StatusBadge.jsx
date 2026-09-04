const STYLES = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[status] || STYLES.pending}`}>
      {status}
    </span>
  )
}
