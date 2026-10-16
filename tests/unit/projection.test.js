import { createProjection } from '../../src/map/projection.js'

const WIDTH = 800
const HEIGHT = 600
const PADDING = 16

const isInside = ([x, y]) =>
  x >= PADDING - 0.5 && x <= WIDTH - PADDING + 0.5 && y >= PADDING - 0.5 && y <= HEIGHT - PADDING + 0.5

describe('createProjection', () => {
  test('cadre tout le continent, du Cap-Vert aux Seychelles, de Tunis au Cap', () => {
    const projection = createProjection({ width: WIDTH, height: HEIGHT, padding: PADDING })

    const praia = [-23.5, 14.9]
    const victoria = [55.45, -4.6]
    const tunis = [10.2, 36.8]
    const capeTown = [18.4, -33.9]

    ;[praia, victoria, tunis, capeTown].forEach((point) => expect(isInside(projection(point)), point).toBe(true))
  })

  test('laisse hors cadre les îles du Prince-Édouard (-47° de latitude)', () => {
    const projection = createProjection({ width: WIDTH, height: 400, padding: PADDING })

    const [, y] = projection([37.7, -46.9])

    expect(y).toBeGreaterThan(400)
  })

  test('renvoie null tant que la taille du conteneur est inconnue', () => {
    expect(createProjection({ width: 0, height: 600 })).toBeNull()
    expect(createProjection({ width: 800, height: 0 })).toBeNull()
  })
})
