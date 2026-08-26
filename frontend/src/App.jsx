import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = 30000

function App() {
  const [sources, setSources] = useState([])
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/documents`)
      .then((res) => res.json())
      .then((data) => setSources(data.sources))
      .catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const uploadFile = async (file) => {
    if (!file) return
    setError(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server responded with ${res.status}`)
      }
      const data = await res.json()
      setSources(data.sources)
    } catch (err) {
      setError(`Could not upload: ${err.message}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileInput = (e) => uploadFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    uploadFile(e.dataTransfer.files[0])
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!question.trim() || sending) return

    const asked = question
    setMessages((prev) => [...prev, { role: 'user', content: asked }])
    setQuestion('')
    setError(null)
    setSending(true)

    const assistantIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [], streaming: true }])

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: asked }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server responded with ${res.status}`)
      }

      const sourcesHeader = res.headers.get('X-Sources') || ''
      const answerSources = sourcesHeader ? decodeURIComponent(sourcesHeader).split(',') : []

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          next[assistantIndex] = { role: 'assistant', content: text, sources: answerSources, streaming: true }
          return next
        })
      }

      setMessages((prev) => {
        const next = [...prev]
        next[assistantIndex] = { role: 'assistant', content: text, sources: answerSources, streaming: false }
        return next
      })
    } catch (err) {
      clearTimeout(timeout)
      const message = err.name === 'AbortError' ? 'Timed out waiting for a response.' : err.message
      setMessages((prev) => prev.slice(0, assistantIndex))
      setError(`Could not get an answer: ${message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>Chat With Your Documents</h1>
        <p className="subtitle">
          Upload a PDF, TXT, or MD file, then ask questions about it.
          Answers stream in live, grounded only in the chunks retrieved
          from your documents — a real RAG pipeline, not a plain LLM chat.
        </p>
      </header>

      <label
        className={`dropzone ${dragActive ? 'active' : ''} ${uploading ? 'busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileInput}
          disabled={uploading}
          hidden
        />
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="dropzone-text">
          {uploading ? 'Uploading…' : 'Drop a file here, or click to upload'}
        </span>
        <span className="dropzone-hint">PDF, TXT, or MD</span>
      </label>

      {sources.length > 0 && (
        <div className="sources">
          {sources.map((s) => (
            <span key={s} className="source-pill">
              {s}
            </span>
          ))}
        </div>
      )}

      <section className="chat">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Ask anything — a real question about your documents, or just say hi.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`avatar ${m.role}`}>{m.role === 'user' ? 'Y' : 'AI'}</div>
            <div className={`bubble ${m.role}`}>
              {m.content ? (
                m.role === 'assistant' ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  <p>{m.content}</p>
                )
              ) : (
                <span className="typing">
                  <span />
                  <span />
                  <span />
                </span>
              )}
              {m.sources && m.sources.length > 0 && (
                <p className="bubble-sources">Sources: {m.sources.join(', ')}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </section>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleAsk} className="ask-form">
        <input
          type="text"
          placeholder="Ask a question, or just say hi…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !question.trim()}>
          {sending ? 'Sending…' : 'Ask'}
        </button>
      </form>
    </main>
  )
}

export default App
