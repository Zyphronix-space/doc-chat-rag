import { readFileSync } from 'node:fs'
import { expect, test } from './fixtures'

// `vite preview` doesn't apply vercel.json, so this replays the production
// Content-Security-Policy onto the served HTML and fails on any violation:
// a CSP that blocks the app's own scripts, styles, fonts or images would
// otherwise only be discovered after deploying.
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const CSP = vercel.headers
  .flatMap((h) => h.headers)
  .find((h) => h.key === 'Content-Security-Policy')
  .value // upgrade-insecure-requests would rewrite the http:// preview server's URLs
  .replace(/;\s*upgrade-insecure-requests/, '')

for (const route of ['/', '/privacy', '/cookies', '/login']) {
  test(`${route} runs under the production CSP`, async ({ page }) => {
    await page.route('http://localhost:4173/**', async (r) => {
      if (r.request().resourceType() !== 'document') return r.continue()
      const response = await r.fetch()
      await r.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': CSP } })
    })
    await page.addInitScript(() => {
      window.__cspViolations = []
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI || '(inline)'}`),
      )
    })
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    // Open the consent dialog too: it's the main dynamically styled UI.
    await page.getByRole('button', { name: 'Customize' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([])
  })
}
