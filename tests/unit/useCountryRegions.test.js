import { act, renderHook, waitFor } from '@testing-library/react'
import { useCountryRegions } from '../../src/map/useCountryRegions.js'
import { setupMapEnvironment, teardownMapEnvironment } from './helpers/map-env.js'

describe('useCountryRegions', () => {
  beforeEach(setupMapEnvironment)
  afterEach(teardownMapEnvironment)

  test('reste au repos sans pays ouvert', () => {
    const { result } = renderHook(() => useCountryRegions(null))

    expect(result.current).toMatchObject({ status: 'idle', regions: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('charge les régions du pays, puis efface tout en changeant de pays', async () => {
    const { result, rerender } = renderHook(({ id }) => useCountryRegions(id), { initialProps: { id: 'CMR' } })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.regions).toHaveLength(10)
    expect(result.current.meta.countryId).toBe('CMR')

    rerender({ id: 'SEN' })

    expect(result.current).toMatchObject({ status: 'loading', regions: [] })
    await waitFor(() => expect(result.current.meta?.countryId).toBe('SEN'))
  })

  test('signale une erreur et permet de réessayer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    const { result } = renderHook(() => useCountryRegions('GAB'))

    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.regions.length).toBeGreaterThan(0)
  })
})
