import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clearGeoCache } from '../../src/data/loaders.js'
import AfricaMap from '../../src/map/AfricaMap.jsx'

const topologyText = readFileSync(resolve(__dirname, '../../public/geo/africa.topo.json'), 'utf8')
const okResponse = () => ({ ok: true, json: async () => JSON.parse(topologyText) })
const MAP_NAME = /carte de l'afrique/i

// jsdom ne calcule pas la mise en page : on simule un conteneur de 800 × 600.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {
    this.callback([{ contentRect: { width: 800, height: 600 } }])
  }
  disconnect() {}
}

async function renderMap(props = {}) {
  const user = userEvent.setup()
  render(<AfricaMap {...props} />)
  const map = await screen.findByRole('group', { name: MAP_NAME })
  const country = (id) => map.querySelector(`path[data-id="${id}"]`)
  return { user, map, country }
}

// Comme un vrai navigateur : pointerdown, puis focus de l'élément touché, puis click.
const tap = (element) => {
  fireEvent.pointerDown(element, { pointerType: 'touch' })
  if (element.tabIndex >= 0) act(() => element.focus())
  fireEvent.pointerUp(element, { pointerType: 'touch' })
  fireEvent.click(element)
}

describe('AfricaMap', () => {
  beforeEach(() => {
    clearGeoCache()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('affichage', () => {
    test('affiche un message pendant le chargement', () => {
      render(<AfricaMap />)

      expect(screen.getByText(/chargement de la carte/i)).toBeInTheDocument()
    })

    test('dessine un tracé par pays, Sahara occidental compris', async () => {
      const { map } = await renderMap()
      const regions = map.querySelectorAll('path.map-region')

      expect(regions).toHaveLength(55)
      regions.forEach((path) => expect(path.getAttribute('d')).toMatch(/^M/))
    })

    test('distingue le territoire contesté des pays cliquables', async () => {
      const { map, country } = await renderMap()

      expect(country('ESH')).toHaveAttribute('data-interactive', 'false')
      expect(country('SEN')).toHaveAttribute('data-interactive', 'true')
      expect(map.querySelectorAll('path[data-interactive="true"]')).toHaveLength(54)
    })

    test('ajoute un repère aux petits États insulaires', async () => {
      const { map } = await renderMap()
      const markers = [...map.querySelectorAll('circle.map-marker')].map((m) => m.dataset.id)

      expect(markers).toEqual(expect.arrayContaining(['CPV', 'COM', 'MUS', 'STP', 'SYC']))
    })

    test('affiche une erreur et permet de réessayer', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
      render(<AfricaMap />)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(/impossible de charger la carte/i)

      await userEvent.click(within(alert).getByRole('button', { name: /réessayer/i }))

      expect(await screen.findByRole('group', { name: MAP_NAME })).toBeInTheDocument()
    })
  })

  describe('survol à la souris', () => {
    test('met le pays en surbrillance et affiche ses informations', async () => {
      const { user, country } = await renderMap()

      await user.hover(country('SEN'))

      expect(country('SEN')).toHaveClass('is-active')
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('Sénégal')
      expect(tooltip).toHaveTextContent('Dakar')
      expect(tooltip).toHaveTextContent(/18,9\smillions d'habitants/)
    })

    test('passe d’un pays à l’autre puis efface tout en quittant la carte', async () => {
      const { user, map, country } = await renderMap()

      await user.hover(country('SEN'))
      await user.hover(country('MLI'))

      expect(country('SEN')).not.toHaveClass('is-active')
      expect(screen.getByRole('tooltip')).toHaveTextContent('Mali')

      await user.unhover(map)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(map.querySelectorAll('.is-active')).toHaveLength(0)
    })

    test('signale le statut contesté du Sahara occidental, sans le mettre en surbrillance', async () => {
      const { user, country } = await renderMap()

      await user.hover(country('ESH'))

      expect(screen.getByRole('tooltip')).toHaveTextContent(/sahara occidental.*statut contesté/i)
      expect(country('ESH')).not.toHaveClass('is-active')
    })

    test('réagit aussi au survol du repère d’une petite île', async () => {
      const { user, map } = await renderMap()

      await user.hover(map.querySelector('circle.map-marker[data-id="SYC"]'))

      expect(screen.getByRole('tooltip')).toHaveTextContent('Seychelles')
    })

    test('active le pays au clic', async () => {
      const onCountryActivate = vi.fn()
      const { user, country } = await renderMap({ onCountryActivate })

      await user.click(country('SEN'))

      expect(onCountryActivate).toHaveBeenCalledWith('SEN')
    })
  })

  describe('clavier', () => {
    test('rend les 54 pays atteignables au clavier, avec leur nom', async () => {
      const { map, country } = await renderMap()

      expect(map.querySelectorAll('[tabindex="0"]')).toHaveLength(54)
      expect(country('SEN')).toHaveAccessibleName('Sénégal')
      expect(country('ESH')).not.toHaveAttribute('tabindex')
    })

    test('affiche l’infobulle au focus et la ferme avec Échap', async () => {
      const { user, country } = await renderMap()

      act(() => country('SEN').focus())

      expect(country('SEN')).toHaveClass('is-active')
      expect(country('SEN')).toHaveAccessibleDescription(/Dakar/)

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    test('active le pays avec Entrée', async () => {
      const onCountryActivate = vi.fn()
      const { user, country } = await renderMap({ onCountryActivate })

      act(() => country('SEN').focus())
      await user.keyboard('{Enter}')

      expect(onCountryActivate).toHaveBeenCalledWith('SEN')
    })
  })

  describe('écran tactile', () => {
    test('1er tap : infobulle ; 2e tap : activation', async () => {
      const onCountryActivate = vi.fn()
      const { country } = await renderMap({ onCountryActivate })

      tap(country('SEN'))

      expect(screen.getByRole('tooltip')).toHaveTextContent('Sénégal')
      expect(onCountryActivate).not.toHaveBeenCalled()

      tap(country('SEN'))

      expect(onCountryActivate).toHaveBeenCalledWith('SEN')
    })

    test('un tap sur l’océan ferme l’infobulle', async () => {
      const { map, country } = await renderMap()

      tap(country('SEN'))
      tap(map)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })
})
