// Pile de navigation : [] = continent, puis un élément par niveau ouvert.
export const LEVELS = Object.freeze(['country', 'region', 'subregion'])

/**
 * @typedef {{ level: 'country' | 'region' | 'subregion', id: string }} NavigationEntry
 * @param {NavigationEntry[]} state
 */
export function navigationReducer(state = [], action) {
  switch (action.type) {
    case 'open': {
      const depth = LEVELS.indexOf(action.level)
      if (depth < 0) return state
      return [...state.slice(0, depth), { level: action.level, id: action.id }]
    }
    case 'back':
      return state.slice(0, -1)
    case 'goTo':
      return state.slice(0, action.depth)
    default:
      return state
  }
}
