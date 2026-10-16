import { memo } from 'react'

const MARKER_RADIUS = 5

const classNames = (...names) => names.filter(Boolean).join(' ')

/** Repères ronds pour les pays trop petits pour être survolés (petites îles). */
function MarkerLayer({ markers, activeId, selectedId }) {
  return (
    <g className="map-markers" aria-hidden="true">
      {markers.map(({ id, x, y }) => (
        <circle
          key={id}
          className={classNames('map-marker', id === activeId && 'is-active', id === selectedId && 'is-selected')}
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
