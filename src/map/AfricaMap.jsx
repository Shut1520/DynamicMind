import { useMemo } from 'react'
import countriesInfo from '../data/countries-info.json'
import CountryTooltip from '../ui/CountryTooltip.jsx'
import RegionTooltip from '../ui/RegionTooltip.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import { findSmallFeatures } from './islands.js'
import MapLayer from './MapLayer.jsx'
import { MapStatus, RegionStatus } from './MapStatus.jsx'
import MarkerLayer from './MarkerLayer.jsx'
import { useAfricaCountries } from './useAfricaCountries.js'
import { useCountryRegions } from './useCountryRegions.js'
import { useElementSize } from './useElementSize.js'
import { useMapHover } from './useMapHover.js'
import { useMapShapes } from './useMapShapes.js'
import { useProjection } from './useProjection.js'
import { useZoomTransition } from './useZoomTransition.js'
import { IDENTITY, fitTransform, freeArea } from './zoom.js'

const TOOLTIP_ID = 'africa-map-tooltip'
const FOCUS_PADDING = 32

/** Données d'une région telles que transmises à la navigation et au panneau d'infos. */
const regionDetails = (shape, meta) => ({
  ...shape.properties,
  countryId: meta?.countryId ?? null,
  type: meta?.type ?? 'Région',
  license: meta?.license ?? null,
})

/** Cadrage animé sur la région ouverte, sinon sur le pays ouvert, sinon sur le continent. */
function useFocusView(focusShape, size) {
  const target = useMemo(
    () => (focusShape ? fitTransform(focusShape.bounds, freeArea(size, true), { padding: FOCUS_PADDING }) : IDENTITY),
    [focusShape, size],
  )
  return useZoomTransition(target, size)
}

function ActiveTooltip({ active, shape, isRegion, meta, size }) {
  return (
    <Tooltip id={TOOLTIP_ID} x={active.x} y={active.y} bounds={size}>
      {isRegion ? (
        <RegionTooltip region={regionDetails(shape, meta)} countryName={countriesInfo[meta?.countryId]?.name ?? ''} />
      ) : (
        <CountryTooltip id={shape.id} name={shape.name} />
      )}
    </Tooltip>
  )
}

/**
 * Carte de l'Afrique : survol, infobulle, clavier, tactile, et zoom animé
 * sur le pays ouvert (dont les régions apparaissent) puis sur la région ouverte.
 */
function AfricaMap({ countryId = null, regionId = null, onCountryActivate, onRegionActivate }) {
  const [containerRef, size] = useElementSize()
  const geo = useProjection(size.width, size.height)
  const { status, countries, retry } = useAfricaCountries()
  const regionsState = useCountryRegions(countryId)

  const countryLayer = useMapShapes(countries, geo)
  const regionLayer = useMapShapes(regionsState.regions, geo)
  const markers = useMemo(() => (geo ? findSmallFeatures(countries, geo.path) : []), [countries, geo])

  const focusShape = regionLayer.byId.get(regionId) ?? countryLayer.byId.get(countryId)
  const view = useFocusView(focusShape, size)
  const findShape = (id) => regionLayer.byId.get(id) ?? countryLayer.byId.get(id)

  const { active, handlers } = useMapHover({
    onActivate: (id, level) => {
      if (level !== 'region') onCountryActivate?.(id)
      else if (regionLayer.byId.has(id)) onRegionActivate?.(regionDetails(regionLayer.byId.get(id), regionsState.meta))
    },
    getAnchor: (id) => {
      const centroid = findShape(id)?.centroid
      return centroid && [centroid[0] * view.k + view.x, centroid[1] * view.k + view.y]
    },
  })
  const activeShape = active ? findShape(active.id) : undefined
  const activeId = activeShape?.id ?? null
  const hasRegions = regionLayer.shapes.length > 0

  return (
    <div ref={containerRef} className="africa-map">
      {status !== 'ready' && <MapStatus status={status} onRetry={retry} />}

      {status === 'ready' && geo && (
        <svg
          className={[
            'africa-map__svg',
            countryId && 'is-zoomed',
            hasRegions && 'has-regions',
            hasRegions && regionId && 'has-region-focus',
          ]
            .filter(Boolean)
            .join(' ')}
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-labelledby="africa-map-title"
          {...handlers}
        >
          <title id="africa-map-title">Carte de l&apos;Afrique</title>
          <g className="map-viewport" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            <MapLayer
              level="country"
              shapes={countryLayer.shapes}
              activeId={activeId}
              selectedId={countryId}
              focusId={countryId}
              isTabbable={!countryId}
              describedBy={TOOLTIP_ID}
            />
            {hasRegions && (
              <MapLayer
                level="region"
                shapes={regionLayer.shapes}
                activeId={activeId}
                selectedId={regionId}
                focusId={regionId}
                describedBy={TOOLTIP_ID}
              />
            )}
            {activeShape?.interactive && <path className="map-outline" d={activeShape.d} />}
            {!countryId && <MarkerLayer markers={markers} activeId={activeId} selectedId={null} scale={view.k} />}
          </g>
        </svg>
      )}

      {status === 'ready' && <RegionStatus status={regionsState.status} onRetry={regionsState.retry} />}

      {activeShape && (
        <ActiveTooltip
          active={active}
          shape={activeShape}
          isRegion={regionLayer.byId.has(activeShape.id)}
          meta={regionsState.meta}
          size={size}
        />
      )}
    </div>
  )
}

export default AfricaMap
