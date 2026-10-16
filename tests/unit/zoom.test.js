import {
  IDENTITY,
  fitTransform,
  freeArea,
  transformFromView,
  viewFromTransform,
} from '../../src/map/zoom.js'

const apply = ({ k, x, y }, [px, py]) => [px * k + x, py * k + y]

describe('fitTransform', () => {
  const area = { x: 0, y: 0, width: 800, height: 600 }

  test('centre et agrandit la zone visée dans l’espace disponible', () => {
    const bounds = [[100, 100], [200, 150]]

    const transform = fitTransform(bounds, area, { padding: 20 })
    const [left, top] = apply(transform, bounds[0])
    const [right, bottom] = apply(transform, bounds[1])

    expect((left + right) / 2).toBeCloseTo(400)
    expect((top + bottom) / 2).toBeCloseTo(300)
    expect(right - left).toBeCloseTo(760)
  })

  test('respecte la hauteur quand la zone visée est haute', () => {
    const transform = fitTransform([[0, 0], [10, 100]], area, { padding: 0 })

    expect(transform.k).toBeCloseTo(6)
  })

  test('plafonne l’agrandissement pour les tout petits pays', () => {
    const transform = fitTransform([[10, 10], [10.1, 10.1]], area, { maxScale: 40 })

    expect(transform.k).toBe(40)
  })

  test('cadre dans une zone décalée (à gauche du panneau)', () => {
    const left = { x: 0, y: 0, width: 400, height: 600 }
    const transform = fitTransform([[100, 100], [200, 200]], left, { padding: 0 })
    const [cx] = apply(transform, [150, 150])

    expect(cx).toBeCloseTo(200)
  })
})

describe('freeArea', () => {
  test('laisse toute la carte libre sans panneau', () => {
    expect(freeArea({ width: 1200, height: 700 }, false)).toEqual({ x: 0, y: 0, width: 1200, height: 700 })
  })

  test('retire la place du panneau (à droite) et du fil d’Ariane (en haut) sur grand écran', () => {
    expect(freeArea({ width: 1200, height: 700 }, true)).toEqual({ x: 0, y: 56, width: 824, height: 644 })
  })

  test('sur mobile, le panneau est sous la carte : seul le fil d’Ariane est retiré', () => {
    expect(freeArea({ width: 375, height: 400 }, true)).toEqual({ x: 0, y: 56, width: 375, height: 344 })
  })
})

describe('vue ⇄ transformation', () => {
  test('les deux conversions sont réciproques', () => {
    const size = { width: 800, height: 600 }
    const transform = { k: 3.5, x: -420, y: -130 }

    const back = transformFromView(viewFromTransform(transform, size), size)

    expect(back.k).toBeCloseTo(transform.k)
    expect(back.x).toBeCloseTo(transform.x)
    expect(back.y).toBeCloseTo(transform.y)
  })

  test('la transformation neutre montre toute la carte', () => {
    expect(viewFromTransform(IDENTITY, { width: 800, height: 600 })).toEqual([400, 300, 800])
  })
})
