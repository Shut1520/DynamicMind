import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clearGeoCache } from '../../src/data/loaders.js'
import AfricaMap from '../../src/map/AfricaMap.jsx'

const topologyText = readFileSync(resolve(__dirname, '../../public/geo/africa.topo.json'), 'utf8')
const okResponse = () => ({ ok: true, json: async () => JSON.parse(topologyText) })

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

describe('AfricaMap', () => {
  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('affiche un message pendant le chargement', () => {
    render(<AfricaMap />)

    expect(screen.getByText(/chargement de la carte/i)).toBeInTheDocument()
  })

  test('dessine un tracé par pays, Sahara occidental compris', async () => {
    render(<AfricaMap />)

    const map = await screen.findByRole('img', { name: /carte de l'afrique/i })
    const regions = map.querySelectorAll('path.map-region')

    expect(regions).toHaveLength(55)
    regions.forEach((path) => expect(path.getAttribute('d')).toMatch(/^M/))
  })

  test('distingue le territoire contesté des pays cliquables', async () => {
    render(<AfricaMap />)

    const map = await screen.findByRole('img', { name: /carte de l'afrique/i })

    expect(map.querySelector('[data-id="ESH"]')).toHaveAttribute('data-interactive', 'false')
    expect(map.querySelector('[data-id="SEN"]')).toHaveAttribute('data-interactive', 'true')
    expect(map.querySelectorAll('[data-interactive="true"]')).toHaveLength(54)
  })

  test('affiche une erreur et permet de réessayer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    render(<AfricaMap />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/impossible de charger la carte/i)

    await userEvent.click(within(alert).getByRole('button', { name: /réessayer/i }))

    expect(await screen.findByRole('img', { name: /carte de l'afrique/i })).toBeInTheDocument()
  })
})
