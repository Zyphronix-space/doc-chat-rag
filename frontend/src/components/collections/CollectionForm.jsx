import { useState } from 'react'

export default function CollectionForm({ initial, onSubmit, onCancel, submitLabel = 'Create' }) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, description: description || null })
      }}
      className="space-y-2"
    >
      <input
        required
        placeholder="Collection name (e.g. University)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700">
            Cancel
          </button>
        )}
        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
