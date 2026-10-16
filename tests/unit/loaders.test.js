import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearGeoCache, loadAfricaCountries } from '../../src/data/loaders.js'

const topologyText = readFileSync(resolve(__dirname, '../../public/geo/africa.topo.json'), 'utf8')

const okResponse = () => ({ ok: true, json: async () => JSON.parse(topologyText) })

describe('loadAfricaCountries', () => {
  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))
  })

  afterEach(() => vi.unstubAllGlobals())

  test('renvoie les 55 entités de la carte en GeoJSON', async () => {
    const countries = await loadAfricaCountries()

    expect(countries).toHaveLength(55)
    expect(countries[0]).toMatchObject({ type: 'Feature', properties: { id: expect.any(String) } })
    expect(fetch).toHaveBeenCalledWith('/geo/africa.topo.json')
  })

  test('ne télécharge le fichier qu’une seule fois', async () => {
    await loadAfricaCountries()
    await loadAfricaCountries()

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('échoue avec un message clair si le serveur répond une erreur', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })

    await expect(loadAfricaCountries()).rejects.toThrow(/carte.*404/i)
  })

  test('échoue si le fichier ne contient pas l’objet attendu', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'Topology', objects: {} }) })

    await expect(loadAfricaCountries()).rejects.toThrow(/format/i)
  })

  test('permet de réessayer après un échec', async () => {
    fetch.mockRejectedValueOnce(new Error('réseau coupé'))

    await expect(loadAfricaCountries()).rejects.toThrow()
    await expect(loadAfricaCountries()).resolves.toHaveLength(55)
  })
})
