// Lecture et contrôle des réponses brutes des sources externes.

/** Réponse de l'API Banque mondiale (indicateur SP.POP.TOTL) → Map ISO3 → { value, year }. */
export function parseWorldBankPopulation(response) {
  const rows = Array.isArray(response) ? response[1] : undefined
  if (!Array.isArray(rows)) {
    throw new Error('Réponse Banque mondiale inattendue (pas de tableau de données)')
  }

  return new Map(
    rows
      .filter((row) => typeof row?.value === 'number' && typeof row?.countryiso3code === 'string')
      .map((row) => [row.countryiso3code, { value: row.value, year: row.date }]),
  )
}

/** Réponse SPARQL Wikidata → Map ISO3 → Map(nom anglais → nom français). */
export function parseWikidataCapitals(response) {
  const bindings = response?.results?.bindings
  if (!Array.isArray(bindings)) {
    throw new Error('Réponse Wikidata inattendue (pas de résultats SPARQL)')
  }

  const withFrench = bindings.filter((b) => b?.iso3?.value && b?.capEn?.value && b?.capFr?.value)
  const byCountry = Map.groupBy(withFrench, (b) => b.iso3.value)

  return new Map(
    [...byCountry].map(([iso3, rows]) => [iso3, new Map(rows.map((b) => [b.capEn.value, b.capFr.value]))]),
  )
}

const SVG_START = /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i
const UNSAFE_SVG = /<script|<foreignObject|\son\w+\s*=|javascript:/i

/** Vérifie qu'un fichier téléchargé est bien un SVG sans contenu actif. */
export function isSafeSvg(text) {
  return SVG_START.test(text) && !UNSAFE_SVG.test(text)
}
