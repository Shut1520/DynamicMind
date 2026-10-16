import { memo } from 'react'

const MARKER_RADIUS = 5

/** Repères ronds pour les pays trop petits pour être survolés (petites îles). */
function MarkerLayer({ markers, activeId }) {
  return (
    <g className="map-markers" aria-hidden="true">
      {markers.map(({ id, x, y }) => (
        <circle
          key={id}
          className={id === activeId ? 'map-marker is-active' : 'map-marker'}
          cx={x}
          cy={y}
          r={MARKER_RADIUS}
          data-id={id}
          data-interactive="true"
        />
      ))}
    </g>
  )
}

export default memo(MarkerLayer)
