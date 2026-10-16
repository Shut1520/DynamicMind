// Génère public/geo/africa.topo.json à partir de Natural Earth admin-0 (1:50m).
// Usage : npm run prepare:countries
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAfricaTopology, selectAfricanFeatures } from './lib/africa-geo.mjs'

const NATURAL_EARTH_VERSION = 'v5.1.2'
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_VERSION}/geojson/ne_50m_admin_0_countries.geojson`

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_FILE = resolve(ROOT, '.cache/natural-earth/ne_50m_admin_0_countries.geojson')
const OUTPUT_FILE = resolve(ROOT, 'public/geo/africa.topo.json')


async function loadSource() {
  if (!existsSync(CACHE_FILE)) {
    console.log(`Téléchargement de ${SOURCE_URL}`)
    const response = await fetch(SOURCE_URL)
    if (!response.ok) {
      throw new Error(`Téléchargement impossible (${response.status} ${response.statusText})`)
    }
    await mkdir(dirname(CACHE_FILE), { recursive: true })
    await writeFile(CACHE_FILE, await response.text())
  }

  const geojson = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error(`Fichier source invalide : ${CACHE_FILE}`)
  }
  return geojson.features
}

async function main() {
  const features = selectAfricanFeatures(await loadSource())
  const topology = buildAfricaTopology(features)
  const json = JSON.stringify(topology)

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, json)

  const geometries = topology.objects.countries.geometries
  const interactive = geometries.filter((g) => g.properties.interactive).length
  console.log(`${OUTPUT_FILE}`)
  console.log(`${geometries.length} entités (${interactive} pays cliquables), ${(json.length / 1024).toFixed(1)} Ko`)
}

main().catch((error) => {
  console.error(`Échec de la génération : ${error.message}`)
  process.exitCode = 1
})
