import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import {
  buildRegionTopology,
  normalizeRegions,
  parseWikidataRegions,
  rewindForD3,
  translateRegionType,
} from '../../scripts/lib/region-geo.mjs'

// Carré de 1° orienté comme en RFC 7946 (sens antihoraire) : d3 le lit comme « tout le globe sauf ce carré ».
const ccwSquare = (x, y) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]],
})

const region = (props, geometry = ccwSquare(10, 5)) => ({ type: 'Feature', properties: props, geometry })

const GEOJSON = {
  type: 'FeatureCollection',
  features: [
    region({ shapeName: 'Far North', shapeISO: 'CM-EN', shapeID: 'A1', shapeType: 'ADM1' }, ccwSquare(14, 10)),
    region({ shapeName: 'Littoral', shapeISO: 'CM-LT', shapeID: 'A2', shapeType: 'ADM1' }, ccwSquare(9, 3)),
    region({ shapeName: 'Sans code', shapeISO: '', shapeID: 'A3', shapeType: 'ADM1' }, ccwSquare(12, 4)),
  ],
}

describe('rewindForD3', () => {
  test('réoriente un polygone inversé pour que d3 n’y voie que la région', () => {
    const rewound = rewindForD3(region({}, ccwSquare(10, 5)))

    expect(geoArea(rewound)).toBeLessThan(0.001)
  })

  test('laisse intact un polygone déjà bien orienté', () => {
    const good = rewindForD3(region({}, ccwSquare(10, 5)))

    expect(rewindForD3(good).geometry).toEqual(good.geometry)
  })

  test('traite chaque polygone d’un MultiPolygon', () => {
    const multi = region({}, {
      type: 'MultiPolygon',
      coordinates: [ccwSquare(0, 0).coordinates, ccwSquare(5, 5).coordinates],
    })

    expect(geoArea(rewindForD3(multi))).toBeLessThan(0.001)
  })

  test('ne modifie pas l’entité source', () => {
    const source = region({}, ccwSquare(10, 5))
    const before = JSON.stringify(source)
    rewindForD3(source)

    expect(JSON.stringify(source)).toBe(before)
  })
})

describe('normalizeRegions', () => {
  test('produit des régions réorientées avec id, code ISO, nom et superficie', () => {
    const regions = normalizeRegions(GEOJSON, 'CMR')

    expect(regions).toHaveLength(3)
    expect(regions[0].properties).toEqual({
      id: 'A1',
      iso: 'CM-EN',
      nameEn: 'Far North',
      area: expect.any(Number),
    })
    expect(regions[0].properties.area).toBeGreaterThan(11000)
    expect(regions[0].properties.area).toBeLessThan(13000)
    expect(regions[2].properties.iso).toBeNull()
  })

  test('rejette un fichier qui n’est pas une FeatureCollection', () => {
    expect(() => normalizeRegions({ type: 'Feature' }, 'CMR')).toThrow(/CMR/)
  })

  test('rejette une région sans nom ni identifiant', () => {
    const broken = { type: 'FeatureCollection', features: [region({ shapeName: '', shapeID: '' })] }

    expect(() => normalizeRegions(broken, 'CMR')).toThrow(/CMR/)
  })
})

describe('translateRegionType', () => {
  test.each([
    ['Region', 'Région'],
    ['Province', 'Province'],
    ['State', 'État'],
    ['Governorate', 'Gouvernorat'],
    ['County', 'Comté'],
  ])('%s → %s', (english, french) => {
    expect(translateRegionType(english)).toBe(french)
  })

  test('retombe sur « Région » pour un libellé inconnu', () => {
    expect(translateRegionType('Kingdom')).toBe('Région')
  })
})

describe('parseWikidataRegions', () => {
  const row = (iso, extra = {}) => ({ iso: { value: iso }, ...extra })
  const lit = (value) => ({ value: String(value) })

  test('associe nom français, chef-lieu et population la plus récente', () => {
    const response = {
      results: {
        bindings: [
          row('CM-EN', { label: lit('Extrême-Nord'), capital: lit('Maroua'), pop: lit(3000000), date: lit('2005-01-01T00:00:00Z') }),
          row('CM-EN', { label: lit('Extrême-Nord'), capital: lit('Maroua'), pop: lit(4000000), date: lit('2015-01-01T00:00:00Z') }),
          row('CM-LT', { label: lit('Littoral') }),
        ],
      },
    }

    const regions = parseWikidataRegions(response)

    expect(regions.get('CM-EN')).toEqual({ name: 'Extrême-Nord', capitals: ['Maroua'], population: 4000000, populationYear: 2015 })
    expect(regions.get('CM-LT')).toEqual({ name: 'Littoral', capitals: [], population: null, populationYear: null })
  })

  test('rejette une réponse au format inattendu', () => {
    expect(() => parseWikidataRegions({})).toThrow(/Wikidata/)
  })
})

