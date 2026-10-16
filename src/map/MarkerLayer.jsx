import { memo } from 'react'

const MARKER_RADIUS = 5

const classNames = (...names) => names.filter(Boolean).join(' ')

/**
 * Repères ronds pour les pays trop petits pour être survolés (petites îles).
 * Le rayon est divisé par `scale` pour garder une taille constante à l'écran pendant un zoom.
 */
function MarkerLayer({ markers, activeId, selectedId, scale = 1 }) {
  return (
    <g className="map-markers" aria-hidden="true">
      {markers.map(({ id, x, y }) => (
        <circle
          key={id}
          className={classNames('map-marker', id === activeId && 'is-active', id === selectedId && 'is-selected')}
          cx={x}
          cy={y}
          r={MARKER_RADIUS / scale}
          data-id={id}
          data-interactive="true"
        />
      ))}
    </g>
  )
}

export default memo(MarkerLayer)
