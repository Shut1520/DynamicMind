import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const NO_FEATURES = Object.freeze([])

/**
 * Couche géographique chargée à la demande : 'idle' (clé nulle) | 'loading' | 'ready' | 'error',
 * avec relance. Changer de clé efface immédiatement les données de la précédente.
 *
 * @param {string | null} key   identifie ce qui est chargé (null = rien à charger)
 * @param {() => Promise<{ regions: object[], meta: object }>} load
 */
export function useGeoLayer(key, load) {
  const [state, setState] = useState({ key: null, status: 'idle', regions: NO_FEATURES, meta: null })
  const [attempt, setAttempt] = useState(0)
  // Toujours la dernière fonction de chargement, sans relancer l'effet à chaque rendu.
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false

    loadRef.current().then(
      ({ regions, meta }) => {
        if (!cancelled) setState({ key, status: 'ready', regions, meta })
      },
      (error) => {
        console.error(error)
        if (!cancelled) setState({ key, status: 'error', regions: NO_FEATURES, meta: null })
      },
    )

    return () => {
      cancelled = true
    }
  }, [key, attempt])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((count) => count + 1)
  }, [])

  const current =
    state.key === key ? state : { key, status: key ? 'loading' : 'idle', regions: NO_FEATURES, meta: null }

  return { ...current, retry }
}
