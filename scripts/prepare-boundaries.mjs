// Génère les découpages administratifs des 54 pays :
//   public/geo/adm1/{ISO3}.topo.json                   régions (ADM1)
//   public/geo/adm2/{ISO3}/{idRégion}.topo.json        subdivisions (ADM2) de chaque région découpée
//   public/geo/adm3/{ISO3}/{idSubdivision}.topo.json   communes, secteurs, chefferies (pays de LOCAL_SOURCES)
// Sources : geoBoundaries gbOpen (licences par pays, conservées dans topology.meta),
//           Wikidata (CC0) pour les noms français, chefs-lieux et populations des régions,
//           OpenStreetMap (ODbL) pour le niveau local des pays listés dans LOCAL_SOURCES.
// Usage : npm run prepare:boundaries   (ajouter --refresh pour retélécharger les sources)
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AFRICAN_COUNTRY_CODES } from '../src/data/africa-countries.js'
import { overpassToCollection } from './lib/osm-boundaries.mjs'
import { buildRegionTopology, normalizeRegions, parseWikidataRegions } from './lib/region-geo.mjs'
import { assignToParents, keepCoherentGroups } from './lib/subdivisions.mjs'

const API_URL = (iso3, level) => `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${level}/`
const TRUSTED_DOWNLOAD_PREFIX = 'https://github.com/wmgeolab/geoBoundaries/raw/'
const WIKIDATA_URL = 'https://query.wikidata.org/sparql'
const WIKIDATA_BATCH_SIZE = 250
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'DynamicMind/0.1 (https://github.com/Shut1520/DynamicMind)'
// Une région fait au plus quelques centaines de km : 1e4 pas suffisent (précision ≈ 10–100 m).
const SUBDIVISION_QUANTIZATION = 1e4

// Pays dont on cartographie le niveau local à partir d'OpenStreetMap.
// RDC : niveau OSM 7 = communes des villes, secteurs et chefferies des territoires.
const LOCAL_SOURCES = Object.freeze({ COD: { countryCode: 'CD', adminLevel: 7 } })
// En RDC, une ville (découpée en communes) couvre moins de 1 000 km² ; un territoire, bien plus.
const CITY_MAX_AREA_KM2 = 1000
const OSM_META = Object.freeze({
  provider: 'OpenStreetMap',
  source: 'Contributeurs OpenStreetMap',
  license: 'Open Data Commons Open Database License 1.0',
  year: null,
})

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIRS = {
  ADM1: resolve(ROOT, '.cache/geoboundaries'),
  ADM2: resolve(ROOT, '.cache/geoboundaries-adm2'),
  OSM: resolve(ROOT, '.cache/osm'),
}
const ADM1_DIR = resolve(ROOT, 'public/geo/adm1')
const ADM2_DIR = resolve(ROOT, 'public/geo/adm2')
const ADM3_DIR = resolve(ROOT, 'public/geo/adm3')
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

// Overpass est souvent saturé (429, 502, 504) : on réessaie un peu plus tard.
const OVERPASS_ATTEMPTS = 4
const OVERPASS_RETRY_MS = 15_000

async function fetchOverpass(query) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetchText(OVERPASS_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
      })
    } catch (error) {
      if (attempt >= OVERPASS_ATTEMPTS) throw error
      console.warn(`${error.message} — nouvel essai dans ${OVERPASS_RETRY_MS / 1000} s`)
      await new Promise((done) => setTimeout(done, OVERPASS_RETRY_MS))
    }
  }
}

const overpassQuery = ({ countryCode, adminLevel }) =>
  `[out:json][timeout:300];area["ISO3166-1"="${countryCode}"][admin_level=2]->.country;` +
  `rel(area.country)[boundary=administrative][admin_level=${adminLevel}];out geom;`

