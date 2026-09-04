import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listConversations, createConversation, deleteConversation } from '../api/conversations'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import ScopePicker from '../components/chat/ScopePicker'
import ConfirmDialog from '../components/common/ConfirmDialog'
import EmptyState from '../components/common/EmptyState'
import { useToast } from '../context/ToastContext'

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    listConversations().then(setConversations).catch(() => {})
  }, [])

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
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex h-full">
      <ConversationSidebar conversations={conversations} onNew={() => setShowPicker(true)} onDelete={setPendingDelete} />
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon="💬"
          title="Select a conversation, or start a new one"
          description="Chat against one document, several, or a whole collection — every answer shows exactly which chunks it came from."
          action={
            <button onClick={() => setShowPicker(true)} className="text-sm px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white">
              + New chat
            </button>
          }
        />
      </div>

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
