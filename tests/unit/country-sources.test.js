import {
  isSafeSvg,
  parseWikidataCapitals,
  parseWorldBankPopulation,
} from '../../scripts/lib/country-sources.mjs'

describe('parseWorldBankPopulation', () => {
  test('indexe la population la plus récente par code ISO3', () => {
    const response = [
      { page: 1 },
      [
        { countryiso3code: 'SEN', date: '2025', value: 18931966 },
        { countryiso3code: 'NGA', date: '2025', value: 237527782 },
      ],
    ]

    expect(parseWorldBankPopulation(response)).toEqual(
      new Map([
        ['SEN', { value: 18931966, year: '2025' }],
        ['NGA', { value: 237527782, year: '2025' }],
      ]),
    )
  })

  test('ignore les lignes sans valeur', () => {
    const response = [{}, [{ countryiso3code: 'ERI', date: '2025', value: null }]]

    expect(parseWorldBankPopulation(response).size).toBe(0)
  })

  test('rejette une réponse au format inattendu', () => {
    expect(() => parseWorldBankPopulation([{ message: 'erreur' }])).toThrow(/Banque mondiale/)
  })
})

describe('parseWikidataCapitals', () => {
  const binding = (iso3, en, fr) => ({
    iso3: { value: iso3 },
    capEn: { value: en },
    ...(fr ? { capFr: { value: fr } } : {}),
  })

  test('associe nom anglais et nom français par pays', () => {
    const response = {
      results: {
        bindings: [
          binding('EGY', 'Cairo', 'Le Caire'),
          binding('ZAF', 'Cape Town', 'Le Cap'),
          binding('ZAF', 'Pretoria', 'Pretoria'),
        ],
      },
    }

    const capitals = parseWikidataCapitals(response)

    expect(capitals.get('EGY')).toEqual(new Map([['Cairo', 'Le Caire']]))
    expect(capitals.get('ZAF').get('Cape Town')).toBe('Le Cap')
  })

  test('ignore les capitales sans libellé français', () => {
    const response = { results: { bindings: [binding('SEN', 'Dakar')] } }

    expect(parseWikidataCapitals(response).get('SEN')).toBeUndefined()
  })

  test('rejette une réponse au format inattendu', () => {
    expect(() => parseWikidataCapitals({})).toThrow(/Wikidata/)
  })
})

describe('isSafeSvg', () => {
  test('accepte un drapeau SVG simple', () => {
    const svg = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#00853f"/></svg>'

    expect(isSafeSvg(svg)).toBe(true)
  })

  test.each([
    ['un script', '<svg><script>alert(1)</script></svg>'],
    ['un gestionnaire d’événement', '<svg onload="alert(1)"></svg>'],
    ['un lien javascript', '<svg><a href="javascript:alert(1)"/></svg>'],
    ['un foreignObject', '<svg><foreignObject/></svg>'],
    ['du HTML', '<html><body></body></html>'],
  ])('refuse un fichier contenant %s', (_label, text) => {
    expect(isSafeSvg(text)).toBe(false)
  })
})
