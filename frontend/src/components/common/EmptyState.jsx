export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-gray-500 dark:text-gray-400">
      {icon && <div className="mb-3 text-4xl opacity-60">{icon}</div>}
      <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
