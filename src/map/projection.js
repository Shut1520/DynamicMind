import { geoMercator } from 'd3-geo'

// Cadre du continent [longitude, latitude] : du Cap-Vert aux Seychelles/Maurice,
// de la Tunisie au cap des Aiguilles. Les îles du Prince-Édouard (-47°) restent hors cadre.
const AFRICA_FRAME = Object.freeze({
  type: 'MultiPoint',
  coordinates: [
    [-25.5, 37.6],
    [58, 37.6],
    [58, -35],
    [-25.5, -35],
  ],
})

const DEFAULT_PADDING = 16

/** Projection Mercator ajustée au conteneur, ou null si sa taille est inconnue. */
export function createProjection({ width, height, padding = DEFAULT_PADDING }) {
  if (!(width > 0 && height > 0)) {
    return null
  }

  // precision(0) : pas de rééchantillonnage adaptatif. Les contours sont déjà denses,
  // il ne fait qu'allonger le calcul des tracés (≈ 20 %) sans changer le résultat.
  return geoMercator()
    .precision(0)
    .fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      AFRICA_FRAME,
    )
}
