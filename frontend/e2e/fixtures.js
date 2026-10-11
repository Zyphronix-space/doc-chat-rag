import { test as base, expect } from '@playwright/test'

export const API = 'http://api.e2e.invalid'

export const USER = {
  id: 1,
  email: 'ada@example.com',
  created_at: '2026-10-01T09:00:00Z',
}

/**
 * Every test gets an `api` helper. Unmocked API calls are aborted, so a test
 * can never silently depend on a real backend.
 */
export const test = base.extend({
  api: async ({ page }, provide) => {
    const calls = []
    const handlers = new Map()
    await page.route(`${API}/**`, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const key = `${req.method()} ${url.pathname}`
      calls.push({ key, body: req.postDataJSON?.() ?? null })
      const handler = handlers.get(key)
      if (!handler) return route.abort()
      const { status = 200, json } = typeof handler === 'function' ? handler(req) : handler
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json ?? {}) })
    })
    await provide({
      mock: (key, response) => handlers.set(key, response),
      calls: (key) => calls.filter((c) => c.key === key),
    })
  },
})

/** Starts the page already signed in (token in storage, /auth/me mocked). */
export async function signIn(page, api) {
  api.mock('GET /auth/me', { json: USER })
  await page.addInitScript(() => localStorage.setItem('doc_chat_rag_token', 'e2e-token'))
}

/** Records a consent decision up front so the banner doesn't cover the page. */
export async function preConsent(page, categories = { preferences: false }) {
  await page.addInitScript((c) => {
    localStorage.setItem(
      'docmind_consent',
      JSON.stringify({ version: 1, decidedAt: new Date().toISOString(), categories: c }),
    )
  }, categories)
}

export { expect }
