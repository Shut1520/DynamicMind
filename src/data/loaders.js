import { feature } from 'topojson-client'

const GEO_BASE = `${import.meta.env.BASE_URL}geo/`
const AFRICA_URL = `${GEO_BASE}africa.topo.json`
const COUNTRY_CODE = /^[A-Z]{3}$/
const REGION_ID = /^[0-9A-Za-z-]+$/

// Une promesse par URL : chaque fichier n'est téléchargé qu'une fois.
const cache = new Map()

export function clearGeoCache() {
  cache.clear()
}

async function fetchTopology(url, objectName) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Chargement de la carte impossible (${response.status} ${response.statusText})`)
  }

  const topology = await response.json()
  const object = topology?.objects?.[objectName]
  if (topology?.type !== 'Topology' || !object) {
    throw new Error(`Format de carte inattendu : objet « ${objectName} » absent de ${url}`)
  }
  return { features: feature(topology, object).features, meta: topology.meta ?? null }
}

function loadOnce(url, objectName) {
  if (!cache.has(url)) {
    const promise = fetchTopology(url, objectName).catch((error) => {
      cache.delete(url)
      throw error
    })
    cache.set(url, promise)
  }
  return cache.get(url)
}

/** Pays d'Afrique (+ territoires contestés) au format GeoJSON. */
export async function loadAfricaCountries() {
  const { features } = await loadOnce(AFRICA_URL, 'countries')
  return features
}

/** Régions (ADM1) d'un pays, avec les métadonnées de la source (type, licence…). */
export async function loadCountryRegions(countryId) {
  if (!COUNTRY_CODE.test(String(countryId))) {
    throw new Error(`Code pays invalide : ${countryId}`)
  }
  const { features, meta } = await loadOnce(`${GEO_BASE}adm1/${countryId}.topo.json`, 'regions')
  return { regions: features, meta }
}

async function loadChildren(level, countryId, parentId) {
  if (!COUNTRY_CODE.test(String(countryId))) {
    throw new Error(`Code pays invalide : ${countryId}`)
  }
  if (!REGION_ID.test(String(parentId))) {
    throw new Error(`Identifiant de région invalide : ${parentId}`)
  }
  const { features, meta } = await loadOnce(`${GEO_BASE}${level}/${countryId}/${parentId}.topo.json`, 'regions')
  return { regions: features, meta }
}

/** Subdivisions (ADM2) d'une région, avec les métadonnées de la source (type, région parente…). */
export function loadRegionSubdivisions(countryId, regionId) {
  return loadChildren('adm2', countryId, regionId)
}

/** Communes, secteurs ou chefferies d'une subdivision (niveau local, là où il existe). */
export function loadSubregionLocalities(countryId, subregionId) {
  return loadChildren('adm3', countryId, subregionId)
}
