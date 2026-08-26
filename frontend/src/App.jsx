import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = 30000

function buildSuggestions(sources) {
  if (sources.length === 0) {
    return ['hi', 'what can you help me with?']
  }
  const suggestions = [`Summarize ${sources[0]}`]
  if (sources[1]) suggestions.push(`What is ${sources[1]} about?`)
  suggestions.push('hi')
  return suggestions
}

function Citation({ citation, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="citation">
      <button className="citation-chip" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="citation-index">{index + 1}</span>
        {citation.source}
      </button>
      {open && <p className="citation-snippet">{citation.snippet}</p>}
    </div>
  )
}

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
  const controllerRef = useRef(null)

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

  const removeSource = async (filename) => {
    try {
      const res = await fetch(`${API_URL}/documents/one?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      setSources(data.sources)
    } catch {
      setError('Could not remove that document')
    }
  }

  const clearAll = async () => {
    try {
      await fetch(`${API_URL}/documents`, { method: 'DELETE' })
      setSources([])
    } catch {
      setError('Could not clear documents')
    }
  }

  const stopGenerating = () => {
    controllerRef.current?.abort()
  }

  const ask = async (asked) => {
    if (!asked.trim() || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: asked }])
    setQuestion('')
    setError(null)
    setSending(true)

    const assistantIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: 'assistant', content: '', citations: [], streaming: true }])

    const controller = new AbortController()
    controllerRef.current = controller
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

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let citations = []
      let metaParsed = false
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        if (!metaParsed) {
          const newlineAt = buffer.indexOf('\n')
          if (newlineAt === -1) continue
          try {
            citations = JSON.parse(buffer.slice(0, newlineAt)).citations || []
          } catch {
            citations = []
          }
          metaParsed = true
          text = buffer.slice(newlineAt + 1)
          buffer = ''
        } else {
          text += buffer
          buffer = ''
        }

        setMessages((prev) => {
          const next = [...prev]
          next[assistantIndex] = { role: 'assistant', content: text, citations, streaming: true }
          return next
        })
      }

      setMessages((prev) => {
        const next = [...prev]
        next[assistantIndex] = { ...next[assistantIndex], streaming: false }
        return next
      })
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        setMessages((prev) => {
          const next = [...prev]
          if (next[assistantIndex]) {
            next[assistantIndex] = {
              ...next[assistantIndex],
              content: next[assistantIndex].content || '_Stopped._',
              streaming: false,
            }
          }
          return next
        })
      } else {
        setMessages((prev) => prev.slice(0, assistantIndex))
        setError(`Could not get an answer: ${err.message}`)
      }
    } finally {
      setSending(false)
      controllerRef.current = null
    }
  }

  const handleAsk = (e) => {
    e.preventDefault()
    ask(question)
  }

  const suggestions = buildSuggestions(sources)

  return (
    <main className="page">
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <h1>DocChat</h1>
            <p className="brand-sub">RAG over your own documents</p>
          </div>

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
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{uploading ? 'Uploading…' : 'Upload a document'}</span>
          </label>

          <div className="doc-list">
            {sources.length === 0 && <p className="muted small">No documents yet</p>}
            {sources.map((s) => (
              <div className="doc-item" key={s}>
                <span className="doc-name" title={s}>
                  {s}
                </span>
                <button className="doc-remove" onClick={() => removeSource(s)} aria-label={`Remove ${s}`}>
                  ×
                </button>
              </div>
            ))}
          </div>

          {sources.length > 0 && (
            <button className="clear-all" onClick={clearAll}>
              Clear all
            </button>
          )}
        </aside>

        <section className="main">
          <p className="subtitle">
            Answers stream in live, grounded only in the documents on the
            left. Click a citation under an answer to see the exact passage
            it came from.
          </p>

          <div className="chat" aria-live="polite">
            {messages.length === 0 && (
              <div className="empty-state">
                <p>Ask anything — a real question about your documents, or just say hi.</p>
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button key={s} className="suggestion-chip" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
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
                  {m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      {m.citations.map((c, idx) => (
                        <Citation key={c.source} citation={c} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {error && <p className="error">{error}</p>}

          <form onSubmit={handleAsk} className="ask-form">
            <input
              type="text"
              placeholder="Ask a question, or just say hi…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={sending}
            />
            {sending ? (
              <button type="button" className="stop-btn" onClick={stopGenerating}>
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!question.trim()}>
                Ask
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}

export default App
