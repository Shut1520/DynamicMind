import { useMemo } from 'react'
import CountryTooltip from '../ui/CountryTooltip.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import { findSmallFeatures } from './islands.js'
import MapLayer from './MapLayer.jsx'
import MarkerLayer from './MarkerLayer.jsx'
import { useAfricaCountries } from './useAfricaCountries.js'
import { useElementSize } from './useElementSize.js'
import { useMapHover } from './useMapHover.js'
import { useProjection } from './useProjection.js'

const TOOLTIP_ID = 'africa-map-tooltip'

function toShapes(countries, path) {
  return countries.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    interactive: feature.properties.interactive,
    d: path(feature),
    centroid: path.centroid(feature),
  }))
}

function MapStatus({ status, onRetry }) {
  if (status === 'loading') {
    return <p className="africa-map__status">Chargement de la carte…</p>
  }
  return (
    <div className="africa-map__status" role="alert">
      <p>Impossible de charger la carte.</p>
      <button type="button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}

/** Carte de l'Afrique : survol, infobulle, clavier et tactile. */
function AfricaMap({ selectedId = null, onCountryActivate }) {
  const [containerRef, size] = useElementSize()
  const geo = useProjection(size.width, size.height)
  const { status, countries, retry } = useAfricaCountries()

  const shapes = useMemo(() => (geo ? toShapes(countries, geo.path) : []), [countries, geo])
  const markers = useMemo(() => (geo ? findSmallFeatures(countries, geo.path) : []), [countries, geo])
  const shapesById = useMemo(() => new Map(shapes.map((shape) => [shape.id, shape])), [shapes])

  const { active, handlers } = useMapHover({
    onActivate: onCountryActivate,
    getAnchor: (id) => shapesById.get(id)?.centroid,
  })
  const activeShape = active ? shapesById.get(active.id) : undefined
  const activeId = activeShape?.id ?? null

  return (
    <div ref={containerRef} className="africa-map">
      {status !== 'ready' && <MapStatus status={status} onRetry={retry} />}

      {status === 'ready' && geo && (
        <svg
          className="africa-map__svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-labelledby="africa-map-title"
          {...handlers}
        >
          <title id="africa-map-title">Carte de l&apos;Afrique</title>
          <MapLayer shapes={shapes} activeId={activeId} selectedId={selectedId} describedBy={TOOLTIP_ID} />
          {activeShape?.interactive && <path className="map-outline" d={activeShape.d} />}
          <MarkerLayer markers={markers} activeId={activeId} selectedId={selectedId} />
        </svg>
      )}

      {activeShape && (
        <Tooltip id={TOOLTIP_ID} x={active.x} y={active.y} bounds={size}>
          <CountryTooltip id={activeShape.id} name={activeShape.name} />
        </Tooltip>
      )}
    </div>
  )
}

export default AfricaMap
