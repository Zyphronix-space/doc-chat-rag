import { expect, preConsent, signIn, test, USER } from './fixtures'

test.describe('routing', () => {
  test('the landing page is public', async ({ page }) => {
    await preConsent(page)
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('protected pages redirect to log in when signed out', async ({ page }) => {
    await preConsent(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('old legal URLs redirect to the new ones', async ({ page }) => {
    await preConsent(page)
    await page.goto('/privacy-policy')
    await expect(page).toHaveURL(/\/privacy$/)
    await page.goto('/cookie-policy')
    await expect(page).toHaveURL(/\/cookies$/)
  })

  test('unknown paths show the 404 page', async ({ page }) => {
    await preConsent(page)
    await page.goto('/no-such-page')
    await expect(page).toHaveURL(/\/404$/)
  })
})

test.describe('cookie consent', () => {
  const themeKey = (page) => page.evaluate(() => localStorage.getItem('doc_chat_rag_theme'))
  const consent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('docmind_consent')))
  const banner = (page) => page.getByRole('region', { name: 'Cookies and browser storage' })
  const themeButton = (page) => page.getByRole('button', { name: /Switch to (dark|light) theme/ }).first()

  test('rejecting optional storage is remembered, and the theme is not stored', async ({ page }) => {
    await page.goto('/')
    await banner(page).getByRole('button', { name: 'Reject optional' }).click()
    await expect(banner(page)).toBeHidden()
    expect((await consent(page)).categories).toEqual({ preferences: false })

    await themeButton(page).click()
    expect(await themeKey(page)).toBeNull()

    await page.reload()
    await expect(banner(page)).toBeHidden()
  })

  test('accepting all lets the theme persist across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await banner(page).getByRole('button', { name: 'Accept all' }).click()
    expect((await consent(page)).categories).toEqual({ preferences: true })

    await page.getByRole('button', { name: 'Switch to dark theme' }).first().click()
    expect(await themeKey(page)).toBe('dark')
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('withdrawing consent from the footer deletes the stored theme', async ({ page }) => {
    await page.goto('/')
    await banner(page).getByRole('button', { name: 'Accept all' }).click()
    await themeButton(page).click()
    expect(await themeKey(page)).not.toBeNull()

    await page.getByRole('contentinfo').getByRole('button', { name: 'Cookie settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cookie and storage preferences' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Reject optional' }).click()
    await expect(dialog).toBeHidden()
    expect(await themeKey(page)).toBeNull()
    expect((await consent(page)).categories).toEqual({ preferences: false })
  })

  test('customize saves exactly the toggled choices', async ({ page }) => {
    await page.goto('/')
    await banner(page).getByRole('button', { name: 'Customize' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cookie and storage preferences' })
    await dialog.getByRole('switch', { name: 'Preferences' }).click()
    await dialog.getByRole('button', { name: 'Save choices' }).click()
    expect((await consent(page)).categories).toEqual({ preferences: true })
  })

  test('Escape closes the preferences dialog', async ({ page }) => {
    await page.goto('/')
    await banner(page).getByRole('button', { name: 'Customize' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cookie and storage preferences' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test.describe('sign up', () => {
  test('the Terms checkbox is required', async ({ page, api }) => {
    await preConsent(page)
    await page.goto('/signup')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByLabel(/^Password/).fill('correct horse battery')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/signup$/)
    expect(api.calls('POST /auth/register')).toHaveLength(0)
    expect(await page.locator('#register-terms').evaluate((el) => el.checkValidity())).toBe(false)
  })

  test('signing up sends accept_terms and lands on the dashboard', async ({ page, api }) => {
    await preConsent(page)
    api.mock('POST /auth/register', { status: 201, json: USER })
    api.mock('POST /auth/login', { json: { access_token: 'e2e-token', token_type: 'bearer', user: USER } })
    api.mock('GET /auth/me', { json: USER })
    await page.goto('/signup')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByLabel(/^Password/).fill('correct horse battery')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    expect(api.calls('POST /auth/register')[0].body).toMatchObject({ email: 'ada@example.com', accept_terms: true })
  })
})

test.describe('forgot password', () => {
  test('when email delivery is unavailable it points to the contact page', async ({ page, api }) => {
    await preConsent(page)
    api.mock('POST /auth/forgot-password', { json: { message: 'ok', delivery: 'unavailable' } })
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/available on this deployment yet/)).toBeVisible()
    await page.getByRole('link', { name: 'contact us' }).click()
    await expect(page).toHaveURL(/\/contact$/)
  })

  test('when email delivery is on it says to check the inbox', async ({ page, api }) => {
    await preConsent(page)
    api.mock('POST /auth/forgot-password', { json: { message: 'ok', delivery: 'email', expires_in_minutes: 30 } })
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/emailed it a reset link/)).toBeVisible()
    await expect(page.getByText(/expires in 30 minutes/)).toBeVisible()
  })
})

test.describe('settings', () => {
  test('deleting the account requires the password', async ({ page, api }) => {
    await preConsent(page)
    await signIn(page, api)
    api.mock('POST /auth/logout', { json: {} })
    let attempts = 0
    api.mock('DELETE /auth/me', () =>
      ++attempts === 1
        ? { status: 403, json: { detail: 'Password is incorrect' } }
        : { json: { message: 'account deleted' } },
    )

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Security' }).click()
    await page.getByRole('button', { name: 'Delete account' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Delete account?' })
    await expect(dialog.getByLabel('Password')).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Delete account' })).toBeDisabled()

    await dialog.getByLabel('Password').fill('wrong')
    await dialog.getByRole('button', { name: 'Delete account' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('That password is incorrect.')

    await dialog.getByLabel('Password').fill('right-password')
    await dialog.getByRole('button', { name: 'Delete account' }).click()
    await expect(page).toHaveURL('/')
    expect(api.calls('DELETE /auth/me').map((c) => c.body)).toEqual([
      { password: 'wrong' },
      { password: 'right-password' },
    ])
  })

  test('"Download my data" downloads the export as JSON', async ({ page, api }) => {
    await preConsent(page)
    await signIn(page, api)
    api.mock('GET /auth/me/export', { json: { account: { email: USER.email }, documents: [] } })
    await page.goto('/settings')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download my data' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^docmind-export-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('Settings can reopen the cookie preferences', async ({ page, api }) => {
    await preConsent(page)
    await signIn(page, api)
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Cookie settings' }).click()
    await expect(page.getByRole('dialog', { name: 'Cookie and storage preferences' })).toBeVisible()
  })

  test('the app shell has a working skip link', async ({ page, api }) => {
    await preConsent(page)
    await signIn(page, api)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  })
})
