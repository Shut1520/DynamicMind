import {
  AFRICAN_COUNTRY_CODES,
  DISPUTED_TERRITORY_CODES,
} from '../../src/data/africa-countries.js'

describe('liste des pays africains', () => {
  test('contient exactement 54 pays', () => {
    expect(AFRICAN_COUNTRY_CODES).toHaveLength(54)
  })

  test('ne contient que des codes ISO3 uniques en majuscules', () => {
    expect(new Set(AFRICAN_COUNTRY_CODES).size).toBe(54)
    AFRICAN_COUNTRY_CODES.forEach((code) => expect(code).toMatch(/^[A-Z]{3}$/))
  })

  test('traite le Sahara occidental comme territoire contesté, pas comme pays', () => {
    expect(DISPUTED_TERRITORY_CODES).toEqual(['ESH'])
    expect(AFRICAN_COUNTRY_CODES).not.toContain('ESH')
  })
})
