import { geoPath } from 'd3-geo'
import { createProjection } from '../../src/map/projection.js'
import { buildShapes } from '../../src/map/useMapShapes.js'

const square = (id, x, y) => ({
  type: 'Feature',
  properties: { id, name: id },
  geometry: { type: 'Polygon', coordinates: [[[x, y], [x, y + 1], [x + 1, y + 1], [x + 1, y], [x, y]]] },
})

const geoFor = (width) => {
  const projection = createProjection({ width, height: 600 })
  return { projection, path: geoPath(projection) }
}

describe('buildShapes', () => {
  const features = [square('A', 10, 0), square('B', 20, 5)]

  test('calcule tracé, centre et cadre de chaque entité', () => {
    const { shapes, byId } = buildShapes(features, geoFor(800))

    expect(shapes.map((s) => s.id)).toEqual(['A', 'B'])
    expect(byId.get('A').d).toMatch(/^M/)
    expect(byId.get('A').bounds).toHaveLength(2)
    expect(byId.get('B').interactive).toBe(true)
  })

  test('réutilise les tracés déjà calculés pour les mêmes entités et la même projection', () => {
    const geo = geoFor(800)

    expect(buildShapes(features, geo)).toBe(buildShapes(features, geo))
    expect(buildShapes(features, geoFor(800))).not.toBe(buildShapes(features, geo))
  })

  test('ne calcule rien sans projection ou sans entités', () => {
    expect(buildShapes(features, null).shapes).toEqual([])
    expect(buildShapes([], geoFor(800)).shapes).toEqual([])
  })
})
