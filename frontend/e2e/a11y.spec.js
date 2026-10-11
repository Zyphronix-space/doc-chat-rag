import AxeBuilder from '@axe-core/playwright'
import { expect, preConsent, test } from './fixtures'

const PUBLIC_ROUTES = [
  '/',
  '/features',
  '/login',
  '/signup',
  '/forgot-password',
  '/privacy',
  '/terms',
  '/refunds',
  '/cookies',
  '/contact',
]

async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}

for (const route of PUBLIC_ROUTES) {
  for (const scheme of ['light', 'dark']) {
    test(`${route} has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await preConsent(page)
      await page.goto(route)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await expectNoViolations(page)
    })
  }
}

test('the cookie banner itself is accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Cookies and browser storage' })).toBeVisible()
  await expectNoViolations(page)
})

test('the skip link moves focus to the main content', async ({ page }) => {
  await preConsent(page)
  await page.goto('/privacy')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
})
