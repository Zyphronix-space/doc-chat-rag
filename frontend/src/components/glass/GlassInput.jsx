export function GlassInput({ label, hint, error, className = '', id, ...rest }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 ${
          error ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function GlassSearchInput({ className = '', ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-3.8-3.8" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        {...rest}
      />
    </div>
  )
}

export default GlassInput
