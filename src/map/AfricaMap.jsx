import MapLayer from './MapLayer.jsx'
import { useAfricaCountries } from './useAfricaCountries.js'
import { useElementSize } from './useElementSize.js'
import { useProjection } from './useProjection.js'

function AfricaMap() {
  const [containerRef, { width, height }] = useElementSize()
  const geo = useProjection(width, height)
  const { status, countries, retry } = useAfricaCountries()

  return (
    <div ref={containerRef} className="africa-map">
      {status === 'loading' && <p className="africa-map__status">Chargement de la carte…</p>}

      {status === 'error' && (
        <div className="africa-map__status" role="alert">
          <p>Impossible de charger la carte.</p>
          <button type="button" onClick={retry}>
            Réessayer
          </button>
        </div>
      )}

      {status === 'ready' && geo && (
        <svg
          className="africa-map__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="africa-map-title"
        >
          <title id="africa-map-title">Carte de l&apos;Afrique</title>
          <MapLayer features={countries} path={geo.path} />
        </svg>
      )}
    </div>
  )
}

export default AfricaMap
