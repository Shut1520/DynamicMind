import { memo } from 'react'

const classNames = (...names) => names.filter(Boolean).join(' ')

/**
 * Une couche de la carte (pays ou régions) : un tracé SVG par entité.
 * Quand `focusId` est défini, les autres entités sont estompées (mais restent cliquables).
 * `isTabbable` retire la couche de l'ordre de tabulation quand une couche plus fine prend le relais.
 *
 * @param {{
 *   level: 'country' | 'region',
 *   shapes: {id: string, name: string, interactive: boolean, d: string}[],
 *   activeId: string | null, selectedId: string | null, focusId?: string | null,
 *   isTabbable?: boolean, describedBy: string,
 * }} props
 */
function MapLayer({ level, shapes, activeId, selectedId, focusId = null, isTabbable = true, describedBy }) {
  return (
    <g className={`map-layer map-layer--${level}`}>
      {shapes.map(({ id, name, interactive, d }) => {
        const isActive = interactive && id === activeId
        return (
          <path
            key={id}
            className={classNames(
              'map-region',
              isActive && 'is-active',
              id === selectedId && 'is-selected',
              focusId && id !== focusId && 'is-dimmed',
            )}
            d={d}
            data-id={id}
            data-level={level}
            data-interactive={String(interactive)}
            aria-label={name}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? (isTabbable ? 0 : -1) : undefined}
            aria-describedby={isActive ? describedBy : undefined}
            aria-pressed={interactive ? id === selectedId : undefined}
          />
        )
      })}
    </g>
  )
}

export default memo(MapLayer)
