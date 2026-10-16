// Génère public/geo/adm1/{ISO3}.topo.json : les régions (ADM1) des 54 pays.
// Sources : geoBoundaries gbOpen (licences par pays, conservées dans topology.meta),
//           Wikidata (CC0) pour les noms français, chefs-lieux et populations.
// Usage : npm run prepare:boundaries   (ajouter --refresh pour retélécharger les sources)
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AFRICAN_COUNTRY_CODES } from '../src/data/africa-countries.js'
import { buildRegionTopology, normalizeRegions, parseWikidataRegions } from './lib/region-geo.mjs'

const API_URL = (iso3) => `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`
const TRUSTED_DOWNLOAD_PREFIX = 'https://github.com/wmgeolab/geoBoundaries/raw/'
const WIKIDATA_URL = 'https://query.wikidata.org/sparql'
const WIKIDATA_BATCH_SIZE = 250
const USER_AGENT = 'DynamicMind/0.1 (https://github.com/Shut1520/DynamicMind)'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = resolve(ROOT, '.cache/geoboundaries')
const OUTPUT_DIR = resolve(ROOT, 'public/geo/adm1')
const REFRESH = process.argv.includes('--refresh')

async function fetchText(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers } })
  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${url} (${response.status} ${response.statusText})`)
  }
  return response.text()
}

async function cachedJson(fileName, download) {
  const file = resolve(CACHE_DIR, fileName)
  if (REFRESH || !existsSync(file)) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, await download())
  }
  return JSON.parse(await readFile(file, 'utf8'))
}

async function loadCountry(iso3) {
  const meta = await cachedJson(`${iso3}.meta.json`, () => fetchText(API_URL(iso3)))
  const url = meta?.simplifiedGeometryGeoJSON
  if (typeof url !== 'string' || !url.startsWith(TRUSTED_DOWNLOAD_PREFIX)) {
    throw new Error(`${iso3} : URL de géométrie absente ou hors du dépôt geoBoundaries (${url})`)
  }
  const geojson = await cachedJson(`${iso3}.geojson`, () => fetchText(url))

  return {
    iso3,
    regions: normalizeRegions(geojson, iso3),
    meta: {
      countryId: iso3,
      type: String(meta.boundaryCanonical ?? 'Region'),
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
    const response = await cachedJson(`wikidata-${start / WIKIDATA_BATCH_SIZE}.json`, () =>
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

async function main() {
  const countries = []
  for (const iso3 of AFRICAN_COUNTRY_CODES) {
    countries.push(await loadCountry(iso3))
  }

  const isoCodes = [...new Set(countries.flatMap((c) => c.regions.map((r) => r.properties.iso)).filter(Boolean))].sort()
  const wikidata = await loadWikidata(isoCodes)

  await mkdir(OUTPUT_DIR, { recursive: true })
  let totalBytes = 0
  for (const { iso3, regions, meta } of countries) {
    const json = JSON.stringify(buildRegionTopology(regions, wikidata, meta))
    totalBytes += json.length
    await writeFile(resolve(OUTPUT_DIR, `${iso3}.topo.json`), json)
  }

  const regionCount = countries.reduce((sum, c) => sum + c.regions.length, 0)
  const translated = isoCodes.filter((code) => wikidata.get(code)?.name).length
  console.log(`${countries.length} pays, ${regionCount} régions, ${(totalBytes / 1024).toFixed(0)} Ko au total`)
  console.log(`Noms français trouvés pour ${translated}/${isoCodes.length} régions ayant un code ISO`)
}

main().catch((error) => {
  console.error(`Échec de la génération : ${error.message}`)
  process.exitCode = 1
})
