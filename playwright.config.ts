import { defineConfig, devices } from '@playwright/test'

/**
 * E2E against the production build served by `vite preview`.
 * Uses the locally installed Chrome channel so no browser download is required.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'iphone-chrome',
      use: {
        ...devices['iPhone 13'],
        channel: 'chrome',
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
