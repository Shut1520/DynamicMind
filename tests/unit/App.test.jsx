import { render, screen } from '@testing-library/react'
import App from '../../src/App.jsx'
import { clearGeoCache } from '../../src/data/loaders.js'

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

describe('App', () => {
  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  })

  afterEach(() => vi.unstubAllGlobals())

  test('affiche le titre et la zone de carte', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /carte de l'afrique/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /carte interactive/i })).toBeInTheDocument()
  })
})
