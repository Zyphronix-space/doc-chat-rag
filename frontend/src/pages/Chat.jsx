import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
} from '../api/conversations'
import { listDocuments } from '../api/documents'
import { useChatStream } from '../hooks/useChatStream'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import ScopePicker from '../components/chat/ScopePicker'
import MessageBubble from '../components/chat/MessageBubble'
import Citation from '../components/chat/Citation'
import Composer from '../components/chat/Composer'
import Icon from '../components/glass/Icon'
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

// A scroll container is "near the bottom" if within this many pixels of it —
// auto-scroll only kicks in then, so a user who's scrolled up to re-read
// earlier messages isn't yanked back down by a new streaming token.
const NEAR_BOTTOM_PX = 120

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [conversations, setConversations] = useState([])
  const [conversation, setConversation] = useState(null)
  const [documentNames, setDocumentNames] = useState({})
  const [error, setError] = useState(null)
  const [thinkLonger, setThinkLonger] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(true)
  const [mobileScopeOpen, setMobileScopeOpen] = useState(false)
  const scrollRef = useRef(null)
  const chatEndRef = useRef(null)

  const { messages, setMessages, sending, error: streamError, ask, stopGenerating } = useChatStream(id)

  useEffect(() => {
    listConversations().then(setConversations).catch(() => {})
  }, [id])

  useEffect(() => {
    listDocuments()
      .then((docs) => setDocumentNames(Object.fromEntries(docs.map((d) => [d.id, d.display_name]))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setMobileScopeOpen(false)
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

  const isNearBottom = () => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
  }

  useEffect(() => {
    if (isNearBottom()) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sending])

  const handleScroll = () => setShowScrollButton(!isNearBottom())

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

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

  const lastAssistantWithCitations = [...messages].reverse().find((m) => m.role === 'assistant' && m.citations?.length > 0)

  return (
    <div className="flex h-full relative">
      {mobileScopeOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileScopeOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${mobileScopeOpen ? 'flex' : 'hidden'} md:flex flex-col w-72 md:w-64 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-hidden fixed md:static inset-y-0 left-0 z-50 md:z-auto glass-panel-raised md:bg-transparent md:backdrop-blur-none rounded-none border-y-0 md:border-l-0`}
      >
        <button
          onClick={() => setMobileScopeOpen(false)}
          className="md:hidden self-end p-2 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
        {conversation && (
          <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              {conversation.scope_type === 'collection' ? 'Collection scope' : 'Sources'}
            </p>
            {conversation.scope_type === 'collection' ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Every ready document in this collection</p>
            ) : (
              <ul className="space-y-1">
                {conversation.scope_document_ids.map((docId) => (
                  <li key={docId} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 truncate">
                    <Icon name="check" size={14} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{documentNames[docId] || `Document #${docId}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <ConversationSidebar conversations={conversations} onNew={() => setShowPicker(true)} onDelete={setPendingDelete} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {!conversation ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] glass-panel rounded-none border-x-0 border-t-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setMobileScopeOpen(true)}
                  className="md:hidden text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Show conversations and sources"
                >
                  <Icon name="menu" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{conversation.title}</h1>
                  <p className="text-xs text-gray-400">
                    {conversation.scope_type === 'collection'
                      ? 'Searching a collection'
                      : `Searching ${conversation.scope_document_ids.length} document${conversation.scope_document_ids.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSourcesPanelOpen((v) => !v)}
                  className="hidden lg:inline text-xs text-gray-400 hover:text-accent-600"
                >
                  {sourcesPanelOpen ? 'Hide sources panel' : 'Show sources panel'}
                </button>
                <button onClick={() => setConfirmClear(true)} className="text-xs text-gray-400 hover:text-red-500">
                  Clear conversation
                </button>
              </div>
            </div>

            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full glass-panel glass-panel-raised text-gray-600 dark:text-gray-300 shadow-md"
              >
                ↓ Scroll to bottom
              </button>
            )}

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

      {sourcesPanelOpen && (
        <aside className="hidden lg:flex w-72 shrink-0 border-l border-black/[0.06] dark:border-white/[0.06] flex-col overflow-y-auto p-3 gap-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide px-1">Sources for this answer</p>
          {!lastAssistantWithCitations ? (
            <p className="text-sm text-gray-400 px-1 py-4">No citations yet. Ask a question to see sources here.</p>
          ) : (
            lastAssistantWithCitations.citations.map((c, idx) => (
              <Citation key={`${c.document_id}-${c.chunk_id}`} citation={c} index={idx} />
            ))
          )}
        </aside>
      )}

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
