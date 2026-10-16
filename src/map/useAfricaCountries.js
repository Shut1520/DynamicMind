import { useCallback, useEffect, useState } from 'react'
import { loadAfricaCountries } from '../data/loaders.js'

const LOADING = Object.freeze({ status: 'loading', countries: [] })

/** État de chargement des pays : 'loading' | 'ready' | 'error', avec relance possible. */
export function useAfricaCountries() {
  const [state, setState] = useState(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    loadAfricaCountries().then(
      (countries) => {
        if (!cancelled) setState({ status: 'ready', countries })
      },
      (error) => {
        console.error(error)
        if (!cancelled) setState({ status: 'error', countries: [] })
      },
    )

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState(LOADING)
    setAttempt((count) => count + 1)
  }, [])

  return { ...state, retry }
}
