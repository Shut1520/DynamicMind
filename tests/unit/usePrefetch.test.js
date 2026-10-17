import { renderHook } from '@testing-library/react'
import { PREFETCH_DELAY_MS, prefetchTarget, usePrefetch } from '../../src/map/usePrefetch.js'

const entry = (level, properties = {}, interactive = true) => ({
  level,
  shape: { id: 'X1', interactive, properties: { id: 'X1', ...properties } },
})

describe('prefetchTarget', () => {
  test('un pays survolé annonce ses régions', () => {
    expect(prefetchTarget(entry('country'), null)?.key).toBe('X1')
  })

  test('une région ou une subdivision découpée annonce son niveau suivant', () => {
    expect(prefetchTarget(entry('region', { subdivisions: 4 }), 'CMR')?.key).toBe('CMR/X1')
    expect(prefetchTarget(entry('subregion', { subdivisions: 6 }), 'COD')?.key).toBe('COD/X1/local')
  })

  test('rien à préparer au dernier niveau, sans découpage ou pour une zone non cliquable', () => {
    expect(prefetchTarget(entry('region', { subdivisions: 0 }), 'CMR')).toBeNull()
    expect(prefetchTarget(entry('locality', { subdivisions: 3 }), 'COD')).toBeNull()
    expect(prefetchTarget(entry('country', {}, false), null)).toBeNull()
    expect(prefetchTarget(undefined, null)).toBeNull()
  })
})

describe('usePrefetch', () => {
  const geo = { path: () => 'M0,0' }

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const target = (key) => ({ key, load: vi.fn(async () => ({ regions: [] })) })

  test('charge le niveau suivant après un survol prolongé', () => {
    const hovered = target('NGA')
    renderHook(() => usePrefetch(hovered, geo))

    vi.advanceTimersByTime(PREFETCH_DELAY_MS - 1)
    expect(hovered.load).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(hovered.load).toHaveBeenCalledTimes(1)
  })

  test('un survol bref (on passe juste dessus) ne charge rien', () => {
    const first = target('NGA')
    const { rerender, unmount } = renderHook(({ t }) => usePrefetch(t, geo), { initialProps: { t: first } })

    vi.advanceTimersByTime(PREFETCH_DELAY_MS / 2)
    rerender({ t: null })
    vi.advanceTimersByTime(PREFETCH_DELAY_MS)
    unmount()

    expect(first.load).not.toHaveBeenCalled()
  })

  test('ignore un échec de chargement (l’ouverture réessaiera)', async () => {
    const failing = { key: 'GAB', load: vi.fn(async () => Promise.reject(new Error('réseau'))) }
    renderHook(() => usePrefetch(failing, geo))

    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)

    expect(failing.load).toHaveBeenCalledTimes(1)
  })
})
