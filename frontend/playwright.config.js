import { defineConfig, devices } from '@playwright/test'

// End-to-end + accessibility tests. They run against a production build
// served by `vite preview`, with every API call intercepted in the browser
// (see e2e/fixtures.js), so no backend, database or Gemini key is needed.
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /a11y\.spec\.js/ },
  ],
  webServer: {
    // The API origin is unreachable on purpose: the tests mock it, and any
    // request they forget to mock fails loudly instead of hitting production.
    command: `npx vite build --mode e2e && npx vite preview --port ${PORT} --strictPort`,
    env: { VITE_API_URL: 'http://api.e2e.invalid' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
