import ReactMarkdown from 'react-markdown'
import Citation from './Citation'

export default function MessageBubble({ message, onRegenerate, isLast }) {
  const isUser = message.role === 'user'

  const copy = () => navigator.clipboard.writeText(message.content)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
          isUser ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-accent-500 text-white'
        }`}
      >
        {isUser ? 'Y' : 'AI'}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? 'bg-accent-500 text-white rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          {message.content ? (
            isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )
          ) : (
            <span className="flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s] opacity-60" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s] opacity-60" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce opacity-60" />
            </span>
          )}
        </div>

        {!isUser && message.citations?.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.citations.map((c, idx) => (
              <Citation key={`${c.document_id}-${c.chunk_id}`} citation={c} index={idx} />
            ))}
          </div>
        )}

        {!isUser && !message.streaming && message.content && (
          <div className="flex gap-3 text-xs text-gray-400">
            <button onClick={copy} className="hover:text-accent-600 dark:hover:text-accent-400">
              Copy
            </button>
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} className="hover:text-accent-600 dark:hover:text-accent-400">
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
