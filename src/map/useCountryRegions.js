import { loadCountryRegions, loadRegionSubdivisions } from '../data/loaders.js'
import { useGeoLayer } from './useGeoLayer.js'

/** Régions du pays ouvert. */
export function useCountryRegions(countryId) {
  return useGeoLayer(countryId, () => loadCountryRegions(countryId))
}

/** Subdivisions de la région ouverte, seulement si la source la découpe. */
export function useRegionSubdivisions(countryId, region) {
  const key = countryId && region?.subdivisions > 0 ? `${countryId}/${region.id}` : null
  return useGeoLayer(key, () => loadRegionSubdivisions(countryId, region.id))
}
