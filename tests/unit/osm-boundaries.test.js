import { geoArea } from 'd3-geo'
import {
  cleanName,
  hintedType,
  overpassToCollection,
  relationGeometry,
  stitchRings,
} from '../../scripts/lib/osm-boundaries.mjs'

const node = ([lon, lat]) => ({ lon, lat })
const way = (role, points) => ({ type: 'way', role, geometry: points.map(node) })

// Carré de 1° × 1° découpé en deux chemins, le second dans le mauvais sens.
const SQUARE_HALVES = [
  [
    [10, 0],
    [11, 0],
    [11, 1],
  ],
  [
    [10, 0],
    [10, 1],
    [11, 1],
  ],
]
const HOLE = [
  [10.4, 0.4],
  [10.6, 0.4],
  [10.6, 0.6],
  [10.4, 0.6],
  [10.4, 0.4],
]

describe('stitchRings', () => {
  test('referme un anneau à partir de chemins dans des sens différents', () => {
    const rings = stitchRings(SQUARE_HALVES)

    expect(rings).toHaveLength(1)
    expect(rings[0][0]).toEqual(rings[0].at(-1))
    expect(rings[0]).toHaveLength(5)
  })

  test('renvoie null quand le contour reste ouvert', () => {
    expect(stitchRings([SQUARE_HALVES[0]])).toBeNull()
  })
})

describe('relationGeometry', () => {
  test('oriente l’extérieur et le trou comme l’attend d3', () => {
    const relation = { members: [way('outer', SQUARE_HALVES[0]), way('', SQUARE_HALVES[1]), way('inner', HOLE)] }

    const geometry = relationGeometry(relation)

    expect(geometry.type).toBe('MultiPolygon')
    expect(geometry.coordinates[0]).toHaveLength(2)
    const area = geoArea({ type: 'Feature', geometry })
    const square = geoArea({ type: 'Polygon', coordinates: [geometry.coordinates[0][0]] })
    expect(area).toBeLessThan(square)
    expect(area).toBeGreaterThan(0)
  })

  test('renvoie null pour une relation incomplète', () => {
    expect(relationGeometry({ members: [way('outer', SQUARE_HALVES[0])] })).toBeNull()
  })
})

describe('types et noms', () => {
  test.each([
    [{ name: 'Bakisi (chefferie)' }, 'Chefferie'],
    [{ name: 'Itombwe (secteur)' }, 'Secteur'],
    [{ name: 'Bakwa-Kalonji', description: 'Chefferie' }, 'Chefferie'],
    [{ name: 'Gombe' }, null],
  ])('%o → %s', (tags, type) => {
    expect(hintedType(tags)).toBe(type)
  })

  test('retire le type entre parenthèses du nom', () => {
    expect(cleanName('Plaine de la Ruzizi (chefferie)')).toBe('Plaine de la Ruzizi')
    expect(cleanName('Secteur de Yandongi')).toBe('Secteur de Yandongi')
  })
})

describe('overpassToCollection', () => {
  test('convertit les relations nommées et signale les autres', () => {
    const members = [way('outer', SQUARE_HALVES[0]), way('outer', SQUARE_HALVES[1])]
    const response = {
      elements: [
        { type: 'relation', id: 1, tags: { name: 'Luindi (chefferie)' }, members },
        { type: 'relation', id: 2, tags: { fixme: 'Name?' }, members },
        { type: 'relation', id: 3, tags: { name: 'Ouvert' }, members: members.slice(0, 1) },
      ],
    }

    const { collection, hints, skipped } = overpassToCollection(response)

    expect(collection.features).toHaveLength(1)
    expect(collection.features[0].properties).toEqual({ shapeID: 'osm-r1', shapeName: 'Luindi' })
    expect(hints.get('osm-r1')).toBe('Chefferie')
    expect(skipped).toEqual(['r2', 'r3 (Ouvert)'])
  })

  test('rejette une réponse au format inattendu', () => {
    expect(() => overpassToCollection({ remark: 'runtime error' })).toThrow(/overpass/i)
  })
})
