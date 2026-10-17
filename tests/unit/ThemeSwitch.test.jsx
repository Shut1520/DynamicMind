import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeSwitch from '../../src/ui/ThemeSwitch.jsx'
import { THEME_STORAGE_KEY } from '../../src/ui/useTheme.js'

const option = (name) => screen.getByRole('button', { name })

describe('ThemeSwitch', () => {
  afterEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    vi.restoreAllMocks()
  })

  test('suit le système par défaut', () => {
    render(<ThemeSwitch />)

    expect(screen.getByRole('group', { name: 'Thème' })).toBeInTheDocument()
    expect(option('Auto')).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  test('applique et mémorise le thème choisi, puis revient au système', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    await user.click(option('Sombre'))

    expect(option('Sombre')).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.click(option('Auto'))

    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  test('reprend le thème mémorisé et ignore une valeur inconnue', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const { unmount } = render(<ThemeSwitch />)
    expect(option('Clair')).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBe('light')
    unmount()

    window.localStorage.setItem(THEME_STORAGE_KEY, 'fluo')
    render(<ThemeSwitch />)
    expect(option('Auto')).toHaveAttribute('aria-pressed', 'true')
  })

  test('fonctionne sans stockage disponible (navigation privée)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    await user.click(option('Sombre'))

    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
