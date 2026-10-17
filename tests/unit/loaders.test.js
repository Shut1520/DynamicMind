import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  clearGeoCache,
  loadAfricaCountries,
  loadCountryRegions,
  loadRegionSubdivisions,
} from '../../src/data/loaders.js'

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

describe('loadCountryRegions', () => {
  const regionsText = readFileSync(resolve(__dirname, '../../public/geo/adm1/CMR.topo.json'), 'utf8')

  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => JSON.parse(regionsText) })))
  })

  afterEach(() => vi.unstubAllGlobals())

  test('charge les régions d’un pays avec leurs métadonnées', async () => {
    const { regions, meta } = await loadCountryRegions('CMR')

    expect(fetch).toHaveBeenCalledWith('/geo/adm1/CMR.topo.json')
    expect(regions).toHaveLength(10)
    expect(regions.map((r) => r.properties.name)).toContain('Extrême-Nord')
    expect(meta).toMatchObject({ countryId: 'CMR', type: 'Région' })
  })

  test('refuse un code pays invalide sans rien télécharger', async () => {
    await expect(loadCountryRegions('../secret')).rejects.toThrow(/code pays invalide/i)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('loadRegionSubdivisions', () => {
  const OUEST = '27767025B65871807342439'
  const text = readFileSync(resolve(__dirname, `../../public/geo/adm2/CMR/${OUEST}.topo.json`), 'utf8')

  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => JSON.parse(text) })))
  })

  afterEach(() => vi.unstubAllGlobals())

  test('charge les subdivisions d’une région avec leurs métadonnées', async () => {
    const { regions, meta } = await loadRegionSubdivisions('CMR', OUEST)

    expect(fetch).toHaveBeenCalledWith(`/geo/adm2/CMR/${OUEST}.topo.json`)
    expect(regions.map((r) => r.properties.name)).toContain('Menoua')
    expect(meta).toMatchObject({ parentName: 'Ouest', type: 'Département' })
  })

  test('refuse un identifiant de région invalide sans rien télécharger', async () => {
    await expect(loadRegionSubdivisions('CMR', '../../etc')).rejects.toThrow(/identifiant de région invalide/i)
    expect(fetch).not.toHaveBeenCalled()
  })
})
