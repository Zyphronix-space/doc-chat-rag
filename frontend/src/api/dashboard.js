import { apiFetch } from './client'

export const getSummary = () => apiFetch('/dashboard/summary')
export const getRecent = () => apiFetch('/dashboard/recent')
export const getAnalytics = () => apiFetch('/dashboard/analytics')
