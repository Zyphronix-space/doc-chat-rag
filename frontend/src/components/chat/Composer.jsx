import { useState } from 'react'

export default function Composer({ onSend, sending, onStop, thinkLonger, onToggleThinkLonger }) {
  const [value, setValue] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!value.trim() || sending) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onToggleThinkLonger}
          aria-pressed={thinkLonger}
          title="Spend more reasoning effort for a more thorough answer"
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
            thinkLonger
              ? 'bg-accent-100 border-accent-300 text-accent-700 dark:bg-accent-900/40 dark:border-accent-700 dark:text-accent-300'
              : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          🧠 Think longer
        </button>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a question, or just say hi…"
          disabled={sending}
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
        {sending ? (
          <button type="button" onClick={onStop} className="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium">
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-4 py-2 rounded-full bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-medium"
          >
            Ask
          </button>
        )}
      </form>
    </div>
  )
}
