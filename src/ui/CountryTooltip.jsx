import countriesInfo from '../data/countries-info.json'
import { formatList, formatPopulation } from './format.js'

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/** Contenu de l'infobulle d'un pays (ou d'un territoire contesté). */
function CountryTooltip({ id, name }) {
  const info = countriesInfo[id]

  if (!info) {
    return (
      <>
        <strong className="map-tooltip__title">{name}</strong>
        <span className="map-tooltip__note">Territoire au statut contesté</span>
      </>
    )
  }

  const capitalLabel = info.capitals.length > 1 ? 'Capitales' : 'Capitale'

  return (
    <>
      <div className="map-tooltip__header">
        <img className="map-tooltip__flag" src={assetUrl(info.flag)} alt="" width="30" height="20" />
        <strong className="map-tooltip__title">{info.name}</strong>
      </div>
      <dl className="map-tooltip__facts">
        <dt>{capitalLabel}</dt>
        <dd>{formatList(info.capitals)}</dd>
        <dt>Population</dt>
        <dd>{formatPopulation(info.population)}</dd>
        <dt>Région</dt>
        <dd>{info.subregion}</dd>
      </dl>
    </>
  )
}

export default CountryTooltip
