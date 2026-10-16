import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import { AFRICAN_COUNTRY_CODES } from '../../src/data/africa-countries.js'

const MAX_FILE_BYTES = 300 * 1024
const REGION_TYPES = ['Wilaya', 'Région', 'Préfecture', 'Département', 'District', 'Comté', 'Gouvernorat', 'Province', 'État', 'Île']

const fileOf = (code) => resolve(__dirname, `../../public/geo/adm1/${code}.topo.json`)

const countries = AFRICAN_COUNTRY_CODES.map((code) => {
  const topology = JSON.parse(readFileSync(fileOf(code), 'utf8'))
  return { code, topology, regions: feature(topology, topology.objects.regions).features }
})

describe('public/geo/adm1/*.topo.json', () => {
  test.each(countries.map((c) => [c.code, c]))('%s : fichier léger, métadonnées complètes', (code, { topology, regions }) => {
    expect(statSync(fileOf(code)).size).toBeLessThan(MAX_FILE_BYTES)
    expect(regions.length).toBeGreaterThan(1)
    expect(topology.meta).toEqual({
      countryId: code,
      type: expect.toBeOneOf(REGION_TYPES),
      license: expect.stringMatching(/\S/),
      source: expect.stringMatching(/\S/),
      year: expect.toBeOneOf([null, expect.any(Number)]),
    })
  })

  test.each(countries.map((c) => [c.code, c]))('%s : régions bien orientées, nommées et uniques', (_code, { regions }) => {
    regions.forEach((region) => {
      expect(geoArea(region), region.properties.name).toBeLessThan(2 * Math.PI)
      expect(region.properties.name).toMatch(/\S/)
      expect(region.properties.area).toBeGreaterThan(0)
      expect(Array.isArray(region.properties.capitals)).toBe(true)
    })
    expect(new Set(regions.map((r) => r.properties.id)).size).toBe(regions.length)
    expect(new Set(regions.map((r) => r.properties.name)).size).toBe(regions.length)
  })
})
