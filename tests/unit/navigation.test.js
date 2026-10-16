import { navigationReducer } from '../../src/state/navigation.js'

const open = (level, id) => ({ type: 'open', level, id })

describe('navigationReducer', () => {
  test('part du continent (pile vide)', () => {
    expect(navigationReducer(undefined, { type: '@@init' })).toEqual([])
  })

  test('descend du continent vers un pays', () => {
    expect(navigationReducer([], open('country', 'CMR'))).toEqual([{ level: 'country', id: 'CMR' }])
  })

  test('remplace le pays quand on en choisit un autre au même niveau', () => {
    const state = [{ level: 'country', id: 'CMR' }]

    expect(navigationReducer(state, open('country', 'NGA'))).toEqual([{ level: 'country', id: 'NGA' }])
  })

  test('descend d’un pays vers une région', () => {
    const state = [{ level: 'country', id: 'CMR' }]

    expect(navigationReducer(state, open('region', 'CM-LT'))).toEqual([
      { level: 'country', id: 'CMR' },
      { level: 'region', id: 'CM-LT' },
    ])
  })

  test('changer de pays depuis une région oublie la région', () => {
    const state = [{ level: 'country', id: 'CMR' }, { level: 'region', id: 'CM-LT' }]

    expect(navigationReducer(state, open('country', 'GAB'))).toEqual([{ level: 'country', id: 'GAB' }])
  })

  test('remonte d’un niveau', () => {
    const state = [{ level: 'country', id: 'CMR' }, { level: 'region', id: 'CM-LT' }]

    expect(navigationReducer(state, { type: 'back' })).toEqual([{ level: 'country', id: 'CMR' }])
    expect(navigationReducer([], { type: 'back' })).toEqual([])
  })

  test('remonte directement à une profondeur donnée (fil d’Ariane)', () => {
    const state = [{ level: 'country', id: 'CMR' }, { level: 'region', id: 'CM-LT' }]

    expect(navigationReducer(state, { type: 'goTo', depth: 0 })).toEqual([])
  })

  test('ignore un niveau inconnu', () => {
    expect(navigationReducer([], open('planète', 'X'))).toEqual([])
  })

  test('ne modifie pas l’état précédent', () => {
    const state = Object.freeze([Object.freeze({ level: 'country', id: 'CMR' })])

    expect(() => navigationReducer(state, open('region', 'CM-LT'))).not.toThrow()
  })
})
