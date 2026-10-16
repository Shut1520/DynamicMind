import { act, render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App.jsx'
import { setupMapEnvironment, teardownMapEnvironment } from './helpers/map-env.js'

async function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  const map = await screen.findByRole('group', { name: /carte de l'afrique/i })
  const country = (id) => map.querySelector(`path[data-id="${id}"]`)
  return { user, map, country }
}

describe('App', () => {
  beforeEach(setupMapEnvironment)
  afterEach(teardownMapEnvironment)

  test('affiche le titre et la zone de carte', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { name: /carte de l'afrique/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /carte interactive/i })).toBeInTheDocument()
  })

  test('ouvre la fiche du pays cliqué et le garde en surbrillance', async () => {
    const { user, country } = await renderApp()

    await user.click(country('SEN'))

    expect(screen.getByRole('complementary', { name: /fiche du pays/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sénégal' })).toBeInTheDocument()
    expect(country('SEN')).toHaveClass('is-selected')
  })

  test('remplace la fiche quand on clique un autre pays', async () => {
    const { user, country } = await renderApp()

    await user.click(country('SEN'))
    await user.click(country('MLI'))

    expect(screen.getByRole('heading', { name: 'Mali' })).toBeInTheDocument()
    expect(country('SEN')).not.toHaveClass('is-selected')
    expect(country('MLI')).toHaveClass('is-selected')
  })

  test('ferme la fiche avec ✕ et retire la sélection', async () => {
    const { user, country } = await renderApp()

    await user.click(country('SEN'))
    await user.click(screen.getByRole('button', { name: /fermer/i }))

    await waitForElementToBeRemoved(() => screen.queryByRole('complementary', { name: /fiche du pays/i }))
    expect(country('SEN')).not.toHaveClass('is-selected')
  })

  test('au clavier : Entrée ouvre la fiche, Échap la ferme et rend le focus au pays', async () => {
    const { user, country } = await renderApp()

    act(() => country('SEN').focus())
    await user.keyboard('{Enter}')

    expect(screen.getByRole('heading', { name: 'Sénégal' })).toHaveFocus()

    await user.keyboard('{Escape}')

    await waitForElementToBeRemoved(() => screen.queryByRole('complementary', { name: /fiche du pays/i }))
    expect(country('SEN')).toHaveFocus()
  })
})
