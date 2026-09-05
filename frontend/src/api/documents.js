import { API_URL, apiFetch, getToken } from './client'

export const listDocuments = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/documents${qs ? `?${qs}` : ''}`)
}

export const getDocument = (id) => apiFetch(`/documents/${id}`)

export const semanticSearchDocuments = (q, limit = 8) => {
  const qs = new URLSearchParams({ q, limit }).toString()
  return apiFetch(`/documents/semantic-search?${qs}`)
}

export const updateDocument = (id, patch) => apiFetch(`/documents/${id}`, { method: 'PATCH', json: patch })

export const deleteDocument = (id) => apiFetch(`/documents/${id}`, { method: 'DELETE' })

// A plain <a href> can't carry the Authorization header, so "Open" fetches
// the file through apiFetch and opens it as a local blob URL instead.
export async function openDocumentFile(id) {
  const res = await apiFetch(`/documents/${id}/file`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export async function uploadDocument(file, { collectionId, onProgress, signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  const qs = collectionId ? `?collection_id=${collectionId}` : ''

  // Uses XMLHttpRequest instead of fetch so real upload-progress events are
  // available (fetch's request-body streaming progress isn't reliably
  // exposed across browsers) — the drag-and-drop dropzone shows this live.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/documents${qs}`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(body)
        else reject(new Error(body.detail || `Upload failed with ${xhr.status}`))
      } catch {
        reject(new Error('Upload failed: could not parse server response'))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    if (signal) signal.addEventListener('abort', () => xhr.abort())
    xhr.send(formData)
  })
}
