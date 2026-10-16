import { selectAfricanFeatures, buildAfricaTopology } from '../../scripts/lib/africa-geo.mjs'

const square = (x, y, size = 1) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]],
})

const feature = (props, geometry = square(0, 0)) => ({
  type: 'Feature',
  properties: props,
  geometry,
})

const SAMPLE = [
  feature({ ADM0_A3: 'SEN', ISO_A3_EH: 'SEN', NAME: 'Senegal', NAME_FR: 'Sénégal' }, square(0, 0)),
  feature({ ADM0_A3: 'SDS', ISO_A3_EH: 'SSD', NAME: 'S. Sudan', NAME_FR: 'Soudan du Sud' }, square(2, 0)),
  feature({ ADM0_A3: 'SOM', ISO_A3_EH: 'SOM', NAME: 'Somalia', NAME_FR: 'Somalie' }, square(4, 0)),
  feature({ ADM0_A3: 'SOL', ISO_A3_EH: '-99', NAME: 'Somaliland', NAME_FR: 'Somaliland' }, square(4, 1)),
  feature({ ADM0_A3: 'SAH', ISO_A3_EH: 'ESH', NAME: 'W. Sahara', NAME_FR: 'Sahara occidental' }, square(6, 0)),
  feature({ ADM0_A3: 'SHN', ISO_A3_EH: 'SHN', NAME: 'Saint Helena', NAME_FR: 'Sainte-Hélène' }, square(8, 0)),
  feature({ ADM0_A3: 'FRA', ISO_A3_EH: 'FRA', NAME: 'France', NAME_FR: 'France' }, square(10, 0)),
]

describe('selectAfricanFeatures', () => {
  test('garde les pays de la liste et le territoire contesté, écarte le reste', () => {
    const ids = selectAfricanFeatures(SAMPLE).map((f) => f.properties.id)

    expect(ids).toEqual(expect.arrayContaining(['SEN', 'SSD', 'SOM', 'ESH']))
    expect(ids).not.toContain('SHN')
    expect(ids).not.toContain('FRA')
  })

  test('utilise le code ISO3 et le nom français', () => {
    const southSudan = selectAfricanFeatures(SAMPLE).find((f) => f.properties.id === 'SSD')

    expect(southSudan.properties).toEqual({ id: 'SSD', name: 'Soudan du Sud', interactive: true })
  })

  test('rattache le Somaliland à la Somalie', () => {
    const somalia = selectAfricanFeatures(SAMPLE).filter((f) => f.properties.id === 'SOM')

    expect(somalia).toHaveLength(2)
    somalia.forEach((f) => expect(f.properties.name).toBe('Somalie'))
  })

  test('rend le Sahara occidental non cliquable', () => {
    const sahara = selectAfricanFeatures(SAMPLE).find((f) => f.properties.id === 'ESH')

    expect(sahara.properties.interactive).toBe(false)
  })

  test('ne modifie pas les entités sources', () => {
    const before = JSON.stringify(SAMPLE)
    selectAfricanFeatures(SAMPLE)

    expect(JSON.stringify(SAMPLE)).toBe(before)
  })
})

describe('buildAfricaTopology', () => {
  test('produit une seule géométrie par code, Somaliland fusionné', () => {
    const topology = buildAfricaTopology(selectAfricanFeatures(SAMPLE))
    const geometries = topology.objects.countries.geometries

    expect(geometries.map((g) => g.properties.id).sort()).toEqual(['ESH', 'SEN', 'SOM', 'SSD'])
    expect(geometries.find((g) => g.properties.id === 'SOM').type).toMatch(/Polygon/)
  })

  test('conserve les propriétés id, name et interactive', () => {
    const topology = buildAfricaTopology(selectAfricanFeatures(SAMPLE))
    const senegal = topology.objects.countries.geometries.find((g) => g.properties.id === 'SEN')

    expect(senegal.properties).toEqual({ id: 'SEN', name: 'Sénégal', interactive: true })
  })
})
