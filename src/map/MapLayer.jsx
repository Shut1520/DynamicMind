import { memo } from 'react'

const classNames = (...names) => names.filter(Boolean).join(' ')

/**
 * Une couche de la carte : un tracé SVG par entité.
 * @param {{ shapes: {id: string, name: string, interactive: boolean, d: string}[], activeId: string | null, selectedId: string | null, describedBy: string }} props
 */
function MapLayer({ shapes, activeId, selectedId, describedBy }) {
  return (
    <g className="map-layer">
      {shapes.map(({ id, name, interactive, d }) => {
        const isActive = interactive && id === activeId
        return (
          <path
            key={id}
            className={classNames('map-region', isActive && 'is-active', id === selectedId && 'is-selected')}
            d={d}
            data-id={id}
            data-interactive={String(interactive)}
            aria-label={name}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-describedby={isActive ? describedBy : undefined}
            aria-pressed={interactive ? id === selectedId : undefined}
          />
        )
      })}
    </g>
  )
}

export default memo(MapLayer)
