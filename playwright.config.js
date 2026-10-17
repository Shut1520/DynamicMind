import { defineConfig, devices } from '@playwright/test'

// Port dédié aux tests : on ne réutilise jamais le serveur de dev ouvert par ailleurs.
const PORT = 5199

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Tests lancés sur la version de production : pas de transformation à la demande
  // (source d'instabilité quand plusieurs navigateurs sollicitent le serveur de dev en même temps).
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
