import { useMemo } from 'react'

const NO_SHAPES = Object.freeze({ shapes: [], byId: new Map() })

// Tracés déjà calculés, par jeu d'entités puis par projection. Les loaders renvoient toujours
// le même tableau pour un fichier : rouvrir un pays (ou l'ouvrir après un pré-chargement)
// ne recalcule rien.
const cache = new WeakMap()

function computeShapes(features, geo) {
  const shapes = features
    .map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      interactive: feature.properties.interactive ?? true,
      properties: feature.properties,
      d: geo.path(feature),
      centroid: geo.path.centroid(feature),
      bounds: geo.path.bounds(feature),
    }))
    // Ordre alphabétique : c'est l'ordre de tabulation au clavier. Les entités ne se chevauchent pas
    // (les enclaves sont des trous dans leur voisin), l'ordre de dessin n'a donc pas d'effet visible.
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return { shapes, byId: new Map(shapes.map((shape) => [shape.id, shape])) }
}

/** Tracés SVG d'une liste d'entités pour une projection donnée (mis en cache). */
export function buildShapes(features, geo) {
  if (!geo || features.length === 0) return NO_SHAPES
  if (!cache.has(features)) cache.set(features, new WeakMap())
  const byGeo = cache.get(features)
  if (!byGeo.has(geo)) byGeo.set(geo, computeShapes(features, geo))
  return byGeo.get(geo)
}

/** Tracés SVG d'une liste d'entités, recalculés seulement quand la projection ou les données changent. */
export function useMapShapes(features, geo) {
  return useMemo(() => buildShapes(features, geo), [features, geo])
}
