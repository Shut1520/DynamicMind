import { act, renderHook } from '@testing-library/react'
import { IDENTITY } from '../../src/map/zoom.js'
import { useZoomTransition } from '../../src/map/useZoomTransition.js'

const SIZE = { width: 800, height: 600 }
const ZOOMED = { k: 6, x: -1500, y: -900 }

function renderZoom(initial = IDENTITY, size = SIZE) {
  return renderHook(({ target, size: s }) => useZoomTransition(target, s), {
    initialProps: { target: initial, size },
  })
}

const advance = (ms) => act(() => vi.advanceTimersByTime(ms))

describe('useZoomTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('part directement de la cible initiale, sans animation', () => {
    const { result } = renderZoom(ZOOMED)

    expect(result.current).toEqual(ZOOMED)
  })

  test('anime progressivement vers une nouvelle cible', () => {
    const { result, rerender } = renderZoom()

    rerender({ target: ZOOMED, size: SIZE })
    advance(250)
    const midway = result.current

    expect(midway.k).toBeGreaterThan(1)
    expect(midway.k).toBeLessThan(ZOOMED.k)

    advance(2000)

    expect(result.current.k).toBeCloseTo(ZOOMED.k)
    expect(result.current.x).toBeCloseTo(ZOOMED.x)
    expect(result.current.y).toBeCloseTo(ZOOMED.y)
  })

  test('saute directement à la cible quand la taille du conteneur change', () => {
    const { result, rerender } = renderZoom()

    rerender({ target: ZOOMED, size: { width: 1024, height: 700 } })

    expect(result.current).toEqual(ZOOMED)
  })

  test('saute directement à la cible si l’utilisateur réduit les animations', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce') }))
    const { result, rerender } = renderZoom()

    rerender({ target: ZOOMED, size: SIZE })

    expect(result.current).toEqual(ZOOMED)
  })
})
