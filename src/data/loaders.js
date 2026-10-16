import { feature } from 'topojson-client'

const AFRICA_URL = `${import.meta.env.BASE_URL}geo/africa.topo.json`

// Une promesse par URL : chaque fichier n'est téléchargé qu'une fois.
const cache = new Map()

export function clearGeoCache() {
  cache.clear()
}

async function fetchFeatures(url, objectName) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Chargement de la carte impossible (${response.status} ${response.statusText})`)
  }

  const topology = await response.json()
  const object = topology?.objects?.[objectName]
  if (topology?.type !== 'Topology' || !object) {
    throw new Error(`Format de carte inattendu : objet « ${objectName} » absent de ${url}`)
  }
  return feature(topology, object).features
}

function loadOnce(url, objectName) {
  if (!cache.has(url)) {
    const promise = fetchFeatures(url, objectName).catch((error) => {
      cache.delete(url)
      throw error
    })
    cache.set(url, promise)
  }
  return cache.get(url)
}

/** Pays d'Afrique (+ territoires contestés) au format GeoJSON. */
export function loadAfricaCountries() {
  return loadOnce(AFRICA_URL, 'countries')
}
