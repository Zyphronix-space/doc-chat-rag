// Restyle of components/common/EmptyState.jsx on the glass surface —
// same props, so either can be swapped in without touching call sites.
export default function GlassEmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`glass-panel rounded-2xl flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {icon && (
        <div className="mb-3 w-12 h-12 rounded-2xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center text-2xl">
          {icon}
        </div>
      )}
      <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
