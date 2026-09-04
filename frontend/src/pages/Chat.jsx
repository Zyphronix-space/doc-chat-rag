import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
} from '../api/conversations'
import { useChatStream } from '../hooks/useChatStream'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import ScopePicker from '../components/chat/ScopePicker'
import MessageBubble from '../components/chat/MessageBubble'
import Composer from '../components/chat/Composer'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

function toDisplayMessages(detail) {
  return detail.messages.map((m) => ({
    role: m.role,
    content: m.content,
    streaming: false,
    citations: (m.sources || []).map((s) => ({
      document_id: s.document_id,
      source: s.document_name,
      chunk_id: s.chunk_id,
      chunk_index: s.chunk_index,
      page_number: s.page_number,
      snippet: s.snippet,
      distance: s.distance,
    })),
  }))
}

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [conversations, setConversations] = useState([])
  const [conversation, setConversation] = useState(null)
  const [error, setError] = useState(null)
  const [thinkLonger, setThinkLonger] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const chatEndRef = useRef(null)

  const { messages, setMessages, sending, error: streamError, ask, stopGenerating } = useChatStream(id)

  useEffect(() => {
    listConversations().then(setConversations).catch(() => {})
  }, [id])

  useEffect(() => {
    setError(null)
    setConversation(null)
    getConversation(id)
      .then((detail) => {
        setConversation(detail)
        setMessages(toDisplayMessages(detail))
      })
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleCreate = async (scope) => {
    try {
      const conv = await createConversation(scope)
      setShowPicker(false)
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteConversation = async () => {
    try {
      await deleteConversation(pendingDelete.id)
      const remaining = conversations.filter((c) => c.id !== pendingDelete.id)
      setConversations(remaining)
      if (String(pendingDelete.id) === id) {
        navigate(remaining[0] ? `/chat/${remaining[0].id}` : '/conversations')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingDelete(null)
    }
  }

  const handleClear = async () => {
    // No bulk "delete messages" endpoint exists — clearing means starting a
    // fresh conversation with the same retrieval scope, which is what a
    // user asking to "clear this chat" actually wants (an empty thread,
    // same documents), not literally recreating identical history.
    try {
      const fresh = await createConversation({
        scope_type: conversation.scope_type,
        document_ids: conversation.scope_type === 'document_set' ? conversation.scope_document_ids : undefined,
        collection_id: conversation.scope_type === 'collection' ? conversation.scope_collection_id : undefined,
        title: conversation.title,
      })
      await deleteConversation(conversation.id)
      navigate(`/chat/${fresh.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setConfirmClear(false)
    }
  }

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) ask(lastUser.content, { thinkLonger })
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  const scopeLabel = conversation
    ? conversation.scope_type === 'collection'
      ? 'Searching a collection'
      : `Searching ${conversation.scope_document_ids.length} document${conversation.scope_document_ids.length === 1 ? '' : 's'}`
    : ''

  return (
    <div className="flex h-full">
      <ConversationSidebar conversations={conversations} onNew={() => setShowPicker(true)} onDelete={setPendingDelete} />

      <div className="flex-1 flex flex-col min-w-0">
        {!conversation ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{conversation.title}</h1>
                <p className="text-xs text-gray-400">{scopeLabel}</p>
              </div>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Clear conversation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Ask anything about the documents in scope, or just say hi.
                </p>
              )}
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  isLast={i === messages.length - 1}
                  onRegenerate={m.role === 'assistant' && !sending ? handleRegenerate : null}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {streamError && <p className="px-4 text-sm text-red-500">{streamError}</p>}

            <Composer
              onSend={(q) => ask(q, { thinkLonger })}
              sending={sending}
              onStop={stopGenerating}
              thinkLonger={thinkLonger}
              onToggleThinkLonger={() => setThinkLonger((v) => !v)}
            />
          </>
        )}
      </div>

      <ScopePicker open={showPicker} onClose={() => setShowPicker(false)} onCreate={handleCreate} />
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConversation}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear this conversation?"
        description="Starts a fresh conversation with the same document/collection scope. The current message history will be deleted."
        confirmLabel="Clear"
        danger
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