describe('buildRegionTopology', () => {
  const meta = { countryId: 'CMR', type: 'Region', license: 'CC BY 3.0', source: 'geoBoundaries, Wikimedia', year: 2016 }

  test('enrichit les régions avec les données françaises et garde les métadonnées', () => {
    const regions = normalizeRegions(GEOJSON, 'CMR')
    const wikidata = new Map([['CM-EN', { name: 'Extrême-Nord', capitals: ['Maroua'], population: 4000000, populationYear: 2015 }]])

    const topology = buildRegionTopology(regions, wikidata, meta)
    const features = feature(topology, topology.objects.regions).features
    const farNorth = features.find((f) => f.properties.id === 'A1')

    expect(topology.meta).toEqual({ ...meta, type: 'Région' })
    expect(farNorth.properties).toMatchObject({
      id: 'A1',
      iso: 'CM-EN',
      name: 'Extrême-Nord',
      capitals: ['Maroua'],
      population: 4000000,
      populationYear: 2015,
    })
    expect(features.find((f) => f.properties.id === 'A2').properties.name).toBe('Littoral')
  })
})

describe('nettoyage des données sources', () => {
  // Copie de l'artefact réel de geoBoundaries (Namibie, « AO-CNN ») : un éclat de quelques mètres
  // de large, que d3 lit comme le globe entier quel que soit le sens de l'anneau.
  const degenerate = {
    type: 'Polygon',
    coordinates: [[
      [14.219111769392669, -17.388137302094776],
      [14.287427205601091, -17.388136495402875],
      [14.21880090343899, -17.388136495402875],
      [14.219111769392669, -17.388137302094776],
    ]],
  }

  test('écarte une région à la géométrie dégénérée', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        region({ shapeName: 'Kunene', shapeISO: 'NA-KU', shapeID: 'OK1' }, ccwSquare(13, -19)),
        region({ shapeName: 'Kunene', shapeISO: 'AO-CNN', shapeID: 'BAD' }, degenerate),
      ],
    }

    expect(normalizeRegions(geojson, 'NAM').map((r) => r.properties.id)).toEqual(['OK1'])
  })

  test('reprend les noms d’origine quand Wikidata donne le même nom à deux régions', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        region({ shapeName: 'Kunene', shapeISO: 'NA-KU', shapeID: 'K1' }, ccwSquare(13, -19)),
        region({ shapeName: 'Kavango', shapeISO: 'NA-OK', shapeID: 'K2' }, ccwSquare(19, -18)),
      ],
    }
    const wikidata = new Map([
      ['NA-KU', { name: 'Kunene', capitals: ['Opuwo'], population: 86856, populationYear: 2011 }],
      ['NA-OK', { name: 'Kunene', capitals: ['Opuwo'], population: 86856, populationYear: 2011 }],
    ])

    const topology = buildRegionTopology(normalizeRegions(geojson, 'NAM'), wikidata, { type: 'Region' })
    const byId = new Map(feature(topology, topology.objects.regions).features.map((f) => [f.properties.id, f.properties]))

    expect(byId.get('K1')).toMatchObject({ name: 'Kunene', capitals: [], population: null })
    expect(byId.get('K2')).toMatchObject({ name: 'Kavango', capitals: [], population: null })
  })
})

describe('translateRegionType (libellés irréguliers)', () => {
  test.each([
    ['Unknown', 'Région'],
    ['Departments', 'Département'],
    ['Départements', 'Département'],
    ['districts de Côte d’Ivoire', 'District'],
    ['Prefecture and Commune', 'Préfecture'],
    ['Wilya', 'Wilaya'],
    ['Wilayat/State', 'Wilaya'],
    ['Regiões', 'Région'],
    ['region', 'Région'],
    ['Local Government Areas', 'Zone de gouvernement local'],
    ['Administrative regions and governate', 'Région'],
  ])('%s → %s', (source, expected) => {
    expect(translateRegionType(source)).toBe(expected)
  })
})

