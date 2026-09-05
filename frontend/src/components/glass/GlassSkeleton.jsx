export default function GlassSkeleton({ className = '', width, height = 16 }) {
  return (
    <span
      className={`block rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:400%_100%] animate-[shimmer_1.4s_ease_infinite] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function GlassSkeletonRows({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <GlassSkeleton key={i} height={14} width={i === rows - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
