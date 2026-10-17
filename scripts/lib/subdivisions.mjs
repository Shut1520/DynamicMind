// Rattachement des subdivisions (ADM2) à leur région (ADM1).
// geoBoundaries ne donne pas le parent d'une subdivision : on le déduit de la géométrie.
import { geoBounds, geoCentroid, geoContains } from 'd3-geo'

const VERTEX_SAMPLES = 12
const CENTROID_WEIGHT = 3
// Une région n'est découpée que si ses subdivisions couvrent à peu près sa surface.
const MIN_COVERAGE = 0.8
const MAX_COVERAGE = 1.25
const MIN_CHILDREN = 2
// Une « subdivision » qui occupe presque toute sa région est la région elle-même (niveau dupliqué).
const MAX_CHILD_SHARE = 0.9

const outerRings = (geometry) =>
  geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((polygon) => polygon[0])

function samplePoints(feature) {
  const vertices = outerRings(feature.geometry).flat()
  const step = Math.max(1, Math.floor(vertices.length / VERTEX_SAMPLES))
  return vertices.filter((_, index) => index % step === 0).slice(0, VERTEX_SAMPLES)
}

const inBox = ([lon, lat], [[west, south], [east, north]]) =>
  lon >= west && lon <= east && lat >= south && lat <= north

/**
 * Range chaque subdivision dans la région qui la contient : le centre de la subdivision
 * et un échantillon de ses sommets « votent » ; la région la plus citée l'emporte.
 * Les subdivisions qui ne tombent dans aucune région sont ignorées.
 * @returns {Map<string, object[]>} id de région → subdivisions
 */
export function assignToParents(children, parents) {
  const candidates = parents.map((parent) => ({ parent, box: geoBounds(parent) }))
  const groups = new Map()

  children.forEach((child) => {
    const centroid = geoCentroid(child)
    const points = [centroid, ...samplePoints(child)]
    const nearby = candidates.filter(({ box }) => points.some((point) => inBox(point, box)))

    const votes = nearby.map(({ parent }) => ({
      parent,
      score:
        (geoContains(parent, centroid) ? CENTROID_WEIGHT : 0) +
        samplePoints(child).filter((point) => geoContains(parent, point)).length,
    }))
    const best = votes.sort((a, b) => b.score - a.score)[0]
    if (!best || best.score === 0) return

    const id = best.parent.properties.id
    groups.set(id, [...(groups.get(id) ?? []), child])
  })

  return groups
}

/**
 * Ne garde que les régions réellement découpées : au moins deux subdivisions,
 * aucune n'occupant presque toute la région, et dont les surfaces cumulées couvrent
 * celle de la région (écarte les niveaux dupliqués ou les hiérarchies incohérentes de la source).
 */
export function keepCoherentGroups(groups, parents) {
  const areaOf = new Map(parents.map((parent) => [parent.properties.id, parent.properties.area]))

  return new Map(
    [...groups].filter(([parentId, children]) => {
      const parentArea = areaOf.get(parentId)
      const areas = children.map((child) => child.properties.area)
      const coverage = areas.reduce((sum, area) => sum + area, 0) / parentArea
      const largestShare = Math.max(...areas) / parentArea
      return (
        children.length >= MIN_CHILDREN &&
        largestShare < MAX_CHILD_SHARE &&
        coverage >= MIN_COVERAGE &&
        coverage <= MAX_COVERAGE
      )
    }),
  )
}
