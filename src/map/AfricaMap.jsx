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
import { useZoomTransition } from './useZoomTransition.js'
import { IDENTITY, fitTransform, freeArea } from './zoom.js'

const TOOLTIP_ID = 'africa-map-tooltip'
const FOCUS_PADDING = 32

function toShapes(countries, path) {
  return countries.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    interactive: feature.properties.interactive,
    d: path(feature),
    centroid: path.centroid(feature),
    bounds: path.bounds(feature),
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

/** Géométries de la carte, calculées une fois par projection. */
function useCountryShapes(countries, geo) {
  return useMemo(() => {
    const shapes = geo ? toShapes(countries, geo.path) : []
    return {
      shapes,
      shapesById: new Map(shapes.map((shape) => [shape.id, shape])),
      markers: geo ? findSmallFeatures(countries, geo.path) : [],
    }
  }, [countries, geo])
}

/**
 * Carte de l'Afrique : survol, infobulle, clavier, tactile,
 * et zoom animé sur le pays `focusId` (cadré à gauche du panneau d'infos).
 */
function AfricaMap({ focusId = null, selectedId = null, onCountryActivate }) {
  const [containerRef, size] = useElementSize()
  const geo = useProjection(size.width, size.height)
  const { status, countries, retry } = useAfricaCountries()
  const { shapes, shapesById, markers } = useCountryShapes(countries, geo)

  const focusShape = focusId ? shapesById.get(focusId) : undefined
  const target = useMemo(
    () => (focusShape ? fitTransform(focusShape.bounds, freeArea(size, true), { padding: FOCUS_PADDING }) : IDENTITY),
    [focusShape, size],
  )
  const view = useZoomTransition(target, size)

  const { active, handlers } = useMapHover({
    onActivate: onCountryActivate,
    getAnchor: (id) => {
      const centroid = shapesById.get(id)?.centroid
      return centroid && [centroid[0] * view.k + view.x, centroid[1] * view.k + view.y]
    },
  })
  const activeShape = active ? shapesById.get(active.id) : undefined
  const activeId = activeShape?.id ?? null

  return (
    <div ref={containerRef} className="africa-map">
      {status !== 'ready' && <MapStatus status={status} onRetry={retry} />}

      {status === 'ready' && geo && (
        <svg
          className={focusId ? 'africa-map__svg is-zoomed' : 'africa-map__svg'}
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-labelledby="africa-map-title"
          {...handlers}
        >
          <title id="africa-map-title">Carte de l&apos;Afrique</title>
          <g className="map-viewport" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            <MapLayer
              shapes={shapes}
              activeId={activeId}
              selectedId={selectedId}
              focusId={focusId}
              describedBy={TOOLTIP_ID}
            />
            {activeShape?.interactive && <path className="map-outline" d={activeShape.d} />}
            {!focusId && <MarkerLayer markers={markers} activeId={activeId} selectedId={selectedId} scale={view.k} />}
          </g>
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
