import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listConversations, createConversation } from '../api/conversations'
import ScopePicker from '../components/chat/ScopePicker'
import GlassEmptyState from '../components/glass/GlassEmptyState'
import GlassButton from '../components/glass/GlassButton'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

// The "Chat" nav item's landing spot: jump straight into the most recent
// conversation if one exists, otherwise show the scope picker inline so a
// brand-new account can start chatting in one click.
export default function NewChat() {
  const [conversations, setConversations] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    listConversations().then(setConversations).catch(() => setConversations([]))
  }, [])

  const handleCreate = async (scope) => {
    try {
      const conv = await createConversation(scope)
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (conversations === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={28} />
      </div>
    )
  }

  if (conversations.length > 0) {
    return <Navigate to={`/chat/${conversations[0].id}`} replace />
  }

  return (
    <div className="flex items-center justify-center h-full p-6">
      <GlassEmptyState
        icon="💬"
        title="Start your first chat"
        description="Chat against one document, several, or a whole collection. Every answer shows exactly which chunks it came from."
        action={<GlassButton onClick={() => setShowPicker(true)}>+ New chat</GlassButton>}
      />
      <ScopePicker open={showPicker} onClose={() => setShowPicker(false)} onCreate={handleCreate} />
    </div>
  )
}
