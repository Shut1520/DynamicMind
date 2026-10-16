import { memo } from 'react'

/**
 * Une couche de la carte : un tracé SVG par entité.
 * @param {{ shapes: {id: string, name: string, interactive: boolean, d: string}[], activeId: string | null, describedBy: string }} props
 */
function MapLayer({ shapes, activeId, describedBy }) {
  return (
    <g className="map-layer">
      {shapes.map(({ id, name, interactive, d }) => {
        const isActive = interactive && id === activeId
        return (
          <path
            key={id}
            className={isActive ? 'map-region is-active' : 'map-region'}
            d={d}
            data-id={id}
            data-interactive={String(interactive)}
            aria-label={name}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-describedby={isActive ? describedBy : undefined}
          />
        )
      })}
    </g>
  )
}

export default memo(MapLayer)
