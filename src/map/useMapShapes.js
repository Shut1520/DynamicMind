import { useMemo } from 'react'

const NO_SHAPES = Object.freeze({ shapes: [], byId: new Map() })

/** Tracés SVG d'une liste d'entités, recalculés seulement quand la projection ou les données changent. */
export function useMapShapes(features, geo) {
  return useMemo(() => {
    if (!geo || features.length === 0) return NO_SHAPES
    const shapes = features.map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      interactive: feature.properties.interactive ?? true,
      properties: feature.properties,
      d: geo.path(feature),
      centroid: geo.path.centroid(feature),
      bounds: geo.path.bounds(feature),
    }))
    return { shapes, byId: new Map(shapes.map((shape) => [shape.id, shape])) }
  }, [features, geo])
}
