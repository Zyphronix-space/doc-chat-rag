import { apiFetch } from './client'

export const listSources = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/sources${qs ? `?${qs}` : ''}`)
}
