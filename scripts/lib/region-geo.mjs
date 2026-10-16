// Préparation des régions (ADM1) issues de geoBoundaries, enrichies avec Wikidata.
import { geoArea } from 'd3-geo'
import { topology } from 'topojson-server'

const QUANTIZATION = 1e5
const EARTH_RADIUS_KM = 6371.0088

// Les libellés geoBoundaries sont irréguliers (« Unknown », « Wilayat/State », « Regiões »…) :
// on les reconnaît par mot-clé, dans cet ordre de priorité.
const REGION_TYPE_RULES = Object.freeze([
  [/wila?y/i, 'Wilaya'],
  [/r[eé]gi/i, 'Région'],
  [/pr[eé]fect/i, 'Préfecture'],
  [/d[eé]part/i, 'Département'],
  [/district/i, 'District'],
  [/count(y|ies)|comt[eé]/i, 'Comté'],
  [/governo?r?ate/i, 'Gouvernorat'],
  [/province/i, 'Province'],
  [/state|[eé]tat/i, 'État'],
  [/island/i, 'Île'],
])
const DEFAULT_REGION_TYPE = 'Région'

export function translateRegionType(type) {
  const rule = REGION_TYPE_RULES.find(([pattern]) => pattern.test(String(type)))
  return rule ? rule[1] : DEFAULT_REGION_TYPE
}

const reverseRings = (rings) => rings.map((ring) => [...ring].reverse())

// d3 attend des anneaux extérieurs dans le sens horaire ; RFC 7946 (geoBoundaries) fait l'inverse.
// Un polygone « inversé » couvre plus d'un hémisphère : on le retourne.
function rewindPolygon(rings) {
  return geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? reverseRings(rings) : rings
}

/** Copie de l'entité avec des polygones orientés comme l'attend d3. */
export function rewindForD3(feature) {
  const { geometry } = feature
  if (geometry?.type === 'Polygon') {
    return { ...feature, geometry: { ...geometry, coordinates: rewindPolygon(geometry.coordinates) } }
  }
  if (geometry?.type === 'MultiPolygon') {
    return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(rewindPolygon) } }
  }
  return feature
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''

// En dessous de 1 km², une « région » est un artefact de la source (éclat de frontière) :
// la quantification TopoJSON l'écraserait en un polygone d'aire nulle, que d3 lit comme le globe entier.
const MIN_REGION_AREA_KM2 = 1
const areaKm2 = (feature) => geoArea(feature) * EARTH_RADIUS_KM ** 2
const isDegenerate = (feature) => geoArea(feature) > 2 * Math.PI || areaKm2(feature) < MIN_REGION_AREA_KM2

/**
 * Régions geoBoundaries → entités réorientées { id, iso, nameEn, area (km²) }.
 * Les géométries dégénérées (artefacts de la source) sont écartées.
 */
export function normalizeRegions(geojson, countryId) {
  if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error(`${countryId} : fichier de régions invalide (FeatureCollection attendue)`)
  }

  return geojson.features.flatMap((source, index) => {
    const { shapeID, shapeName, shapeISO } = source?.properties ?? {}
    if (!isNonEmptyString(shapeID) || !isNonEmptyString(shapeName)) {
      throw new Error(`${countryId} : région n°${index + 1} sans identifiant ou sans nom`)
    }
    const rewound = rewindForD3(source)
    if (isDegenerate(rewound)) return []
    return {
      type: 'Feature',
      properties: {
        id: shapeID,
        iso: isNonEmptyString(shapeISO) ? shapeISO : null,
        nameEn: shapeName.trim(),
        area: Math.round(areaKm2(rewound)),
      },
      geometry: rewound.geometry,
    }
  })
}

/** Réponse SPARQL → Map(code ISO 3166-2 → { name, capitals, population, populationYear }). */
export function parseWikidataRegions(response) {
  const bindings = response?.results?.bindings
  if (!Array.isArray(bindings)) {
    throw new Error('Réponse Wikidata inattendue (pas de résultats SPARQL)')
  }

  const byIso = Map.groupBy(bindings.filter((b) => b?.iso?.value), (b) => b.iso.value)

  return new Map(
    [...byIso].map(([iso, rows]) => {
      const name = rows.find((r) => r.label?.value)?.label.value ?? null
      const capitals = [...new Set(rows.map((r) => r.capital?.value).filter(Boolean))]
      const latest = rows
        .filter((r) => Number.isFinite(Number(r.pop?.value)))
        .map((r) => ({ population: Number(r.pop.value), year: r.date ? new Date(r.date.value).getUTCFullYear() : 0 }))
        .sort((a, b) => b.year - a.year)[0]

      return [
        iso,
        {
          name,
          capitals,
          population: latest?.population ?? null,
          populationYear: latest?.year || null,
        },
      ]
    }),
  )
}

/**
 * TopoJSON (objet `regions`) d'un pays, avec noms français quand Wikidata les connaît.
 * Les métadonnées (type de région, licence, source) sont gardées dans `topology.meta`.
 */
export function buildRegionTopology(regions, wikidataByIso, meta) {
  const extraOf = (properties) => (properties.iso && wikidataByIso.get(properties.iso)) || {}

  // Deux régions d'un même pays ne peuvent pas porter le même nom : en cas de collision
  // (code ISO partagé, erreur Wikidata), on garde pour elles les données d'origine.
  const nameCounts = new Map()
  regions.forEach(({ properties }) => {
    const name = extraOf(properties).name ?? properties.nameEn
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  })
  const isTrusted = (properties) => {
    const { name } = extraOf(properties)
    return Boolean(name) && nameCounts.get(name) === 1
  }

  const features = regions.map(({ properties, geometry }) => {
    const extra = isTrusted(properties) ? extraOf(properties) : {}
    return {
      type: 'Feature',
      properties: {
        id: properties.id,
        iso: properties.iso,
        name: extra.name ?? properties.nameEn,
        area: properties.area,
        capitals: extra.capitals ?? [],
        population: extra.population ?? null,
        populationYear: extra.populationYear ?? null,
      },
      geometry,
    }
  })

  return {
    ...topology({ regions: { type: 'FeatureCollection', features } }, QUANTIZATION),
    meta: { ...meta, type: translateRegionType(meta.type) },
  }
}
