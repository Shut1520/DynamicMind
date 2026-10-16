import { useCallback, useMemo, useReducer } from 'react'
import { navigationReducer } from './navigation.js'

/** Navigation continent → pays → région, avec retour arrière. */
export function useMapNavigation() {
  const [path, dispatch] = useReducer(navigationReducer, [])

  const open = useCallback((level, id) => dispatch({ type: 'open', level, id }), [])
  const back = useCallback(() => dispatch({ type: 'back' }), [])
  const goTo = useCallback((depth) => dispatch({ type: 'goTo', depth }), [])

  return useMemo(() => ({ path, open, back, goTo }), [path, open, back, goTo])
}
