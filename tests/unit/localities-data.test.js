import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'

const GEO_DIR = resolve(__dirname, '../../public/geo')
const MAX_FILE_BYTES = 300 * 1024
const KINSHASA = '28894549B68389240291046'
const LOCAL_TYPES = ['Commune', 'Secteur', 'Chefferie', 'Secteur ou chefferie']

const read = (path) => {
  const topology = JSON.parse(readFileSync(resolve(GEO_DIR, path), 'utf8'))
  return { meta: topology.meta, features: feature(topology, topology.objects.regions).features }
}

const drcSubdivisions = readdirSync(resolve(GEO_DIR, 'adm2/COD')).flatMap((file) => read(`adm2/COD/${file}`).features)
const split = drcSubdivisions.filter((s) => s.properties.subdivisions > 0)

describe('niveau local de la RDC (communes, secteurs, chefferies)', () => {
  test('Kinshasa est découpée en ses 24 communes', () => {
    const { meta, features } = read(`adm2/COD/${KINSHASA}.topo.json`)
    const names = features.map((f) => f.properties.name)

    expect(meta).toMatchObject({ provider: 'OpenStreetMap', type: 'Commune', parentName: 'Kinshasa' })
    expect(features).toHaveLength(24)
    ;['Gombe', 'Lingwala', 'Ngaliema', 'Limete', 'Masina', 'Kimbanseke', 'Maluku'].forEach((name) =>
      expect(names).toContain(name),
    )
    features.forEach((f) => expect(f.properties.type).toBe('Commune'))
  })

  test('plusieurs territoires et villes descendent jusqu’au niveau local', () => {
    expect(split.length).toBeGreaterThanOrEqual(10)
  })

  test('aucun fichier orphelin dans adm3/COD', () => {
    const files = readdirSync(resolve(GEO_DIR, 'adm3/COD')).sort()

    expect(files).toEqual(split.map((s) => `${s.properties.id}.topo.json`).sort())
  })

  test.each(split.map((s) => [s.properties.name, s]))('%s : fichier cohérent avec sa subdivision', (name, parent) => {
    const path = `adm3/COD/${parent.properties.id}.topo.json`
    expect(statSync(resolve(GEO_DIR, path)).size).toBeLessThan(MAX_FILE_BYTES)
    const { meta, features } = read(path)

    expect(meta).toMatchObject({ countryId: 'COD', provider: 'OpenStreetMap', parentId: parent.properties.id, parentName: name })
    expect(meta.license).toMatch(/Open Database License/)
    expect(features).toHaveLength(parent.properties.subdivisions)
    features.forEach((f) => {
      expect(geoArea(f), f.properties.name).toBeLessThan(2 * Math.PI)
      expect(f.properties.name).toMatch(/\S/)
      expect(f.properties.name).not.toMatch(/\((chefferie|secteur)\)/i)
      expect(LOCAL_TYPES).toContain(f.properties.type)
      expect(f.properties.subdivisions).toBe(0)
    })
  })

  test('les autres pays n’ont pas de niveau local', () => {
    expect(readdirSync(resolve(GEO_DIR, 'adm3'))).toEqual(['COD'])
    expect(existsSync(resolve(GEO_DIR, 'adm3/CMR'))).toBe(false)
  })
})