/** Niveau local OpenStreetMap d'un pays de LOCAL_SOURCES, sinon null. */
async function loadLocalities(iso3) {
  const source = LOCAL_SOURCES[iso3]
  if (!source) return null
  const response = await cachedJson(resolve(CACHE_DIRS.OSM, `${iso3}-admin${source.adminLevel}.json`), () =>
    fetchOverpass(overpassQuery(source)),
  )
  const { collection, hints, skipped } = overpassToCollection(response)
  if (skipped.length > 0) console.warn(`${iso3} OSM : ${skipped.length} contours sans nom ou incomplets ignorés`)
  return { features: normalizeRegions(collection, `${iso3} OSM`), hints }
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

/** Enfants de chaque parent, seulement là où le découpage est cohérent. */
const groupChildren = (children, parents) =>
  children && parents.length > 0 ? keepCoherentGroups(assignToParents(children, parents), parents) : new Map()

/**
 * Type de chaque entité locale : celui que donne OSM (« chefferie »…), sinon celui de son parent :
 * les communes découpent une ville (ou la ville-province de Kinshasa), secteurs et chefferies un territoire.
 */
function typeLocalities(children, hints, parent, isProvince) {
  const hinted = children.map((child) => hints.get(child.properties.id))
  const isRural = hinted.some((type) => type === 'Secteur' || type === 'Chefferie')
  const isCity = isProvince || (!isRural && parent.properties.area < CITY_MAX_AREA_KM2)
  const groupType = isCity ? 'Commune' : 'Secteur ou chefferie'
  const typed = children.map((child, index) => ({
    ...child,
    properties: { ...child.properties, type: hinted[index] ?? groupType },
  }))
  return { children: typed, type: groupType }
}

/**
 * Niveau local rangé sous les subdivisions affichées ou, pour une région que geoBoundaries
 * ne découpe pas (Kinshasa), directement sous la région.
 */
function groupLocalities(localities, adm1, adm2, groups) {
  if (!localities) return { underRegions: new Map(), underSubdivisions: new Map() }
  const typed = (grouped, parents, isProvince) => {
    const byId = new Map(parents.map((parent) => [parent.properties.id, parent]))
    return new Map(
      [...grouped].map(([id, children]) => [id, typeLocalities(children, localities.hints, byId.get(id), isProvince)]),
    )
  }
  const unsplitRegions = adm1.features.filter((region) => !groups.has(region.properties.id))
  const shownSubdivisions = [...groups.values()].flat()
  return {
    underRegions: typed(groupChildren(localities.features, unsplitRegions), unsplitRegions, true),
    underSubdivisions: typed(groupChildren(localities.features, shownSubdivisions), shownSubdivisions, false),
  }
}

async function writeLayer(dir, iso3, parentId, children, meta, { counts = new Map(), typeFallback = 'Subdivision' } = {}) {
  const json = JSON.stringify(
    buildRegionTopology(children, new Map(), meta, {
      quantization: SUBDIVISION_QUANTIZATION,
      typeFallback,
      subdivisionCounts: counts,
      simplify: true,
    }),
  )
  await mkdir(resolve(dir, iso3), { recursive: true })
  await writeFile(resolve(dir, iso3, `${parentId}.topo.json`), json)
  return json.length
}

const countsOf = (grouped) => new Map([...grouped].map(([id, entry]) => [id, (entry.children ?? entry).length]))

async function writeCountry(country, wikidata) {
  const { iso3, adm1, adm2, groups, localities } = country
  const regionCounts = new Map([...countsOf(groups), ...countsOf(localities.underRegions)])
  const topology = buildRegionTopology(adm1.features, wikidata, adm1.meta, {
    subdivisionCounts: regionCounts,
    simplify: true,
  })
  const adm1Json = JSON.stringify(topology)
  await writeFile(resolve(ADM1_DIR, `${iso3}.topo.json`), adm1Json)

  const regionNames = new Map(topology.objects.regions.geometries.map((g) => [g.properties.id, g.properties.name]))
  const localCounts = countsOf(localities.underSubdivisions)
  const sizes = { adm1: adm1Json.length, adm2: 0, adm3: 0 }

  for (const [regionId, children] of groups) {
    const meta = { ...adm2.meta, parentId: regionId, parentName: regionNames.get(regionId) }
    sizes.adm2 += await writeLayer(ADM2_DIR, iso3, regionId, children, meta, { counts: localCounts })
  }
  for (const [regionId, { children, type }] of localities.underRegions) {
    const meta = { countryId: iso3, ...OSM_META, type, parentId: regionId, parentName: regionNames.get(regionId) }
    sizes.adm2 += await writeLayer(ADM2_DIR, iso3, regionId, children, meta, { typeFallback: type })
  }
  const subdivisionNames = new Map([...groups.values()].flat().map((s) => [s.properties.id, s.properties.nameEn]))
  for (const [subdivisionId, { children, type }] of localities.underSubdivisions) {
    const meta = { countryId: iso3, ...OSM_META, type, parentId: subdivisionId, parentName: subdivisionNames.get(subdivisionId) }
    sizes.adm3 += await writeLayer(ADM3_DIR, iso3, subdivisionId, children, meta, { typeFallback: type })
  }
  return sizes
}

function report(countries, sizes) {
  const sum = (pick) => countries.reduce((total, country) => total + pick(country), 0)
  const kb = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`
  const withoutSubdivisions = countries.filter((c) => c.groups.size === 0).map((c) => c.iso3)
  console.log(`Régions : ${sum((c) => c.adm1.features.length)} dans ${countries.length} pays, ${kb(sizes.adm1)}`)
  console.log(
    `Subdivisions : ${sum((c) => [...c.groups.values()].flat().length)} dans ${sum((c) => c.groups.size)} régions, ${kb(sizes.adm2)}`,
  )
  console.log(`Pays sans subdivisions exploitables : ${withoutSubdivisions.join(' ') || 'aucun'}`)
  countries
    .filter((c) => LOCAL_SOURCES[c.iso3])
    .forEach(({ iso3, localities }) => {
      const parts = (grouped) => [...grouped.values()].reduce((total, entry) => total + entry.children.length, 0)
      console.log(
        `${iso3} niveau local : ${parts(localities.underRegions)} sous ${localities.underRegions.size} région(s), ` +
          `${parts(localities.underSubdivisions)} sous ${localities.underSubdivisions.size} subdivisions, ${kb(sizes.adm3)}`,
      )
    })
}

async function main() {
  const countries = []
  for (const iso3 of AFRICAN_COUNTRY_CODES) {
    const adm1 = await loadLevel(iso3, 'ADM1')
    if (!adm1) throw new Error(`${iso3} : régions (ADM1) indisponibles`)
    const adm2 = await loadLevel(iso3, 'ADM2')
    const groups = groupChildren(adm2?.features, adm1.features)
    const localities = groupLocalities(await loadLocalities(iso3), adm1, adm2, groups)
    countries.push({ iso3, adm1, adm2, groups, localities })
  }

  const isoCodes = [...new Set(countries.flatMap((c) => c.adm1.features.map((r) => r.properties.iso)).filter(Boolean))]
  const wikidata = await loadWikidata(isoCodes.sort())

  // Les sorties sont entièrement régénérées : on repart de dossiers adm2 et adm3 vides.
  await rm(ADM2_DIR, { recursive: true, force: true })
  await rm(ADM3_DIR, { recursive: true, force: true })
  await mkdir(ADM1_DIR, { recursive: true })

  const sizes = { adm1: 0, adm2: 0, adm3: 0 }
  for (const country of countries) {
    const written = await writeCountry(country, wikidata)
    Object.keys(sizes).forEach((key) => {
      sizes[key] += written[key]
    })
  }

  report(countries, sizes)
}

main().catch((error) => {
  console.error(`Échec de la génération : ${error.message}`)
  process.exitCode = 1
})
