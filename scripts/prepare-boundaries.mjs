// Génère les découpages administratifs des 54 pays :
//   public/geo/adm1/{ISO3}.topo.json               régions (ADM1)
//   public/geo/adm2/{ISO3}/{idRégion}.topo.json    subdivisions (ADM2) de chaque région découpée
// Sources : geoBoundaries gbOpen (licences par pays, conservées dans topology.meta),
//           Wikidata (CC0) pour les noms français, chefs-lieux et populations des régions.
// Usage : npm run prepare:boundaries   (ajouter --refresh pour retélécharger les sources)
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AFRICAN_COUNTRY_CODES } from '../src/data/africa-countries.js'
import { buildRegionTopology, normalizeRegions, parseWikidataRegions } from './lib/region-geo.mjs'
import { assignToParents, keepCoherentGroups } from './lib/subdivisions.mjs'

const API_URL = (iso3, level) => `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${level}/`
const TRUSTED_DOWNLOAD_PREFIX = 'https://github.com/wmgeolab/geoBoundaries/raw/'
const WIKIDATA_URL = 'https://query.wikidata.org/sparql'
const WIKIDATA_BATCH_SIZE = 250
const USER_AGENT = 'DynamicMind/0.1 (https://github.com/Shut1520/DynamicMind)'
// Une région fait au plus quelques centaines de km : 1e4 pas suffisent (précision ≈ 10–100 m).
const SUBDIVISION_QUANTIZATION = 1e4

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIRS = { ADM1: resolve(ROOT, '.cache/geoboundaries'), ADM2: resolve(ROOT, '.cache/geoboundaries-adm2') }
const ADM1_DIR = resolve(ROOT, 'public/geo/adm1')
const ADM2_DIR = resolve(ROOT, 'public/geo/adm2')
const REFRESH = process.argv.includes('--refresh')

