// Construit les fiches pays à partir de sources externes (mledoze/countries,
// Banque mondiale, Wikidata). Toutes les entrées sont validées : une donnée
// manquante ou mal typée fait échouer la génération avec un message explicite.

const SUBREGIONS_FR = Object.freeze({
  'Northern Africa': 'Afrique du Nord',
  'Western Africa': "Afrique de l'Ouest",
  'Middle Africa': 'Afrique centrale',
  'Eastern Africa': "Afrique de l'Est",
  'Southern Africa': 'Afrique australe',
})

// Corrections de la source, alignées sur le géoschéma ONU (M49).
const SUBREGION_OVERRIDES = Object.freeze({ SSD: 'Eastern Africa' })

// Formes françaises usuelles, identiques aux noms de la carte (Natural Earth).
const NAMES_FR = Object.freeze({
  COD: 'République démocratique du Congo',
  COG: 'République du Congo',
  CPV: 'Cap-Vert',
  MUS: 'Maurice',
  NGA: 'Nigeria',
  STP: 'Sao Tomé-et-Principe',
})

// Langues que Intl.DisplayNames ne sait pas nommer en français.
const LANGUAGES_FR = Object.freeze({
  ber: 'berbère',
  bwg: 'chibarwe',
  hgm: 'khoekhoe',
  kck: 'kalanga',
  khi: 'langues khoïsan',
  kwn: 'kwangali',
  ndc: 'ndau',
  pov: 'créole de Haute-Guinée',
  toi: 'tonga',
  zdj: 'comorien',
  zib: 'langue des signes zimbabwéenne',
})

// Monnaies que Intl.DisplayNames ne sait pas nommer en français.
const CURRENCIES_FR = Object.freeze({
  ZWB: 'obligations zimbabwéennes',
})

const languageNames = new Intl.DisplayNames(['fr'], { type: 'language', fallback: 'none' })
const currencyNames = new Intl.DisplayNames(['fr'], { type: 'currency', fallback: 'none' })

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
const isNonEmptyObject = (value) =>
  value !== null && typeof value === 'object' && Object.keys(value).length > 0

function assertValid(code, field, value, isValid) {
  if (!isValid(value)) {
    throw new Error(`${code} : champ « ${field} » manquant ou invalide (${JSON.stringify(value)})`)
  }
  return value
}

function safeDisplayName(displayNames, code) {
  try {
    return displayNames.of(code)
  } catch {
    return undefined
  }
}

export function toCallingCode({ root, suffixes }) {
  return suffixes.length === 1 ? `${root}${suffixes[0]}` : root
}

function validateRecord(record) {
  const code = record?.cca3 ?? '???'
  const check = (field, value, isValid) => assertValid(code, field, value, isValid)

  return {
    code,
    name: NAMES_FR[code] ?? check('translations.fra.common', record?.translations?.fra?.common, isNonEmptyString),
    officialName: check('translations.fra.official', record?.translations?.fra?.official, isNonEmptyString),
    capitals: check('capital', record?.capital, (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString)),
    area: check('area', record?.area, isPositiveNumber),
    languages: check('languages', record?.languages, isNonEmptyObject),
    currencies: check('currencies', record?.currencies, isNonEmptyObject),
    idd: check('idd', record?.idd, (v) => isNonEmptyString(v?.root) && Array.isArray(v?.suffixes)),
    subregion: check('subregion', SUBREGIONS_FR[SUBREGION_OVERRIDES[code] ?? record?.subregion], isNonEmptyString),
    demonym: record?.demonyms?.fra?.m ?? null,
  }
}

/**
 * Fiche d'un pays.
 * @param {{ record: object, population: {value:number, year:string}, capitalsFr: Map<string,string> }} sources
 */
export function buildCountryInfo({ record, population, capitalsFr }) {
  const valid = validateRecord(record)
  const code = valid.code
  assertValid(code, 'population', population?.value, isPositiveNumber)
  const populationYear = assertValid(code, 'population (année)', Number(population.year), isPositiveNumber)

  return {
    id: code,
    name: valid.name,
    officialName: valid.officialName,
    capitals: valid.capitals.map((capital) => capitalsFr.get(capital) ?? capital),
    population: population.value,
    populationYear,
    area: valid.area,
    languages: Object.entries(valid.languages).map(
      ([langCode, englishName]) =>
        LANGUAGES_FR[langCode] ?? safeDisplayName(languageNames, langCode) ?? englishName,
    ),
    currencies: Object.entries(valid.currencies).map(([currencyCode, { name, symbol }]) => ({
      code: currencyCode,
      name: CURRENCIES_FR[currencyCode] ?? safeDisplayName(currencyNames, currencyCode) ?? name,
      symbol: symbol ?? null,
    })),
    callingCode: toCallingCode(valid.idd),
    subregion: valid.subregion,
    demonym: valid.demonym,
    flag: `/flags/${code.toLowerCase()}.svg`,
  }
}

/**
 * Fiches de tous les pays attendus, indexées par code ISO3.
 * @param {{ records: object[], populations: Map, capitalsFr: Map<string, Map<string,string>> }} sources
 * @param {readonly string[]} expectedCodes
 */
export function buildCountriesInfo({ records, populations, capitalsFr }, expectedCodes) {
  const recordsByCode = new Map(records.map((r) => [r?.cca3, r]))
  const missing = expectedCodes.filter((code) => !recordsByCode.has(code))
  if (missing.length > 0) {
    throw new Error(`Pays absents de la source : ${missing.join(', ')}`)
  }

  return Object.fromEntries(
    expectedCodes.map((code) => [
      code,
      buildCountryInfo({
        record: recordsByCode.get(code),
        population: populations.get(code),
        capitalsFr: capitalsFr.get(code) ?? new Map(),
      }),
    ]),
  )
}
