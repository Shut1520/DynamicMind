import { formatArea, formatList, formatPopulation } from './format.js'

/** Contenu de l'infobulle d'une région : nom, type, pays et quelques chiffres. */
function RegionTooltip({ region, countryName }) {
  return (
    <>
      <strong className="map-tooltip__title">{region.name}</strong>
      <span className="map-tooltip__note">
        {region.type} · {countryName}
      </span>
      <dl className="map-tooltip__facts">
        {region.capitals.length > 0 && (
          <>
            <dt>Chef-lieu</dt>
            <dd>{formatList(region.capitals)}</dd>
          </>
        )}
        {region.population && (
          <>
            <dt>Population</dt>
            <dd>{formatPopulation(region.population)}</dd>
          </>
        )}
        <dt>Superficie</dt>
        <dd>{formatArea(region.area)}</dd>
      </dl>
    </>
  )
}

export default RegionTooltip
