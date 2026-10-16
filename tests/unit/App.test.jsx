import { act, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App.jsx'
import { setupMapEnvironment, teardownMapEnvironment } from './helpers/map-env.js'

const PANEL = /fiche du pays/i

async function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  const map = await screen.findByRole('group', { name: /carte de l'afrique/i })
  const country = (id) => map.querySelector(`path[data-id="${id}"]`)
  const viewport = () => map.querySelector('g.map-viewport')
  const breadcrumb = () => screen.getByRole('navigation', { name: /fil d'ariane/i })
  return { user, map, country, viewport, breadcrumb }
}

const scaleOf = (element) => Number(/scale\(([\d.]+)\)/.exec(element.getAttribute('transform'))[1])

describe('App', () => {
  beforeEach(setupMapEnvironment)
  afterEach(teardownMapEnvironment)

  test('affiche le titre, la carte et le fil d’Ariane sur le continent', async () => {
    const { breadcrumb, viewport } = await renderApp()

    expect(screen.getByRole('heading', { name: /carte de l'afrique/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /carte interactive/i })).toBeInTheDocument()
    expect(within(breadcrumb()).getByText('Afrique')).toHaveAttribute('aria-current', 'page')
    expect(scaleOf(viewport())).toBe(1)
  })

  describe('entrer dans un pays', () => {
    test('zoome sur le pays, estompe les autres et ouvre sa fiche', async () => {
      const { user, country, viewport, breadcrumb } = await renderApp()

      await user.click(country('SEN'))

      expect(scaleOf(viewport())).toBeGreaterThan(3)
      expect(country('SEN')).toHaveClass('is-selected')
      expect(country('SEN')).not.toHaveClass('is-dimmed')
      expect(country('MLI')).toHaveClass('is-dimmed')
      expect(screen.getByRole('complementary', { name: PANEL })).toBeInTheDocument()
      expect(within(breadcrumb()).getByRole('button', { name: 'Afrique' })).toBeInTheDocument()
      expect(within(breadcrumb()).getByText('Sénégal')).toHaveAttribute('aria-current', 'page')
    })

    test('masque les repères des petites îles une fois zoomé', async () => {
      const { user, map, country } = await renderApp()

      await user.click(country('SEN'))

      expect(map.querySelectorAll('circle.map-marker')).toHaveLength(0)
    })

    test('passe directement à un pays voisin en cliquant dessus', async () => {
      const { user, country, breadcrumb } = await renderApp()

      await user.click(country('SEN'))
      await user.click(country('MLI'))

      expect(within(breadcrumb()).getByText('Mali')).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('heading', { name: 'Mali' })).toBeInTheDocument()
      expect(country('SEN')).toHaveClass('is-dimmed')
    })
  })

  describe('revenir au continent', () => {
    async function zoomedOnSenegal() {
      const app = await renderApp()
      await app.user.click(app.country('SEN'))
      return app
    }

    async function expectBackOnContinent({ viewport, country, breadcrumb }) {
      await waitForElementToBeRemoved(() => screen.queryByRole('complementary', { name: PANEL }))
      expect(scaleOf(viewport())).toBe(1)
      expect(country('MLI')).not.toHaveClass('is-dimmed')
      expect(country('SEN')).not.toHaveClass('is-selected')
      expect(within(breadcrumb()).getByText('Afrique')).toHaveAttribute('aria-current', 'page')
    }

    test('par le fil d’Ariane', async () => {
      const app = await zoomedOnSenegal()

      await app.user.click(within(app.breadcrumb()).getByRole('button', { name: 'Afrique' }))

      await expectBackOnContinent(app)
    })

    test('par le bouton ✕ de la fiche', async () => {
      const app = await zoomedOnSenegal()

      await app.user.click(screen.getByRole('button', { name: /fermer/i }))

      await expectBackOnContinent(app)
    })

    test('par Échap, en rendant le focus au pays', async () => {
      const app = await renderApp()

      act(() => app.country('SEN').focus())
      await app.user.keyboard('{Enter}')
      expect(screen.getByRole('heading', { name: 'Sénégal' })).toHaveFocus()

      await app.user.keyboard('{Escape}')

      await expectBackOnContinent(app)
      expect(app.country('SEN')).toHaveFocus()
    })
  })
})
