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

/** Pastille discrète pour le chargement des régions d'un pays. */
export function RegionStatus({ status, onRetry }) {
  if (status === 'loading') {
    return (
      <p className="map-chip" role="status">
        Chargement des régions…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <div className="map-chip" role="alert">
        Régions indisponibles.
        <button type="button" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    )
  }
  return null
}
