// Pile de navigation : [] = continent, puis un élément par niveau ouvert.
// « locality » : communes, secteurs, chefferies (là où la source descend jusque-là).
export const LEVELS = Object.freeze(['country', 'region', 'subregion', 'locality'])

/**
 * @typedef {{ level: 'country' | 'region' | 'subregion' | 'locality', id: string, data?: object }} NavigationEntry
 * `data` transporte ce qu'il faut pour afficher le niveau (ex. la fiche d'une région).
 * @param {NavigationEntry[]} state
 */
export function navigationReducer(state = [], action) {
  switch (action.type) {
    case 'open': {
      const depth = LEVELS.indexOf(action.level)
      if (depth < 0) return state
      const entry = { level: action.level, id: action.id, ...(action.data ? { data: action.data } : {}) }
      return [...state.slice(0, depth), entry]
    }
    case 'back':
      return state.slice(0, -1)
    case 'goTo':
      return state.slice(0, action.depth)
    default:
      return state
  }
}
