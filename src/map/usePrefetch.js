import { useEffect, useLayoutEffect, useRef } from 'react'
import { loadCountryRegions, loadRegionSubdivisions, loadSubregionLocalities } from '../data/loaders.js'
import { buildShapes } from './useMapShapes.js'

// Un survol plus long que ce délai annonce probablement un clic : on prépare le niveau suivant.
export const PREFETCH_DELAY_MS = 250
const IDLE_TIMEOUT_MS = 500

/**
 * Ce qu'il faudrait charger si l'entité survolée était ouverte, ou null (dernier niveau).
 * @param {{ level: string, shape: { id: string, interactive: boolean, properties: object } } | undefined} entry
 * @param {string | null} countryId  pays ouvert (pour les niveaux sous le pays)
 * @returns {{ key: string, load: () => Promise<{ regions: object[] }> } | null}
 */
export function prefetchTarget(entry, countryId) {
  if (!entry?.shape.interactive) return null
  const { id, properties } = entry.shape
  if (entry.level === 'country') return { key: id, load: () => loadCountryRegions(id) }
  if (!countryId || !(properties.subdivisions > 0)) return null
  if (entry.level === 'region') return { key: `${countryId}/${id}`, load: () => loadRegionSubdivisions(countryId, id) }
  if (entry.level === 'subregion') {
    return { key: `${countryId}/${id}/local`, load: () => loadSubregionLocalities(countryId, id) }
  }
  return null
}

function whenIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = setTimeout(callback, 0)
  return () => clearTimeout(handle)
}

/**
 * Pré-charge le niveau suivant de l'entité survolée assez longtemps, puis calcule ses tracés
 * pendant un temps mort : au clic, le zoom démarre sans attendre ni saccader.
 */
export function usePrefetch(target, geo) {
  const key = target?.key ?? null
  const loadRef = useRef(target?.load)
  useLayoutEffect(() => {
    loadRef.current = target?.load
  })

  useEffect(() => {
    if (!key || !geo) return undefined
    let cancelIdle = null
    let isCancelled = false

    const timer = setTimeout(() => {
      loadRef.current?.().then(
        ({ regions }) => {
          if (!isCancelled) cancelIdle = whenIdle(() => buildShapes(regions, geo))
        },
        // Échec sans conséquence : l'ouverture réessaiera le chargement et affichera l'erreur.
        () => {},
      )
    }, PREFETCH_DELAY_MS)

    return () => {
      isCancelled = true
      clearTimeout(timer)
      cancelIdle?.()
    }
  }, [key, geo])
}
