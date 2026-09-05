import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, { type = 'info', duration = 4000 } = {}) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const toast = {
    info: (m, opts) => push(m, { ...opts, type: 'info' }),
    success: (m, opts) => push(m, { ...opts, type: 'success' }),
    error: (m, opts) => push(m, { ...opts, type: 'error' }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`glass-panel glass-panel-raised rounded-xl px-4 py-3 text-sm animate-in fade-in slide-in-from-bottom-2 border-l-4 ${
              t.type === 'error'
                ? 'border-l-red-500 text-red-700 dark:text-red-300'
                : t.type === 'success'
                  ? 'border-l-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'border-l-accent-500 text-gray-800 dark:text-gray-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
