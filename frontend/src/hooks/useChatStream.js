import { useRef, useState } from 'react'
import { postMessageStream } from '../api/conversations'

// Whole-document requests (summarize/explain) feed the model far more
// context than a normal retrieval-based answer, so they can legitimately
// take much longer — the timeout has to cover that, not just a quick Q&A.
const REQUEST_TIMEOUT_MS = 60000
const THINK_LONGER_TIMEOUT_MS = 90000

/**
 * Extracted from the original single-file App.jsx's `ask()` — same custom
 * wire protocol (first line = JSON {citations}, rest = raw token text),
 * same AbortController stop/timeout behavior — just relocated so any page
 * with a conversation can reuse it instead of owning fetch/stream logic
 * itself.
 */
export function useChatStream(conversationId) {
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const setMessagesExternally = (msgs) => setMessages(msgs)

  const stopGenerating = () => {
    controllerRef.current?.abort()
  }

  const ask = async (question, { thinkLonger = false } = {}) => {
    if (!question.trim() || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setError(null)
    setSending(true)

    const assistantIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: 'assistant', content: '', citations: [], streaming: true }])

    const controller = new AbortController()
    controllerRef.current = controller
    const timeoutMs = thinkLonger ? THINK_LONGER_TIMEOUT_MS : REQUEST_TIMEOUT_MS
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await postMessageStream(conversationId, { question, thinkLonger, signal: controller.signal })
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

  return { messages, setMessages: setMessagesExternally, sending, error, ask, stopGenerating }
}
