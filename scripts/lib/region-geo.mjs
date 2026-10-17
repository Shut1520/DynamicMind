// Préparation des régions (ADM1) issues de geoBoundaries, enrichies avec Wikidata.
import { geoArea } from 'd3-geo'
import { quantize, feature as toGeoJSON } from 'topojson-client'
import { topology } from 'topojson-server'
import { presimplify, simplify, sphericalTriangleArea } from 'topojson-simplify'

const QUANTIZATION = 1e5
const EARTH_RADIUS_KM = 6371.0088

// Les libellés geoBoundaries sont irréguliers (« Unknown », « Wilayat/State », « Regiões »…) :
// on les reconnaît par mot-clé, dans cet ordre de priorité.
const REGION_TYPE_RULES = Object.freeze([
  [/wila?y/i, 'Wilaya'],
  [/r[eé]gi/i, 'Région'],
  [/sub-?s?pr[eé]fect/i, 'Sous-préfecture'],
  [/pr[eé]fect/i, 'Préfecture'],
  [/d[eé]part/i, 'Département'],
  [/district/i, 'District'],
  [/sub-?s?count/i, 'Sous-comté'],
  [/count(y|ies)|comt[eé]/i, 'Comté'],
  [/local government/i, 'Zone de gouvernement local'],
  [/governo?r?ate/i, 'Gouvernorat'],
  [/province/i, 'Province'],
  [/commune/i, 'Commune'],
  [/municipal/i, 'Municipalité'],
  [/cercle/i, 'Cercle'],
  [/constituenc/i, 'Circonscription'],
  [/territor/i, 'Territoire'],
  [/freguesia|parish/i, 'Paroisse'],
  [/state|[eé]tat/i, 'État'],
  [/island/i, 'Île'],
])
const DEFAULT_REGION_TYPE = 'Région'

// Simplification adaptée au zoom : un fichier est affiché quand son parent remplit à peu près
// l'écran (≈ 600 px de large). On retire les sommets dont le triangle fait moins d'un dixième
// de pixel carré à cette échelle : invisible à l'œil, mais 2 à 3 fois moins de points à tracer.
const VIEW_WIDTH_PX = 600
const MIN_TRIANGLE_PX2 = 0.1

/** Poids minimal (stéradians) pour simplifier un fichier qui couvre `viewAreaKm2` à l'écran. */
export function minWeightForView(viewAreaKm2) {
  const pixelKm = Math.sqrt(viewAreaKm2) / VIEW_WIDTH_PX
  return (MIN_TRIANGLE_PX2 * pixelKm ** 2) / EARTH_RADIUS_KM ** 2
}

/** Libellé geoBoundaries → type en français ; `fallback` si le libellé n'est pas reconnu. */
export function translateRegionType(type, fallback = DEFAULT_REGION_TYPE) {
  const rule = REGION_TYPE_RULES.find(([pattern]) => pattern.test(String(type)))
  return rule ? rule[1] : fallback
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

// Les îlots de moins de 0,5 km² sont invisibles à l'écran mais s'écrasent à la quantification.
const MIN_PART_AREA_KM2 = 0.5
const partArea = (rings) => geoArea({ type: 'Polygon', coordinates: rings }) * EARTH_RADIUS_KM ** 2

/** Retire les îlots minuscules d'un MultiPolygon (en gardant toujours le plus grand morceau). */
function dropIslets(feature) {
  if (feature.geometry?.type !== 'MultiPolygon') return feature
  const parts = [...feature.geometry.coordinates].sort((a, b) => partArea(b) - partArea(a))
  const kept = parts.filter((rings, index) => index === 0 || partArea(rings) >= MIN_PART_AREA_KM2)
  return { ...feature, geometry: { ...feature.geometry, coordinates: kept } }
}

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
    // La taille de l'entité entière décide si c'est un artefact ; ses îlots ne sont retirés qu'ensuite.
    const whole = rewindForD3(source)
    if (isDegenerate(whole)) return []
    const rewound = dropIslets(whole)
    return {
      type: 'Feature',
      properties: {
        id: shapeID,
        iso: isNonEmptyString(shapeISO) ? shapeISO : null,
        nameEn: shapeName.trim(),
        area: Math.round(areaKm2(whole)),
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
 * TopoJSON (objet `regions`) d'un pays ou d'une région, avec noms français quand Wikidata les connaît.
 * Les métadonnées (type, licence, source…) sont gardées dans `topology.meta`.
 *
 * @param {{ quantization?: number, typeFallback?: string, subdivisionCounts?: Map<string, number>, simplify?: boolean }} [options]
 *   `subdivisionCounts` : nombre de subdivisions de chaque entité (0 = dernier niveau disponible) ;
 *   `simplify` : allège les contours pour l'échelle à laquelle le fichier est affiché.
 */
export function buildRegionTopology(
  regions,
  wikidataByIso,
  meta,
  { quantization = QUANTIZATION, typeFallback, subdivisionCounts = new Map(), simplify: shouldSimplify = false } = {},
) {
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
        subdivisions: subdivisionCounts.get(properties.id) ?? 0,
        // Type propre à l'entité quand il varie dans un même fichier (commune, chefferie…).
        ...(properties.type ? { type: properties.type } : {}),
      },
      geometry,
    }
  })

  // Simplifier avant de quantifier : presimplify travaille sur des coordonnées absolues.
  const raw = topology({ regions: { type: 'FeatureCollection', features } })
  const viewArea = features.reduce((sum, { properties }) => sum + properties.area, 0)
  const lighter = shouldSimplify ? simplify(presimplify(raw, sphericalTriangleArea), minWeightForView(viewArea)) : raw
  const built = quantize(lighter, quantization)
  assertNoInvertedGeometry(built)

  return { ...built, meta: { ...meta, type: translateRegionType(meta.type, typeFallback) } }
}

// Garde-fou : une géométrie qui couvre plus d'un hémisphère après quantification
// serait dessinée par d3 comme « tout le globe sauf elle ». On refuse de la livrer.
function assertNoInvertedGeometry(built) {
  const inverted = toGeoJSON(built, built.objects.regions).features.find((f) => geoArea(f) > 2 * Math.PI)
  if (inverted) {
    throw new Error(`Géométrie inversée après quantification : ${inverted.properties.name}`)
  }
}
