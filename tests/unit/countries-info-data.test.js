import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { feature } from 'topojson-client'
import { AFRICAN_COUNTRY_CODES } from '../../src/data/africa-countries.js'
import countriesInfo from '../../src/data/countries-info.json'
import { isSafeSvg } from '../../scripts/lib/country-sources.mjs'

const ROOT = resolve(__dirname, '../..')
const topology = JSON.parse(readFileSync(resolve(ROOT, 'public/geo/africa.topo.json'), 'utf8'))
const mapNames = new Map(
  feature(topology, topology.objects.countries).features.map((f) => [f.properties.id, f.properties.name]),
)

const SUBREGIONS = ['Afrique du Nord', "Afrique de l'Ouest", 'Afrique centrale', "Afrique de l'Est", 'Afrique australe']
const countries = Object.values(countriesInfo)

describe('src/data/countries-info.json', () => {
  test('contient une fiche pour chacun des 54 pays, et rien d’autre', () => {
    expect(Object.keys(countriesInfo).sort()).toEqual([...AFRICAN_COUNTRY_CODES].sort())
  })

  test.each(countries.map((c) => [c.id, c]))('%s : fiche complète et bien typée', (_id, country) => {
    expect(country).toEqual({
      id: expect.stringMatching(/^[A-Z]{3}$/),
      name: expect.stringMatching(/\S/),
      officialName: expect.stringMatching(/\S/),
      capitals: expect.arrayContaining([expect.stringMatching(/\S/)]),
      population: expect.any(Number),
      populationYear: expect.any(Number),
      area: expect.any(Number),
      languages: expect.arrayContaining([expect.stringMatching(/\S/)]),
      currencies: expect.arrayContaining([
        expect.objectContaining({ code: expect.stringMatching(/^[A-Z]{3}$/), name: expect.stringMatching(/\S/) }),
      ]),
      callingCode: expect.stringMatching(/^\+\d+$/),
      subregion: expect.toBeOneOf(SUBREGIONS),
      demonym: expect.stringMatching(/\S/),
      flag: `/flags/${country.id.toLowerCase()}.svg`,
    })
    expect(country.population).toBeGreaterThan(0)
    expect(country.area).toBeGreaterThan(0)
  })

  test('porte les mêmes noms que la carte', () => {
    countries.forEach((c) => expect(c.name, c.id).toBe(mapNames.get(c.id)))
  })

  test('a un drapeau SVG sûr pour chaque pays', () => {
    countries.forEach((c) => {
      const file = resolve(ROOT, 'public', c.flag.slice(1))
      expect(existsSync(file), c.flag).toBe(true)
      expect(isSafeSvg(readFileSync(file, 'utf8')), c.flag).toBe(true)
    })
  })
})