async function fetchText(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers } })
  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${url} (${response.status} ${response.statusText})`)
  }
  return response.text()
}

async function cachedJson(file, download) {
  if (REFRESH || !existsSync(file)) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, await download())
  }
  return JSON.parse(await readFile(file, 'utf8'))
}

// L'API répond 404 pour un niveau qui n'existe pas (ex. ADM2 de la Libye) : on le note dans le cache.
const downloadMeta = (iso3, level) => async () => {
  const response = await fetch(API_URL(iso3, level), { headers: { 'User-Agent': USER_AGENT } })
  return response.ok ? response.text() : JSON.stringify({ unavailable: response.status })
}

async function loadLevel(iso3, level) {
  const cacheDir = CACHE_DIRS[level]
  const meta = await cachedJson(resolve(cacheDir, `${iso3}.meta.json`), downloadMeta(iso3, level))
  if (meta.unavailable || meta.error) return null

  const url = meta.simplifiedGeometryGeoJSON
  if (typeof url !== 'string' || !url.startsWith(TRUSTED_DOWNLOAD_PREFIX)) {
    throw new Error(`${iso3} ${level} : URL de géométrie absente ou hors du dépôt geoBoundaries (${url})`)
  }
  const geojson = await cachedJson(resolve(cacheDir, `${iso3}.geojson`), () => fetchText(url))

  return {
    features: normalizeRegions(geojson, `${iso3} ${level}`),
    meta: {
      countryId: iso3,
      type: String(meta.boundaryCanonical ?? 'Unknown'),
      license: String(meta.boundaryLicense ?? 'inconnue'),
      source: String(meta.boundarySource ?? 'geoBoundaries'),
      year: Number(meta.boundaryYearRepresented) || null,
    },
  }
}

const wikidataQuery = (isoCodes) => `
SELECT ?iso ?label ?capital ?pop ?date WHERE {
  VALUES ?iso { ${isoCodes.map((code) => `"${code}"`).join(' ')} }
  ?item wdt:P300 ?iso .
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item rdfs:label ?label FILTER(lang(?label) = "fr") }
  OPTIONAL { ?item wdt:P36 ?cap . ?cap rdfs:label ?capital FILTER(lang(?capital) = "fr") }
  OPTIONAL { ?item p:P1082 ?statement . ?statement ps:P1082 ?pop . OPTIONAL { ?statement pq:P585 ?date } }
}`

async function loadWikidata(isoCodes) {
  const merged = new Map()
  for (let start = 0; start < isoCodes.length; start += WIKIDATA_BATCH_SIZE) {
    const batch = isoCodes.slice(start, start + WIKIDATA_BATCH_SIZE)
    const file = resolve(CACHE_DIRS.ADM1, `wikidata-${start / WIKIDATA_BATCH_SIZE}.json`)
    const response = await cachedJson(file, () =>
      fetchText(WIKIDATA_URL, {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query: wikidataQuery(batch) }),
      }),
    )
    parseWikidataRegions(response).forEach((value, key) => merged.set(key, value))
  }
  return merged
}

/** Subdivisions de chaque région du pays, seulement là où le découpage est cohérent. */
function groupSubdivisions(regions, adm2) {
  if (!adm2) return new Map()
  return keepCoherentGroups(assignToParents(adm2.features, regions), regions)
}

async function writeSubdivisions(iso3, groups, adm2Meta, regionNames) {
  let bytes = 0
  for (const [regionId, children] of groups) {
    const meta = { ...adm2Meta, parentId: regionId, parentName: regionNames.get(regionId) }
    const json = JSON.stringify(
      buildRegionTopology(children, new Map(), meta, {
        quantization: SUBDIVISION_QUANTIZATION,
        typeFallback: 'Subdivision',
      }),
    )
    bytes += json.length
    await mkdir(resolve(ADM2_DIR, iso3), { recursive: true })
    await writeFile(resolve(ADM2_DIR, iso3, `${regionId}.topo.json`), json)
  }
  return bytes
}

function report(countries, adm1Bytes, adm2Bytes) {
  const regionCount = countries.reduce((sum, c) => sum + c.adm1.features.length, 0)
  const splitRegions = countries.reduce((sum, c) => sum + c.groups.size, 0)
  const subdivisionCount = countries.reduce((sum, c) => sum + [...c.groups.values()].flat().length, 0)
  const withoutSubdivisions = countries.filter((c) => c.groups.size === 0).map((c) => c.iso3)
  console.log(`Régions : ${regionCount} dans ${countries.length} pays, ${(adm1Bytes / 1024).toFixed(0)} Ko`)
  console.log(`Subdivisions : ${subdivisionCount} dans ${splitRegions} régions, ${(adm2Bytes / 1024).toFixed(0)} Ko`)
  console.log(`Pays sans subdivisions exploitables : ${withoutSubdivisions.join(' ') || 'aucun'}`)
}

async function main() {
  const countries = []
  for (const iso3 of AFRICAN_COUNTRY_CODES) {
    const adm1 = await loadLevel(iso3, 'ADM1')
    if (!adm1) throw new Error(`${iso3} : régions (ADM1) indisponibles`)
    const adm2 = await loadLevel(iso3, 'ADM2')
    countries.push({ iso3, adm1, adm2, groups: groupSubdivisions(adm1.features, adm2) })
  }

  const isoCodes = [...new Set(countries.flatMap((c) => c.adm1.features.map((r) => r.properties.iso)).filter(Boolean))]
  const wikidata = await loadWikidata(isoCodes.sort())

  // Les sorties sont entièrement régénérées : on repart d'un dossier adm2 vide.
  await rm(ADM2_DIR, { recursive: true, force: true })
  await mkdir(ADM1_DIR, { recursive: true })

  let adm1Bytes = 0
  let adm2Bytes = 0
  for (const { iso3, adm1, adm2, groups } of countries) {
    const counts = new Map([...groups].map(([regionId, children]) => [regionId, children.length]))
    const topology = buildRegionTopology(adm1.features, wikidata, adm1.meta, { subdivisionCounts: counts })
    const adm1Json = JSON.stringify(topology)
    adm1Bytes += adm1Json.length
    await writeFile(resolve(ADM1_DIR, `${iso3}.topo.json`), adm1Json)

    if (adm2 && groups.size > 0) {
      const names = new Map(topology.objects.regions.geometries.map((g) => [g.properties.id, g.properties.name]))
      adm2Bytes += await writeSubdivisions(iso3, groups, adm2.meta, names)
    }
  }

  report(countries, adm1Bytes, adm2Bytes)
}

main().catch((error) => {
  console.error(`Échec de la génération : ${error.message}`)
  process.exitCode = 1
})
