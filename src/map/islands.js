import { geoArea } from 'd3-geo'

// Surface de la Terre ≈ 510 millions de km² pour 4π stéradians.
const SQUARE_KM_TO_STERADIAN = (4 * Math.PI) / 510_072_000
// En dessous de 10 000 km², un pays est trop petit pour être survolé confortablement.
const SMALL_AREA = 10_000 * SQUARE_KM_TO_STERADIAN

/**
 * Pays cliquables trop petits pour la souris (petits États insulaires),
 * avec la position de leur repère en coordonnées écran.
 */
export function findSmallFeatures(features, path) {
  return features
    .filter((feature) => feature.properties.interactive && geoArea(feature) < SMALL_AREA)
    .map((feature) => {
      const [x, y] = path.centroid(feature)
      return { id: feature.properties.id, x, y }
    })
}
