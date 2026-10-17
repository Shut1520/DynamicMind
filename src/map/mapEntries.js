import countriesInfo from '../data/countries-info.json'

/**
 * Données d'une région ou d'une subdivision telles que transmises à la navigation,
 * à l'infobulle et au panneau d'infos.
 */
export function regionDetails(shape, meta) {
  return {
    ...shape.properties,
    countryId: meta?.countryId ?? null,
    type: meta?.type ?? 'Région',
    parentName: meta?.parentName ?? null,
    license: meta?.license ?? null,
  }
}

/** « Cameroun » pour une région, « Ouest, Cameroun » pour une subdivision. */
export function contextLabel(details) {
  const countryName = countriesInfo[details.countryId]?.name ?? ''
  return details.parentName ? `${details.parentName}, ${countryName}` : countryName
}
