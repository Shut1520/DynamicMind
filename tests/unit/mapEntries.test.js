import { contextLabel, regionDetails } from '../../src/map/mapEntries.js'

const shape = (properties) => ({ properties: { id: 'X', name: 'Gombe', ...properties } })

describe('regionDetails', () => {
  test('complète les propriétés avec les métadonnées du fichier', () => {
    const meta = { countryId: 'CMR', type: 'Département', parentName: 'Ouest', license: 'CC BY 4.0' }

    expect(regionDetails(shape(), meta)).toMatchObject({
      name: 'Gombe',
      countryId: 'CMR',
      type: 'Département',
      parentName: 'Ouest',
      license: 'CC BY 4.0',
      provider: 'geoBoundaries',
    })
  })

  test('le type propre à l’entité prime sur celui du fichier', () => {
    const meta = { countryId: 'COD', type: 'Secteur ou chefferie', provider: 'OpenStreetMap' }

    expect(regionDetails(shape({ type: 'Chefferie' }), meta)).toMatchObject({ type: 'Chefferie', provider: 'OpenStreetMap' })
  })

  test('valeurs par défaut sans métadonnées', () => {
    expect(regionDetails(shape(), null)).toMatchObject({
      countryId: null,
      type: 'Région',
      parentName: null,
      license: null,
      provider: 'geoBoundaries',
    })
  })
})

describe('contextLabel', () => {
  test('pays seul pour une région, « parent, pays » pour une subdivision', () => {
    expect(contextLabel({ countryId: 'CMR', parentName: null })).toBe('Cameroun')
    expect(contextLabel({ countryId: 'CMR', parentName: 'Ouest' })).toBe('Ouest, Cameroun')
  })

  test('reste lisible pour un pays inconnu', () => {
    expect(contextLabel({ countryId: 'XXX', parentName: null })).toBe('')
  })
})
