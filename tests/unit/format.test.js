import { formatArea, formatList, formatPopulation } from '../../src/ui/format.js'

// Intl utilise des espaces insécables comme séparateurs : on les normalise pour comparer.
const plain = (text) => text.replace(/[  ]/g, ' ')

describe('formatPopulation', () => {
  test('arrondit en millions au-delà d’un million', () => {
    expect(plain(formatPopulation(18931966))).toBe("18,9 millions d'habitants")
  })

  test('accorde « million » au singulier sous deux millions', () => {
    expect(plain(formatPopulation(1243741))).toBe("1,2 million d'habitants")
  })

  test('donne le chiffre exact sous un million', () => {
    expect(plain(formatPopulation(527326))).toBe('527 326 habitants')
  })
})

describe('formatArea', () => {
  test('affiche la superficie en km²', () => {
    expect(plain(formatArea(196722))).toBe('196 722 km²')
  })
})

describe('formatList', () => {
  test('joint les éléments à la française', () => {
    expect(formatList(['Pretoria', 'Bloemfontein', 'Le Cap'])).toBe('Pretoria, Bloemfontein et Le Cap')
    expect(formatList(['Dakar'])).toBe('Dakar')
  })
})
