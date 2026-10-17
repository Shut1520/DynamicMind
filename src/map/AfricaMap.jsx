import { useMemo } from 'react'
import CountryTooltip from '../ui/CountryTooltip.jsx'
import RegionTooltip from '../ui/RegionTooltip.jsx'
import Tooltip from '../ui/Tooltip.jsx'
import { findSmallFeatures } from './islands.js'
import MapLayer from './MapLayer.jsx'
import { contextLabel, regionDetails } from './mapEntries.js'
import { MapStatus, RegionStatus } from './MapStatus.jsx'
import MarkerLayer from './MarkerLayer.jsx'
import { useAfricaCountries } from './useAfricaCountries.js'
import { useCountryRegions, useRegionSubdivisions, useSubregionLocalities } from './useCountryRegions.js'
import { useElementSize } from './useElementSize.js'
import { useMapHover } from './useMapHover.js'
import { useMapShapes } from './useMapShapes.js'
import { prefetchTarget, usePrefetch } from './usePrefetch.js'
import { useProjection } from './useProjection.js'
import { useZoomTransition } from './useZoomTransition.js'
import { IDENTITY, fitTransform, freeArea } from './zoom.js'

const TOOLTIP_ID = 'africa-map-tooltip'
const FOCUS_PADDING = 32

/** Cadrage animé sur l'entité ouverte la plus fine (commune, subdivision, région, pays), sinon sur le continent. */
function useFocusView(focusShape, size) {
  const target = useMemo(
    () => (focusShape ? fitTransform(focusShape.bounds, freeArea(size, true), { padding: FOCUS_PADDING }) : IDENTITY),
    [focusShape, size],
  )
  return useZoomTransition(target, size)
}

/** Couche et tracé d'une entité, en cherchant d'abord dans la couche la plus fine. */
function findEntry(layers, id) {
  for (const entry of [...layers].reverse()) {
    const shape = entry.shapes.byId.get(id)
    if (shape) return { ...entry, shape }
  }
  return undefined
}

function ActiveTooltip({ active, entry, size }) {
  const details = entry.level === 'country' ? null : regionDetails(entry.shape, entry.meta)
  return (
    <Tooltip id={TOOLTIP_ID} x={active.x} y={active.y} bounds={size}>
      {details ? (
        <RegionTooltip region={details} countryName={contextLabel(details)} />
      ) : (
        <CountryTooltip id={entry.shape.id} name={entry.shape.name} />
      )}
    </Tooltip>
  )
}

// Pastille de la couche la plus fine en cours de chargement ou en erreur.
function LayerStatus({ layers }) {
  const pending = [...layers].reverse().find(({ state }) => state.status === 'loading' || state.status === 'error')
  const { state, label } = pending ?? layers[0]
  return <RegionStatus status={state.status} label={label} onRetry={state.retry} />
}

/**
 * Carte de l'Afrique : survol, infobulle, clavier, tactile, et zoom animé
 * de niveau en niveau (pays → régions → subdivisions → communes).
 */
function AfricaMap({
  countryId = null,
  regionId = null,
  subregionId = null,
  localityId = null,
  onCountryActivate,
  onRegionActivate,
  onSubregionActivate,
  onLocalityActivate,
}) {
  const [containerRef, size] = useElementSize()
  const geo = useProjection(size.width, size.height)
  const { status, countries, retry } = useAfricaCountries()

  const regionsState = useCountryRegions(countryId)
  const countryShapes = useMapShapes(countries, geo)
  const regionShapes = useMapShapes(regionsState.regions, geo)
  const subdivisionsState = useRegionSubdivisions(countryId, regionShapes.byId.get(regionId)?.properties)
  const subregionShapes = useMapShapes(subdivisionsState.regions, geo)
  const localitiesState = useSubregionLocalities(countryId, subregionShapes.byId.get(subregionId)?.properties)
  const localityShapes = useMapShapes(localitiesState.regions, geo)
  const markers = useMemo(() => (geo ? findSmallFeatures(countries, geo.path) : []), [countries, geo])

  // Couches visibles, de la plus large à la plus fine : les pays toujours, puis les régions
  // du pays ouvert, les subdivisions de la région ouverte et les communes de la subdivision ouverte.
  const layers = [
    { level: 'country', shapes: countryShapes, openId: countryId, meta: null },
    { level: 'region', shapes: regionShapes, openId: regionId, meta: regionsState.meta },
    { level: 'subregion', shapes: subregionShapes, openId: subregionId, meta: subdivisionsState.meta },
    { level: 'locality', shapes: localityShapes, openId: localityId, meta: localitiesState.meta },
  ].filter((entry) => entry.level === 'country' || entry.shapes.shapes.length > 0)

  const focusShape =
    localityShapes.byId.get(localityId) ??
    subregionShapes.byId.get(subregionId) ??
    regionShapes.byId.get(regionId) ??
    countryShapes.byId.get(countryId)
  const view = useFocusView(focusShape, size)

  const { active, handlers } = useMapHover({
    onActivate: (id, level) => {
      if (level === 'country') {
        onCountryActivate?.(id)
        return
      }
      const entry = findEntry(layers, id)
      const activate = { region: onRegionActivate, subregion: onSubregionActivate, locality: onLocalityActivate }[level]
      if (entry) activate?.(regionDetails(entry.shape, entry.meta))
    },
    getAnchor: (id) => {
      const centroid = findEntry(layers, id)?.shape.centroid
      return centroid && [centroid[0] * view.k + view.x, centroid[1] * view.k + view.y]
    },
  })
  const activeEntry = active ? findEntry(layers, active.id) : undefined
  const activeId = activeEntry?.shape.id ?? null
  usePrefetch(prefetchTarget(activeEntry, countryId), geo)

  return (
    <div ref={containerRef} className="africa-map">
      {status !== 'ready' && <MapStatus status={status} onRetry={retry} />}

      {status === 'ready' && geo && (
        <svg
          className={countryId ? 'africa-map__svg is-zoomed' : 'africa-map__svg'}
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-labelledby="africa-map-title"
          {...handlers}
        >
          <title id="africa-map-title">Carte de l&apos;Afrique</title>
          <g className="map-viewport" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {layers.map((entry, index) => {
              const finer = layers[index + 1]
              return (
                <MapLayer
                  key={entry.level}
                  level={entry.level}
                  shapes={entry.shapes.shapes}
                  activeId={activeId}
                  selectedId={entry.openId}
                  focusId={entry.openId}
                  isTabbable={!finer}
                  isCovered={Boolean(finer)}
                  isCoverFocused={Boolean(finer?.openId)}
                  describedBy={TOOLTIP_ID}
                />
              )
            })}
            {activeEntry?.shape.interactive && <path className="map-outline" d={activeEntry.shape.d} />}
            {!countryId && <MarkerLayer markers={markers} activeId={activeId} selectedId={null} scale={view.k} />}
          </g>
        </svg>
      )}

      {status === 'ready' && (
        <LayerStatus
          layers={[
            { state: regionsState, label: 'régions' },
            { state: subdivisionsState, label: 'subdivisions' },
            { state: localitiesState, label: 'communes' },
          ]}
        />
      )}

      {activeEntry && <ActiveTooltip active={active} entry={activeEntry} size={size} />}
    </div>
  )
}

export default AfricaMap
