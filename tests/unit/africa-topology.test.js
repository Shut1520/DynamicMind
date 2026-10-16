import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import {
  AFRICAN_COUNTRY_CODES,
  DISPUTED_TERRITORY_CODES,
} from '../../src/data/africa-countries.js'

const FILE = resolve(__dirname, '../../public/geo/africa.topo.json')
const MAX_SIZE_BYTES = 300 * 1024
const SMALL_ISLAND_STATES = ['CPV', 'COM', 'MUS', 'STP', 'SYC']

const topology = JSON.parse(readFileSync(FILE, 'utf8'))
const countries = feature(topology, topology.objects.countries).features
const byId = new Map(countries.map((f) => [f.properties.id, f]))

describe('public/geo/africa.topo.json', () => {
  test('pèse moins de 300 Ko', () => {
    expect(statSync(FILE).size).toBeLessThan(MAX_SIZE_BYTES)
  })

  test('contient exactement les 54 pays cliquables', () => {
    const interactive = countries.filter((f) => f.properties.interactive).map((f) => f.properties.id)

    expect(interactive.sort()).toEqual([...AFRICAN_COUNTRY_CODES].sort())
  })

  test('contient le Sahara occidental, non cliquable', () => {
    DISPUTED_TERRITORY_CODES.forEach((code) => {
      expect(byId.get(code)?.properties.interactive).toBe(false)
    })
    expect(countries).toHaveLength(AFRICAN_COUNTRY_CODES.length + DISPUTED_TERRITORY_CODES.length)
  })

  test('donne un nom français à chaque entité', () => {
    countries.forEach((f) => expect(f.properties.name).toMatch(/\S/))
    expect(byId.get('CIV').properties.name).toBe("Côte d'Ivoire")
  })

  test('garde une surface non nulle pour chaque pays, petites îles comprises', () => {
    countries.forEach((f) => expect(geoArea(f), f.properties.id).toBeGreaterThan(0))
    SMALL_ISLAND_STATES.forEach((code) => expect(byId.has(code), code).toBe(true))
  })

  test("oriente les contours comme l'attend d3 (pas de pays « inversé » couvrant le globe)", () => {
    countries.forEach((f) => expect(geoArea(f), f.properties.id).toBeLessThan(2 * Math.PI))
  })
})
