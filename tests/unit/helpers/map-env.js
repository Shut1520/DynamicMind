import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearGeoCache } from '../../../src/data/loaders.js'

const PUBLIC_DIR = resolve(__dirname, '../../../public')

// jsdom ne calcule pas la mise en page : on simule un conteneur de 800 × 600.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {
    this.callback([{ contentRect: { width: 800, height: 600 } }])
  }
  disconnect() {}
}

/** fetch simulé qui sert les fichiers de public/ (carte du continent, régions des pays…). */
async function servePublicFile(url) {
  try {
    const text = readFileSync(resolve(PUBLIC_DIR, `.${url}`), 'utf8')
    return { ok: true, status: 200, json: async () => JSON.parse(text) }
  } catch {
    return { ok: false, status: 404, statusText: 'Not Found' }
  }
}

/**
 * Prépare jsdom pour afficher la carte : taille du conteneur, fichiers de public/ servis par fetch,
 * et « animations réduites » pour que le zoom soit instantané (donc testable sans attendre).
 */
export function setupMapEnvironment() {
  clearGeoCache()
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce') }))
  vi.stubGlobal('fetch', vi.fn(servePublicFile))
}

export function teardownMapEnvironment() {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}
