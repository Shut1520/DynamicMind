import countriesInfo from '../data/countries-info.json'
import { assetUrl } from './assets.js'
import { formatArea, formatDensity, formatList, formatPopulation } from './format.js'

// Une « fiche » décrit ce qu'affiche le panneau d'infos, pour un pays comme pour une région.

const plural = (items, singular, pluralLabel) => (items.length > 1 ? pluralLabel : singular)

const withYear = (text, year) => (year ? `${text} (${year})` : text)

const flagOf = (info) => ({ src: assetUrl(info.flag), alt: `Drapeau : ${info.name}` })

/** Fiche d'un pays. */
export function countrySheet(countryId) {
  const info = countriesInfo[countryId]
  if (!info) return null

  return {
    key: `country:${info.id}`,
    label: `Fiche du pays : ${info.name}`,
    flag: flagOf(info),
    title: info.name,
    subtitle: info.officialName,
    facts: [
      [plural(info.capitals, 'Capitale', 'Capitales'), formatList(info.capitals)],
      ['Population', withYear(formatPopulation(info.population), info.populationYear)],
      ['Superficie', formatArea(info.area)],
      ['Densité', formatDensity(info.population, info.area)],
      [plural(info.languages, 'Langue', 'Langues'), formatList(info.languages)],
      [
        plural(info.currencies, 'Monnaie', 'Monnaies'),
        formatList(info.currencies.map(({ code, name }) => `${name} · ${code}`)),
      ],
      ['Indicatif', info.callingCode],
      ['Région', info.subregion],
      ['Habitants', info.demonym],
    ].filter(([, value]) => value),
    sources: 'Sources : Banque mondiale (population), mledoze/countries, Wikidata.',
  }
}

/** Fiche d'une région ou d'une subdivision (les informations absentes de la source sont omises). */
export function regionSheet(region) {
  const country = countriesInfo[region.countryId]
  const countryName = country?.name ?? ''

  return {
    key: `region:${region.id}`,
    label: `Fiche de la région : ${region.name}`,
    flag: country ? flagOf(country) : null,
    title: region.name,
    subtitle: `${region.type} · ${countryName}`,
    facts: [
      region.capitals.length > 0 && [plural(region.capitals, 'Chef-lieu', 'Chefs-lieux'), formatList(region.capitals)],
      region.population && ['Population', withYear(formatPopulation(region.population), region.populationYear)],
      ['Superficie', formatArea(region.area)],
      region.population && ['Densité', formatDensity(region.population, region.area)],
      region.iso && ['Code ISO', region.iso],
      region.parentName && ['Rattachée à', region.parentName],
      ['Pays', countryName],
    ].filter(Boolean),
    sources: `Sources : geoBoundaries${region.license ? ` (licence : ${region.license})` : ''}, Wikidata.`,
  }
}
