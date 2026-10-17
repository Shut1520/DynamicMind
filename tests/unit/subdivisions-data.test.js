import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import { AFRICAN_COUNTRY_CODES } from '../../src/data/africa-countries.js'

const GEO_DIR = resolve(__dirname, '../../public/geo')
const MAX_FILE_BYTES = 300 * 1024

const regionsOf = (code) => {
  const topology = JSON.parse(readFileSync(resolve(GEO_DIR, `adm1/${code}.topo.json`), 'utf8'))
  return feature(topology, topology.objects.regions).features
}

const countries = AFRICAN_COUNTRY_CODES.map((code) => {
  const regions = regionsOf(code)
  return { code, regions, split: regions.filter((r) => r.properties.subdivisions > 0) }
})

describe('public/geo/adm2/', () => {
  test('la grande majorité des pays ont des subdivisions', () => {
    const withSubdivisions = countries.filter((c) => c.split.length > 0)

    expect(withSubdivisions.length).toBeGreaterThanOrEqual(48)
  })

  test('aucun fichier orphelin : chaque fichier correspond à une région déclarée découpée', () => {
    countries.forEach(({ code, split }) => {
      const dir = resolve(GEO_DIR, `adm2/${code}`)
      const files = existsSync(dir) ? readdirSync(dir).sort() : []
      expect(files, code).toEqual(split.map((r) => `${r.properties.id}.topo.json`).sort())
    })
  })

  test.each(countries.filter((c) => c.split.length > 0).map((c) => [c.code, c]))(
    '%s : fichiers cohérents avec leur région',
    (code, { split }) => {
      split.forEach((region) => {
        const file = resolve(GEO_DIR, `adm2/${code}/${region.properties.id}.topo.json`)
        expect(statSync(file).size).toBeLessThan(MAX_FILE_BYTES)

        const topology = JSON.parse(readFileSync(file, 'utf8'))
        const subdivisions = feature(topology, topology.objects.regions).features
        expect(topology.meta).toMatchObject({ countryId: code, parentId: region.properties.id, parentName: region.properties.name })
        expect(subdivisions).toHaveLength(region.properties.subdivisions)
        expect(new Set(subdivisions.map((s) => s.properties.id)).size).toBe(subdivisions.length)
        subdivisions.forEach((s) => {
          expect(geoArea(s), s.properties.name).toBeLessThan(2 * Math.PI)
          expect(s.properties.name).toMatch(/\S/)
          expect(s.properties.subdivisions).toBe(0)
        })
      })
    },
  )
})
