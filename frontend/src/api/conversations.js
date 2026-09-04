import { API_URL, getToken, apiFetch } from './client'

export const listConversations = () => apiFetch('/conversations')
export const getConversation = (id) => apiFetch(`/conversations/${id}`)
export const createConversation = (data) => apiFetch('/conversations', { method: 'POST', json: data })
export const updateConversation = (id, patch) => apiFetch(`/conversations/${id}`, { method: 'PATCH', json: patch })
export const deleteConversation = (id) => apiFetch(`/conversations/${id}`, { method: 'DELETE' })

/**
 * Posts a question and returns the raw fetch Response for the caller to
 * stream — preserves the original app's custom wire protocol: the first
 * line is a JSON `{citations}` blob, everything after is raw answer text.
 */
export function postMessageStream(conversationId, { question, thinkLonger, signal }) {
  const token = getToken()
  return fetch(`${API_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, think_longer: thinkLonger }),
    signal,
  })
}
