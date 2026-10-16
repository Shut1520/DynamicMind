import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearGeoCache } from '../../../src/data/loaders.js'

const topologyText = readFileSync(resolve(__dirname, '../../../public/geo/africa.topo.json'), 'utf8')

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

/**
 * Prépare jsdom pour afficher la carte : taille du conteneur, fichier TopoJSON servi par fetch,
 * et « animations réduites » pour que le zoom soit instantané (donc testable sans attendre).
 */
export function setupMapEnvironment() {
  clearGeoCache()
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce') }))
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => JSON.parse(topologyText) })),
  )
}

export function teardownMapEnvironment() {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}
