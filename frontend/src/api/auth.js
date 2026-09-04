import { apiFetch } from './client'

export const register = (email, password) => apiFetch('/auth/register', { method: 'POST', json: { email, password } })

export const login = (email, password) => apiFetch('/auth/login', { method: 'POST', json: { email, password } })

export const logout = () => apiFetch('/auth/logout', { method: 'POST' })

export const me = () => apiFetch('/auth/me')
