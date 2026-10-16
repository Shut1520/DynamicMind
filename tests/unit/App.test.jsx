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

  describe('régions', () => {
    async function zoomedOnCameroon() {
      const app = await renderApp()
      await app.user.click(app.country('CMR'))
      const regions = await screen.findAllByRole('button', { name: /Extrême-Nord|Littoral|Centre/ })
      const region = (name) => app.map.querySelector(`path[data-level="region"][aria-label="${name}"]`)
      return { ...app, regions, region }
    }

    test('affiche les régions du pays ouvert, atteignables au clavier à la place des pays', async () => {
      const { map } = await zoomedOnCameroon()

      expect(map.querySelectorAll('path[data-level="region"]')).toHaveLength(10)
      expect(map.querySelectorAll('path[data-level="country"][tabindex="0"]')).toHaveLength(0)
      expect(map.querySelectorAll('path[data-level="region"][tabindex="0"]')).toHaveLength(10)
    })

    test('le survol d’une région affiche son infobulle', async () => {
      const { user, region } = await zoomedOnCameroon()

      await user.hover(region('Extrême-Nord'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('Extrême-Nord')
      expect(tooltip).toHaveTextContent('Maroua')
      expect(region('Extrême-Nord')).toHaveClass('is-active')
    })

    test('le clic sur une région zoome dessus et ouvre sa fiche', async () => {
      const { user, region, viewport, breadcrumb } = await zoomedOnCameroon()
      const countryScale = scaleOf(viewport())

      await user.click(region('Extrême-Nord'))

      expect(scaleOf(viewport())).toBeGreaterThan(countryScale)
      expect(screen.getByRole('heading', { name: 'Extrême-Nord' })).toBeInTheDocument()
      expect(within(breadcrumb()).getByText('Extrême-Nord')).toHaveAttribute('aria-current', 'page')
      expect(within(breadcrumb()).getByRole('button', { name: 'Cameroun' })).toBeInTheDocument()
      expect(region('Extrême-Nord')).toHaveClass('is-selected')
      expect(region('Littoral')).toHaveClass('is-dimmed')
    })

    test('Échap remonte de la région au pays', async () => {
      const { user, region, breadcrumb } = await zoomedOnCameroon()

      await user.click(region('Littoral'))
      await user.keyboard('{Escape}')

      expect(screen.getByRole('heading', { name: 'Cameroun' })).toBeInTheDocument()
      expect(within(breadcrumb()).getByText('Cameroun')).toHaveAttribute('aria-current', 'page')
      expect(region('Littoral')).not.toHaveClass('is-dimmed')
    })

    test('cliquer un pays voisin depuis une région change de pays', async () => {
      const { user, country, region, breadcrumb, map } = await zoomedOnCameroon()

      await user.click(region('Est'))
      await user.click(country('TCD'))

      expect(within(breadcrumb()).getByText('Tchad')).toHaveAttribute('aria-current', 'page')
      await screen.findByRole('heading', { name: 'Tchad' })
      expect(map.querySelector('path[data-level="region"][aria-label="Est"]')).toBeNull()
    })
  })

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
