/** État de chargement de la carte du continent (plein cadre). */
export function MapStatus({ status, onRetry }) {
  if (status === 'loading') {
    return <p className="africa-map__status">Chargement de la carte…</p>
  }
  return (
    <div className="africa-map__status" role="alert">
      <p>Impossible de charger la carte.</p>
      <button type="button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}

/**
 * Pastille discrète pour le chargement d'une couche (régions ou subdivisions).
 * @param {{ status: string, label: string, onRetry: () => void }} props  `label` : « régions », « subdivisions »…
 */
export function RegionStatus({ status, label = 'régions', onRetry }) {
  if (status === 'loading') {
    return (
      <p className="map-chip" role="status">
        Chargement des {label}…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <div className="map-chip" role="alert">
        {label.charAt(0).toUpperCase() + label.slice(1)} indisponibles.
        <button type="button" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    )
  }
  return null
}
