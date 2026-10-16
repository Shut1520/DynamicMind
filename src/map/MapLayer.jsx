import { memo } from 'react'

/** Une couche de la carte : un tracé SVG par entité géographique. */
function MapLayer({ features, path }) {
  return (
    <g className="map-layer">
      {features.map((feature) => (
        <path
          key={feature.properties.id}
          className="map-region"
          d={path(feature)}
          data-id={feature.properties.id}
          data-interactive={String(feature.properties.interactive)}
        />
      ))}
    </g>
  )
}

export default memo(MapLayer)
