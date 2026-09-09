import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listConversations, createConversation, deleteConversation, updateConversation } from '../api/conversations'
import ScopePicker from '../components/chat/ScopePicker'
import ConfirmDialog from '../components/common/ConfirmDialog'
import GlassCard from '../components/glass/GlassCard'
import GlassEmptyState from '../components/glass/GlassEmptyState'
import GlassButton from '../components/glass/GlassButton'
import { GlassSearchInput } from '../components/glass/GlassInput'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function Conversations() {
  const [conversations, setConversations] = useState(null)
  const [q, setQ] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const load = () => {
    listConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!conversations) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(needle))
  }, [conversations, q])

  const handleCreate = async (scope) => {
    try {
      const conv = await createConversation(scope)
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteConversation(pendingDelete.id)
      setConversations((prev) => prev.filter((c) => c.id !== pendingDelete.id))
      toast.success('Conversation deleted.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingDelete(null)
    }
  }

  const startRename = (c) => {
    setRenamingId(c.id)
    setRenameValue(c.title)
  }

  const saveRename = async (id) => {
    const title = renameValue.trim()
    setRenamingId(null)
    if (!title) return
    try {
      const updated = await updateConversation(id, { title })
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)))
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Conversations</h1>
        <GlassButton onClick={() => setShowPicker(true)}>+ New chat</GlassButton>
      </div>

      {conversations === null ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : conversations.length === 0 ? (
        <GlassEmptyState
          icon="💬"
          title="No conversations yet"
          description="Chat against one document, several, or a whole collection. Every answer shows exactly which chunks it came from."
          action={
            <GlassButton onClick={() => setShowPicker(true)}>+ New chat</GlassButton>
          }
        />
      ) : (
        <>
          <GlassSearchInput placeholder="Search conversations…" value={q} onChange={(e) => setQ(e.target.value)} />
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No conversations match "{q}".</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <GlassCard key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {renamingId === c.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => saveRename(c.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(c.id)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm font-medium"
                      />
                    ) : (
                      <Link
                        to={`/chat/${c.id}`}
                        className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-accent-600 dark:hover:text-accent-400 truncate block"
                      >
                        {c.title}
                      </Link>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.scope_type === 'collection' ? 'Collection scope' : `${c.scope_document_ids.length} document(s)`} ·
                      updated {formatTime(c.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <button onClick={() => startRename(c)} className="text-gray-400 hover:text-accent-600">
                      Rename
                    </button>
                    <button onClick={() => setPendingDelete(c)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      <ScopePicker open={showPicker} onClose={() => setShowPicker(false)} onCreate={handleCreate} />
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title}"?`}
        description="This deletes the conversation and all its messages. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
