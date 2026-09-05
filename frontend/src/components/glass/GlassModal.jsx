// Generalizes ConfirmDialog.jsx's backdrop/panel pattern into a reusable
// modal shell for anything else that needs an overlay dialog (Settings'
// delete-account confirmation still uses ConfirmDialog directly, since
// that pattern already works well and is well-tested).
export default function GlassModal({ open, onClose, title, className = '', children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`glass-panel glass-panel-raised rounded-2xl max-w-md w-full p-5 ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
