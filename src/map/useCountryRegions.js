import { loadCountryRegions, loadRegionSubdivisions, loadSubregionLocalities } from '../data/loaders.js'
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

/** Communes, secteurs ou chefferies de la subdivision ouverte, si la source descend jusque-là. */
export function useSubregionLocalities(countryId, subregion) {
  const key = countryId && subregion?.subdivisions > 0 ? `${countryId}/${subregion.id}` : null
  return useGeoLayer(key, () => loadSubregionLocalities(countryId, subregion.id))
}
