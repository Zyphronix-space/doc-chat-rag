import { useRef } from 'react'
import Dialog from './Dialog'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  // Destructive confirmations start on Cancel, so a stray Enter can't confirm.
  const cancelRef = useRef(null)
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      role="alertdialog"
      className="max-w-sm"
      initialFocusRef={cancelRef}
    >
      <div className="mt-5 flex justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-3 py-1.5 rounded-md text-sm text-white ${
            danger ? 'bg-red-700 hover:bg-red-800' : 'bg-accent-600 hover:bg-accent-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
