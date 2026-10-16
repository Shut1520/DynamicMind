import { defineConfig, devices } from '@playwright/test'

// Port dédié aux tests : on ne réutilise jamais le serveur de dev ouvert par ailleurs.
const PORT = 5199

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
