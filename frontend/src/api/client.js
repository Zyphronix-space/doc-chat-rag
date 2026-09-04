export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'doc_chat_rag_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/**
 * Thin fetch wrapper: attaches the bearer token, parses JSON, and turns a
 * 401 into a single central logout instead of every call site handling it.
 */
export async function apiFetch(path, { method = 'GET', json, body, headers = {}, signal } = {}) {
  const token = getToken()
  const finalHeaders = { ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  let finalBody = body
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(json)
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers: finalHeaders, body: finalBody, signal })

  if (res.status === 401) {
    onUnauthorized()
    throw new ApiError('Not authenticated', 401)
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new ApiError(errBody.detail || `Request failed with ${res.status}`, res.status)
  }

  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res
}
