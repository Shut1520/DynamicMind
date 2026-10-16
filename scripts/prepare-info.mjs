// Génère src/data/countries-info.json et public/flags/{iso3}.svg pour les 54 pays.
// Sources : mledoze/countries (ODbL), Banque mondiale (CC BY 4.0), Wikidata (CC0).
// Usage : npm run prepare:info   (ajouter --refresh pour retélécharger les sources)
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AFRICAN_COUNTRY_CODES } from '../src/data/africa-countries.js'
import { buildCountriesInfo } from './lib/country-info.mjs'
import { isSafeSvg, parseWikidataCapitals, parseWorldBankPopulation } from './lib/country-sources.mjs'

const MLEDOZE_COMMIT = 'c2ac0049c14edcf2436c7aa1b2493222a020b462'
const MLEDOZE_BASE = `https://raw.githubusercontent.com/mledoze/countries/${MLEDOZE_COMMIT}`
const WORLD_BANK_URL = `https://api.worldbank.org/v2/country/${AFRICAN_COUNTRY_CODES.join(';')}/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=500`
const WIKIDATA_URL = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'DynamicMind/0.1 (https://github.com/Shut1520/DynamicMind)'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = resolve(ROOT, '.cache/country-info')
const INFO_FILE = resolve(ROOT, 'src/data/countries-info.json')
const FLAGS_DIR = resolve(ROOT, 'public/flags')
const REFRESH = process.argv.includes('--refresh')

const WIKIDATA_QUERY = `
SELECT ?iso3 ?capEn ?capFr WHERE {
  VALUES ?iso3 { ${AFRICAN_COUNTRY_CODES.map((c) => `"${c}"`).join(' ')} }
  ?country wdt:P298 ?iso3; wdt:P36 ?capital.
  ?capital rdfs:label ?capEn FILTER(lang(?capEn) = "en")
  OPTIONAL { ?capital rdfs:label ?capFr FILTER(lang(?capFr) = "fr") }
}`

async function fetchText(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers } })
  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${url} (${response.status} ${response.statusText})`)
  }
  return response.text()
}

// Télécharge une seule fois (sauf --refresh) et garde une copie dans .cache/.
async function cached(fileName, download) {
  const file = resolve(CACHE_DIR, fileName)
  if (REFRESH || !existsSync(file)) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, await download())
  }
  return readFile(file, 'utf8')
}

const loadJson = async (fileName, download) => JSON.parse(await cached(fileName, download))

async function loadSources() {
  const records = await loadJson('mledoze-countries.json', () => fetchText(`${MLEDOZE_BASE}/countries.json`))
  if (!Array.isArray(records)) {
    throw new Error('Fichier mledoze/countries invalide (tableau attendu)')
  }

  const populations = parseWorldBankPopulation(
    await loadJson('worldbank-population.json', () => fetchText(WORLD_BANK_URL)),
  )

  const capitalsFr = parseWikidataCapitals(
    await loadJson('wikidata-capitals.json', () =>
      fetchText(`${WIKIDATA_URL}?query=${encodeURIComponent(WIKIDATA_QUERY)}`, {
        headers: { Accept: 'application/sparql-results+json' },
      }),
    ),
  )

  return { records, populations, capitalsFr }
}

async function copyFlags(codes) {
  await mkdir(FLAGS_DIR, { recursive: true })

  for (const code of codes) {
    const fileName = `${code.toLowerCase()}.svg`
    const svg = await cached(`flags/${fileName}`, () => fetchText(`${MLEDOZE_BASE}/data/${fileName}`))
    if (!isSafeSvg(svg)) {
      throw new Error(`Drapeau refusé (SVG invalide ou contenu actif) : ${fileName}`)
    }
    await writeFile(resolve(FLAGS_DIR, fileName), svg)
  }
}

function reportUntranslatedCapitals(info, capitalsFr) {
  const untranslated = Object.values(info).flatMap((country) =>
    country.capitals
      .filter((capital) => ![...(capitalsFr.get(country.id)?.values() ?? [])].includes(capital))
      .map((capital) => `${country.id}:${capital}`),
  )
  if (untranslated.length > 0) {
    console.warn(`Capitales sans traduction Wikidata (nom d'origine conservé) : ${untranslated.join(', ')}`)
  }
}

async function main() {
  const sources = await loadSources()
  const info = buildCountriesInfo(sources, AFRICAN_COUNTRY_CODES)

  await writeFile(INFO_FILE, `${JSON.stringify(info, null, 2)}\n`)
  await copyFlags(AFRICAN_COUNTRY_CODES)
  reportUntranslatedCapitals(info, sources.capitalsFr)

  console.log(`${INFO_FILE}`)
  console.log(`${Object.keys(info).length} fiches pays, ${AFRICAN_COUNTRY_CODES.length} drapeaux dans ${FLAGS_DIR}`)
}

main().catch((error) => {
  console.error(`Échec de la génération : ${error.message}`)
  process.exitCode = 1
})
