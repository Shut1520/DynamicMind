import { geoPath } from 'd3-geo'
import { useMemo } from 'react'
import { createProjection } from './projection.js'

/** Projection + générateur de tracés SVG pour un conteneur de taille donnée. */
export function useProjection(width, height) {
  return useMemo(() => {
    const projection = createProjection({ width, height })
    return projection ? { projection, path: geoPath(projection) } : null
  }, [width, height])
}
