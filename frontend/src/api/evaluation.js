import { apiFetch } from './client'

export const listEvalCases = () => apiFetch('/eval/cases')
export const createEvalCase = (data) => apiFetch('/eval/cases', { method: 'POST', json: data })
export const deleteEvalCase = (id) => apiFetch(`/eval/cases/${id}`, { method: 'DELETE' })
export const runEval = (caseIds) => apiFetch('/eval/run', { method: 'POST', json: { case_ids: caseIds } })
