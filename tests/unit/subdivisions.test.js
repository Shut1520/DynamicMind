import { assignToParents, keepCoherentGroups } from '../../scripts/lib/subdivisions.mjs'
import { normalizeRegions, translateRegionType } from '../../scripts/lib/region-geo.mjs'

// Rectangle [x0, x1] × [y0, y1] en degrés, orienté RFC 7946 (réorienté ensuite par normalizeRegions).
const rect = (x0, y0, x1, y1) => ({
  type: 'Polygon',
  coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
})

const collection = (shapes) => ({
  type: 'FeatureCollection',
  features: shapes.map(([id, geometry]) => ({
    type: 'Feature',
    properties: { shapeID: id, shapeName: id },
    geometry,
  })),
})

// Deux régions côte à côte (A à l'ouest, B à l'est), chacune coupée en deux subdivisions.
const parents = normalizeRegions(collection([['A', rect(0, 0, 2, 2)], ['B', rect(2, 0, 4, 2)]]), 'TST')
const children = normalizeRegions(
  collection([
    ['A1', rect(0, 0, 1, 2)],
    ['A2', rect(1, 0, 2, 2)],
    ['B1', rect(2, 0, 4, 1)],
    ['B2', rect(2, 1, 4, 2)],
  ]),
  'TST',
)

const idsOf = (features) => features.map((f) => f.properties.id).sort()

describe('assignToParents', () => {
  test('range chaque subdivision dans la région qui la contient', () => {
    const groups = assignToParents(children, parents)

    expect(idsOf(groups.get('A'))).toEqual(['A1', 'A2'])
    expect(idsOf(groups.get('B'))).toEqual(['B1', 'B2'])
  })

  test('ignore une subdivision située hors de toute région', () => {
    const outside = normalizeRegions(collection([['X', rect(10, 10, 11, 11)]]), 'TST')

    const groups = assignToParents([...children, ...outside], parents)

    expect([...groups.values()].flat().map((f) => f.properties.id)).not.toContain('X')
  })

  test('tranche par vote quand une subdivision déborde un peu sur la voisine', () => {
    const overlapping = normalizeRegions(collection([['A3', rect(0.2, 0.2, 2.3, 1.8)]]), 'TST')

    expect(idsOf(assignToParents(overlapping, parents).get('A'))).toEqual(['A3'])
  })
})

describe('keepCoherentGroups', () => {
  test('garde les régions bien découpées', () => {
    const groups = keepCoherentGroups(assignToParents(children, parents), parents)

    expect([...groups.keys()].sort()).toEqual(['A', 'B'])
  })

  test('écarte une région qui n’a qu’une subdivision (niveau dupliqué)', () => {
    const single = normalizeRegions(collection([['A0', rect(0, 0, 2, 2)]]), 'TST')

    const groups = keepCoherentGroups(assignToParents(single, parents), parents)

    expect(groups.has('A')).toBe(false)
  })

  test('écarte une région dont une « subdivision » est en fait la région elle-même (niveau dupliqué)', () => {
    // Cas de l'Algérie : le niveau ADM2 recopie les wilayas ; un éclat de la voisine s'y ajoute.
    const duplicated = normalizeRegions(collection([['A-copie', rect(0, 0, 2, 2)], ['éclat', rect(1.5, 0.8, 1.9, 1.2)]]), 'TST')

    const groups = keepCoherentGroups(assignToParents(duplicated, parents), parents)

    expect(groups.has('A')).toBe(false)
  })

  test('écarte une région dont les subdivisions ne couvrent pas la surface', () => {
    const partial = normalizeRegions(collection([['A1', rect(0, 0, 0.5, 0.5)], ['A2', rect(1, 1, 1.5, 1.5)]]), 'TST')

    const groups = keepCoherentGroups(assignToParents(partial, parents), parents)

    expect(groups.has('A')).toBe(false)
  })
})

describe('translateRegionType (subdivisions)', () => {
  test.each([
    ['Sub-Counties', 'Sous-comté'],
    ['Sub-Prefectures', 'Sous-préfecture'],
    ['Commune', 'Commune'],
    ['Municipality', 'Municipalité'],
    ['Cercle', 'Cercle'],
    ['constituencies', 'Circonscription'],
    ['territory, city', 'Territoire'],
    ['Local Government Areas', 'Zone de gouvernement local'],
    ['freguesia', 'Paroisse'],
    ['District municipality', 'District'],
  ])('%s → %s', (source, expected) => {
    expect(translateRegionType(source, 'Subdivision')).toBe(expected)
  })

  test('utilise le libellé de repli fourni quand le type est inconnu', () => {
    expect(translateRegionType('Unknown', 'Subdivision')).toBe('Subdivision')
  })
})
