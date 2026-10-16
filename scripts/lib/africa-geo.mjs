import { mergeArcs } from 'topojson-client'
import { topology } from 'topojson-server'
import {
  AFRICAN_COUNTRY_CODES,
  DISPUTED_TERRITORY_CODES,
} from '../../src/data/africa-countries.js'

const QUANTIZATION = 1e5

// Entités Natural Earth sans code ISO, rattachées à un pays reconnu.
const MERGED_INTO = Object.freeze({ SOL: 'SOM' })

const countryCodes = new Set(AFRICAN_COUNTRY_CODES)
const disputedCodes = new Set(DISPUTED_TERRITORY_CODES)

function resolveCode(props) {
  return MERGED_INTO[props.ADM0_A3] ?? props.ISO_A3_EH
}

/**
 * Filtre les entités Natural Earth admin-0 pour ne garder que les pays
 * africains et les territoires contestés, avec des propriétés normalisées.
 */
export function selectAfricanFeatures(features) {
  const kept = features
    .map((f) => ({ feature: f, code: resolveCode(f.properties) }))
    .filter(({ code }) => countryCodes.has(code) || disputedCodes.has(code))

  const nameByCode = new Map(
    kept
      .filter(({ feature }) => !MERGED_INTO[feature.properties.ADM0_A3])
      .map(({ feature, code }) => [code, feature.properties.NAME_FR]),
  )

  return kept.map(({ feature, code }) => ({
    type: 'Feature',
    properties: { id: code, name: nameByCode.get(code), interactive: countryCodes.has(code) },
    geometry: feature.geometry,
  }))
}

function mergeDuplicateGeometries(topo, geometries) {
  const groups = Map.groupBy(geometries, (g) => g.properties.id)

  return [...groups.values()].map((group) =>
    group.length === 1
      ? group[0]
      : { ...mergeArcs(topo, group), properties: group[0].properties },
  )
}

/**
 * Construit une TopoJSON (objet `countries`) à partir des entités sélectionnées.
 * La quantification + l'encodage delta suffisent à garder un fichier léger (~80 Ko).
 */
export function buildAfricaTopology(features) {
  const topo = topology({ countries: { type: 'FeatureCollection', features } }, QUANTIZATION)
  const geometries = mergeDuplicateGeometries(topo, topo.objects.countries.geometries)

  return {
    ...topo,
    objects: { countries: { type: 'GeometryCollection', geometries } },
  }
}
