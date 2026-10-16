import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { findSmallFeatures } from '../../src/map/islands.js'
import { createProjection } from '../../src/map/projection.js'

const topology = JSON.parse(readFileSync(resolve(__dirname, '../../public/geo/africa.topo.json'), 'utf8'))
const countries = feature(topology, topology.objects.countries).features
const path = geoPath(createProjection({ width: 800, height: 600 }))

describe('findSmallFeatures', () => {
  test('repère les petits États insulaires, trop petits pour être survolés', () => {
    const ids = findSmallFeatures(countries, path).map((marker) => marker.id)

    expect(ids).toEqual(expect.arrayContaining(['CPV', 'COM', 'MUS', 'STP', 'SYC']))
    expect(ids).not.toContain('SEN')
    expect(ids).not.toContain('MDG')
  })

  test('place chaque repère au centre de son pays', () => {
    const seychelles = findSmallFeatures(countries, path).find((marker) => marker.id === 'SYC')
    const [cx, cy] = path.centroid(countries.find((f) => f.properties.id === 'SYC'))

    expect(seychelles.x).toBeCloseTo(cx)
    expect(seychelles.y).toBeCloseTo(cy)
  })

  test('ignore les territoires non cliquables', () => {
    const tiny = { ...countries.find((f) => f.properties.id === 'SYC'), properties: { id: 'XXX', interactive: false } }

    expect(findSmallFeatures([tiny], path)).toEqual([])
  })
})
