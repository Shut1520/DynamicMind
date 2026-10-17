// Contours administratifs OpenStreetMap (réponse Overpass « out geom ») → entités GeoJSON.
// Une relation OSM décrit son contour par morceaux (chemins) qu'il faut remettre bout à bout.
import { geoArea, geoContains } from 'd3-geo'

const keyOf = ([lon, lat]) => `${lon},${lat}`
const toCoordinates = (geometry) => geometry.map(({ lon, lat }) => [lon, lat])
const MIN_RING_POINTS = 4

/**
 * Assemble des lignes bout à bout (dans un sens ou dans l'autre) en anneaux fermés.
 * @returns {number[][][] | null} null si un anneau ne se referme pas (relation incomplète)
 */
export function stitchRings(lines) {
  const pending = lines.filter((line) => line.length >= 2)
  const rings = []

  while (pending.length > 0) {
    let ring = pending.shift()
    while (keyOf(ring[0]) !== keyOf(ring.at(-1))) {
      const end = keyOf(ring.at(-1))
      const index = pending.findIndex((line) => keyOf(line[0]) === end || keyOf(line.at(-1)) === end)
      if (index < 0) return null
      const [next] = pending.splice(index, 1)
      const oriented = keyOf(next[0]) === end ? next : [...next].reverse()
      ring = [...ring, ...oriented.slice(1)]
    }
    if (ring.length >= MIN_RING_POINTS) rings.push(ring)
  }
  return rings
}

// Pour d3, un anneau extérieur seul couvre moins d'un hémisphère ; un trou, l'inverse.
const isSmallSide = (ring) => geoArea({ type: 'Polygon', coordinates: [ring] }) <= 2 * Math.PI
const asExterior = (ring) => (isSmallSide(ring) ? ring : [...ring].reverse())
const asHole = (ring) => (isSmallSide(ring) ? [...ring].reverse() : ring)

const waysWithRole = (relation, roles) =>
  relation.members
    .filter((member) => member.type === 'way' && roles.includes(member.role) && Array.isArray(member.geometry))
    .map((member) => toCoordinates(member.geometry))

/**
 * Relation OSM → MultiPolygon orienté pour d3 (chaque trou rangé dans l'extérieur qui le contient).
 * @returns {object | null} null si le contour est incomplet
 */
export function relationGeometry(relation) {
  const outers = stitchRings(waysWithRole(relation, ['outer', '']))
  if (!outers || outers.length === 0) return null
  const holes = (stitchRings(waysWithRole(relation, ['inner'])) ?? []).map(asHole)

  const coordinates = outers.map(asExterior).map((outer) => {
    const exterior = { type: 'Polygon', coordinates: [outer] }
    return [outer, ...holes.filter((hole) => geoContains(exterior, hole[0]))]
  })
  return { type: 'MultiPolygon', coordinates }
}

const TYPE_HINTS = Object.freeze([
  [/chefferie/i, 'Chefferie'],
  [/secteur/i, 'Secteur'],
  [/commune/i, 'Commune'],
])

/** Type indiqué par le nom ou la description OSM (« Bakisi (chefferie) »), sinon null. */
export function hintedType(tags = {}) {
  const text = `${tags.name ?? ''} ${tags.description ?? ''}`
  return TYPE_HINTS.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

/** « Bakisi (chefferie) » → « Bakisi » : le type est affiché à part. */
export const cleanName = (name) => name.replace(/\s*\((chefferie|secteur|commune)\)\s*$/i, '').trim()

/**
 * Réponse Overpass → FeatureCollection au format geoBoundaries (shapeID, shapeName),
 * pour passer par la même normalisation. Les relations incomplètes ou sans nom sont écartées.
 * @returns {{ collection: object, hints: Map<string, string | null>, skipped: string[] }}
 */
export function overpassToCollection(response) {
  if (!Array.isArray(response?.elements)) {
    throw new Error('Réponse Overpass inattendue (pas de liste « elements »)')
  }
  const hints = new Map()
  const skipped = []
  const features = response.elements
    .filter((element) => element.type === 'relation')
    .flatMap((relation) => {
      const name = relation.tags?.name?.trim()
      const geometry = name ? relationGeometry(relation) : null
      if (!geometry) {
        skipped.push(`r${relation.id}${name ? ` (${name})` : ''}`)
        return []
      }
      const shapeID = `osm-r${relation.id}`
      hints.set(shapeID, hintedType(relation.tags))
      return { type: 'Feature', properties: { shapeID, shapeName: cleanName(name) }, geometry }
    })
  return { collection: { type: 'FeatureCollection', features }, hints, skipped }
}
