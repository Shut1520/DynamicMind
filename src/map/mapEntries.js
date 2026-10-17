import countriesInfo from '../data/countries-info.json'

/**
 * Données d'une région, d'une subdivision ou d'une commune telles que transmises à la navigation,
 * à l'infobulle et au panneau d'infos. Le type propre à l'entité (commune, chefferie…) prime
 * sur celui du fichier.
 */
export function regionDetails(shape, meta) {
  return {
    ...shape.properties,
    countryId: meta?.countryId ?? null,
    type: shape.properties.type ?? meta?.type ?? 'Région',
    parentName: meta?.parentName ?? null,
    license: meta?.license ?? null,
    provider: meta?.provider ?? 'geoBoundaries',
  }
}

/** « Cameroun » pour une région, « Ouest, Cameroun » pour une subdivision. */
export function contextLabel(details) {
  const countryName = countriesInfo[details.countryId]?.name ?? ''
  return details.parentName ? `${details.parentName}, ${countryName}` : countryName
}
