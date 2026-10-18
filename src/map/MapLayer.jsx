import { memo } from 'react'

const classNames = (...names) => names.filter(Boolean).join(' ')

/**
 * Une couche de la carte (pays, régions ou subdivisions) : un tracé SVG par entité.
 * Quand `focusId` est défini, les autres entités sont estompées (mais restent cliquables).
 * `isTabbable` retire la couche de l'ordre de tabulation quand une couche plus fine prend le relais.
 * `isCovered` : une couche plus fine est dessinée par-dessus l'entité ouverte ;
 * `isCoverFocused` : un élément de cette couche plus fine est lui-même ouvert.
 *
 * @param {{
 *   level: 'country' | 'region' | 'subregion',
 *   shapes: {id: string, name: string, interactive: boolean, d: string}[],
 *   activeId: string | null, selectedId: string | null, focusId?: string | null,
 *   isTabbable?: boolean, isCovered?: boolean, isCoverFocused?: boolean, describedBy: string,
 * }} props
 */
function MapLayer({
  level,
  shapes,
  activeId,
  selectedId,
  focusId = null,
  isTabbable = true,
  isCovered = false,
  isCoverFocused = false,
  describedBy,
}) {
  return (
    <g className={classNames('map-layer', `map-layer--${level}`, isCovered && 'is-covered', isCoverFocused && 'is-cover-focused')}>
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
            // Zone non cliquable (territoire contesté) : simple image nommée, hors de la tabulation.
            role={interactive ? 'button' : 'img'}
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
