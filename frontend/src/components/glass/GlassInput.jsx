import { useId } from 'react'

export function GlassInput({ label, hint, error, className = '', id, ...rest }) {
  // Without an explicit id the label still has to point at its input.
  const autoId = useId()
  const inputId = id || autoId
  const noteId = `${inputId}-note`
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? noteId : undefined}
        className={`w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 ${
          error ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'
        } ${className}`}
        {...rest}
      />
      {hint && !error && (
        <p id={noteId} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={noteId} className="text-xs text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
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