describe('buildRegionTopology (options des subdivisions)', () => {
  const meta = { countryId: 'CMR', type: 'Unknown', license: 'CC BY 4.0', source: 'geoBoundaries', year: 2020 }

  test('indique combien de subdivisions chaque région possède', () => {
    const topology = buildRegionTopology(normalizeRegions(GEOJSON, 'CMR'), new Map(), meta, {
      subdivisionCounts: new Map([['A1', 5]]),
    })
    const byId = new Map(feature(topology, topology.objects.regions).features.map((f) => [f.properties.id, f.properties]))

    expect(byId.get('A1').subdivisions).toBe(5)
    expect(byId.get('A2').subdivisions).toBe(0)
  })

  test('utilise le libellé de repli pour un type inconnu et garde les métadonnées en plus', () => {
    const topology = buildRegionTopology(normalizeRegions(GEOJSON, 'CMR'), new Map(), { ...meta, parentId: 'R1' }, {
      typeFallback: 'Subdivision',
    })

    expect(topology.meta).toMatchObject({ type: 'Subdivision', parentId: 'R1' })
  })

  test('simplifie les contours trop détaillés pour l’échelle d’affichage, sans les déformer', () => {
    // Carré de 1° dont chaque côté porte 50 sommets presque alignés (bruit d’un demi-mètre).
    const side = (from, to) =>
      Array.from({ length: 50 }, (_, i) => {
        const t = i / 50
        const wobble = (i % 2) * 0.000005
        return [from[0] + (to[0] - from[0]) * t + wobble, from[1] + (to[1] - from[1]) * t + wobble]
      })
    const corners = [[10, 5], [10, 6], [11, 6], [11, 5]]
    const ring = [...corners.flatMap((corner, i) => side(corner, corners[(i + 1) % 4])), [10, 5]]
    const detailed = normalizeRegions(
      { type: 'FeatureCollection', features: [region({ shapeName: 'Dense', shapeID: 'D1' }, { type: 'Polygon', coordinates: [ring] })] },
      'TST',
    )
    const points = (topology) => topology.arcs.reduce((sum, arc) => sum + arc.length, 0)

    const full = buildRegionTopology(detailed, new Map(), meta)
    const light = buildRegionTopology(detailed, new Map(), meta, { simplify: true })

    expect(points(light)).toBeLessThan(points(full) / 4)
    const [area] = feature(light, light.objects.regions).features.map((f) => geoArea(f))
    const [fullArea] = feature(full, full.objects.regions).features.map((f) => geoArea(f))
    expect(area).toBeCloseTo(fullArea, 6)
  })

  test('garde le type propre à chaque entité quand il est fourni', () => {
    const [first, second] = normalizeRegions(GEOJSON, 'COD')
    const typed = [{ ...first, properties: { ...first.properties, type: 'Chefferie' } }, second]

    const topology = buildRegionTopology(typed, new Map(), meta)
    const byId = new Map(feature(topology, topology.objects.regions).features.map((f) => [f.properties.id, f.properties]))

    expect(byId.get(first.properties.id).type).toBe('Chefferie')
    expect(byId.get(second.properties.id)).not.toHaveProperty('type')
  })
})

describe('îlots et contrôle final', () => {
  // Îlot d'environ 100 m de côté (≈ 0,01 km²) : s'écraserait à la quantification.
  const islet = [[[30, 10], [30.001, 10], [30.001, 10.001], [30, 10.001], [30, 10]]]

  test('retire les îlots minuscules d’une entité en plusieurs morceaux', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        region(
          { shapeName: 'Côte', shapeID: 'C1' },
          { type: 'MultiPolygon', coordinates: [ccwSquare(29, 9).coordinates, islet] },
        ),
      ],
    }

    const [coast] = normalizeRegions(geojson, 'TST')

    expect(coast.geometry.coordinates).toHaveLength(1)
  })

  test('refuse de produire une TopoJSON contenant une géométrie inversée', () => {
    const inverted = [{ ...normalizeRegions(GEOJSON, 'CMR')[0], geometry: ccwSquare(10, 5) }]

    expect(() => buildRegionTopology(inverted, new Map(), { type: 'Region' })).toThrow(/Far North/)
  })
})
