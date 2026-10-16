const integerFormat = new Intl.NumberFormat('fr-FR')
const millionsFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const listFormat = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' })

const ONE_MILLION = 1_000_000

/** 18931966 → « 18,9 millions d'habitants » ; 527326 → « 527 326 habitants ». */
export function formatPopulation(value) {
  if (value < ONE_MILLION) {
    return `${integerFormat.format(value)} habitants`
  }
  const rounded = Math.round((value / ONE_MILLION) * 10) / 10
  const unit = rounded < 2 ? 'million' : 'millions'
  return `${millionsFormat.format(rounded)} ${unit} d'habitants`
}

/** 196722 → « 196 722 km² ». */
export function formatArea(value) {
  return `${integerFormat.format(value)} km²`
}

/** ['A', 'B', 'C'] → « A, B et C ». */
export function formatList(items) {
  return listFormat.format(items)
}

/** Habitants par km², arrondi : 18931966 hab. sur 196722 km² → « 96 hab./km² ». */
export function formatDensity(population, area) {
  return `${integerFormat.format(Math.round(population / area))} hab./km²`
}
