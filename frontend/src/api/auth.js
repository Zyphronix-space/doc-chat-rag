import { apiFetch } from './client'

export const register = (email, password) => apiFetch('/auth/register', { method: 'POST', json: { email, password } })

export const login = (email, password) => apiFetch('/auth/login', { method: 'POST', json: { email, password } })

export const logout = () => apiFetch('/auth/logout', { method: 'POST' })

export const me = () => apiFetch('/auth/me')

export const forgotPassword = (email) => apiFetch('/auth/forgot-password', { method: 'POST', json: { email } })

export const resetPassword = (token, newPassword) =>
  apiFetch('/auth/reset-password', { method: 'POST', json: { token, new_password: newPassword } })

export const changePassword = (currentPassword, newPassword) =>
  apiFetch('/auth/change-password', {
    method: 'PATCH',
    json: { current_password: currentPassword, new_password: newPassword },
  })

export const deleteAccount = () => apiFetch('/auth/me', { method: 'DELETE' })
