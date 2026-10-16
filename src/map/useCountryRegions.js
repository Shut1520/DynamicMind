import { useCallback, useEffect, useState } from 'react'
import { loadCountryRegions } from '../data/loaders.js'

const NO_REGIONS = Object.freeze([])

/**
 * Régions du pays ouvert : 'idle' (aucun pays) | 'loading' | 'ready' | 'error', avec relance.
 * Changer de pays efface immédiatement les régions du précédent.
 */
export function useCountryRegions(countryId) {
  const [state, setState] = useState({ countryId: null, status: 'idle', regions: NO_REGIONS, meta: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!countryId) return undefined
    let cancelled = false

    loadCountryRegions(countryId).then(
      ({ regions, meta }) => {
        if (!cancelled) setState({ countryId, status: 'ready', regions, meta })
      },
      (error) => {
        console.error(error)
        if (!cancelled) setState({ countryId, status: 'error', regions: NO_REGIONS, meta: null })
      },
    )

    return () => {
      cancelled = true
    }
  }, [countryId, attempt])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((count) => count + 1)
  }, [])

  const current =
    state.countryId === countryId
      ? state
      : { countryId, status: countryId ? 'loading' : 'idle', regions: NO_REGIONS, meta: null }

  return { ...current, retry }
}
