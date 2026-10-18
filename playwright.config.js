import { defineConfig, devices } from '@playwright/test'

// Port dédié aux tests : on ne réutilise jamais le serveur de dev ouvert par ailleurs.
const PORT = 5199
// Adresse IPv4 explicite : selon le navigateur, « localhost » peut désigner ::1 (IPv6) alors que
// le serveur écoute en IPv4, d'où des connexions refusées au hasard (Firefox).
const HOST = '127.0.0.1'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: `http://${HOST}:${PORT}` },
  // Les trois moteurs : Chromium (Chrome, Edge), Gecko (Firefox) et WebKit (Safari).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Tests lancés sur la version de production : pas de transformation à la demande
  // (source d'instabilité quand plusieurs navigateurs sollicitent le serveur de dev en même temps).
  webServer: {
    command: `npm run build && npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: false,
  },
})
