import {
  buildCountriesInfo,
  buildCountryInfo,
  toCallingCode,
} from '../../scripts/lib/country-info.mjs'

const senegalRecord = {
  cca3: 'SEN',
  name: { common: 'Senegal', official: 'Republic of Senegal' },
  translations: { fra: { common: 'Sénégal', official: 'République du Sénégal' } },
  capital: ['Dakar'],
  area: 196722,
  languages: { fra: 'French' },
  currencies: { XOF: { name: 'West African CFA franc', symbol: 'Fr' } },
  idd: { root: '+2', suffixes: ['21'] },
  subregion: 'Western Africa',
  demonyms: { fra: { f: 'Sénégalaise', m: 'Sénégalais' } },
}

const southAfricaRecord = {
  ...senegalRecord,
  cca3: 'ZAF',
  translations: { fra: { common: 'Afrique du Sud', official: "République d'Afrique du Sud" } },
  capital: ['Pretoria', 'Bloemfontein', 'Cape Town'],
  languages: { afr: 'Afrikaans', khi: 'Khoisan', xyz: 'Made-up' },
  currencies: { ZAR: { name: 'South African rand', symbol: 'R' } },
  idd: { root: '+2', suffixes: ['7'] },
  subregion: 'Southern Africa',
  demonyms: { fra: { f: 'Sud-Africaine', m: 'Sud-Africain' } },
}

const senegalSources = {
  record: senegalRecord,
  population: { value: 18931966, year: '2025' },
  capitalsFr: new Map([['Dakar', 'Dakar']]),
}

describe('toCallingCode', () => {
  test('assemble racine et suffixe unique', () => {
    expect(toCallingCode({ root: '+2', suffixes: ['21'] })).toBe('+221')
  })

  test('ne garde que la racine quand il y a plusieurs suffixes', () => {
    expect(toCallingCode({ root: '+1', suffixes: ['201', '202'] })).toBe('+1')
  })
})

describe('buildCountryInfo', () => {
  test('produit une fiche complète en français', () => {
    expect(buildCountryInfo(senegalSources)).toEqual({
      id: 'SEN',
      name: 'Sénégal',
      officialName: 'République du Sénégal',
      capitals: ['Dakar'],
      population: 18931966,
      populationYear: 2025,
      area: 196722,
      languages: ['français'],
      currencies: [{ code: 'XOF', name: 'franc CFA (BCEAO)', symbol: 'Fr' }],
      callingCode: '+221',
      subregion: "Afrique de l'Ouest",
      demonym: 'Sénégalais',
      flag: '/flags/sen.svg',
    })
  })

  test('traduit les capitales connues et garde les autres telles quelles', () => {
    const info = buildCountryInfo({
      record: southAfricaRecord,
      population: { value: 64000000, year: '2025' },
      capitalsFr: new Map([['Cape Town', 'Le Cap']]),
    })

    expect(info.capitals).toEqual(['Pretoria', 'Bloemfontein', 'Le Cap'])
  })

  test('complète les langues absentes d’Intl, puis retombe sur le nom anglais', () => {
    const info = buildCountryInfo({
      record: southAfricaRecord,
      population: { value: 64000000, year: '2025' },
      capitalsFr: new Map(),
    })

    expect(info.languages).toEqual(['afrikaans', 'langues khoïsan', 'Made-up'])
  })

  test('utilise la forme française usuelle du nom quand la source diffère', () => {
    const congo = {
      ...senegalRecord,
      cca3: 'COD',
      translations: { fra: { common: 'Congo (Rép. dém.)', official: 'République démocratique du Congo' } },
    }

    expect(buildCountryInfo({ ...senegalSources, record: congo }).name).toBe('République démocratique du Congo')
  })

  test('classe le Soudan du Sud en Afrique de l’Est (géoschéma ONU)', () => {
    const southSudan = { ...senegalRecord, cca3: 'SSD', subregion: 'Middle Africa' }

    expect(buildCountryInfo({ ...senegalSources, record: southSudan }).subregion).toBe("Afrique de l'Est")
  })

  test('échoue clairement si la population manque', () => {
    expect(() => buildCountryInfo({ ...senegalSources, population: undefined })).toThrow(/SEN.*population/i)
  })

  test('échoue clairement si un champ obligatoire est invalide', () => {
    const broken = { ...senegalRecord, area: 'grand' }

    expect(() => buildCountryInfo({ ...senegalSources, record: broken })).toThrow(/SEN.*area/i)
  })
})

describe('buildCountriesInfo', () => {
  const sources = {
    records: [senegalRecord, { ...senegalRecord, cca3: 'FRA' }],
    populations: new Map([['SEN', { value: 18931966, year: '2025' }]]),
    capitalsFr: new Map([['SEN', new Map([['Dakar', 'Dakar']])]]),
  }

  test('indexe les fiches par code ISO3 et ignore les pays hors liste', () => {
    const info = buildCountriesInfo(sources, ['SEN'])

    expect(Object.keys(info)).toEqual(['SEN'])
    expect(info.SEN.name).toBe('Sénégal')
  })

  test('échoue si un pays attendu est absent des sources', () => {
    expect(() => buildCountriesInfo(sources, ['SEN', 'MLI'])).toThrow(/MLI/)
  })
})
