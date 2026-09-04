import { apiFetch } from './client'

export const listCollections = () => apiFetch('/collections')
export const getCollection = (id) => apiFetch(`/collections/${id}`)
export const createCollection = (data) => apiFetch('/collections', { method: 'POST', json: data })
export const updateCollection = (id, patch) => apiFetch(`/collections/${id}`, { method: 'PATCH', json: patch })
export const deleteCollection = (id) => apiFetch(`/collections/${id}`, { method: 'DELETE' })
export const addDocumentToCollection = (collectionId, documentId) =>
  apiFetch(`/collections/${collectionId}/documents?document_id=${documentId}`, { method: 'POST' })
export const removeDocumentFromCollection = (collectionId, documentId) =>
  apiFetch(`/collections/${collectionId}/documents/${documentId}`, { method: 'DELETE' })
