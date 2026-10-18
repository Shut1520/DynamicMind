import { render, screen } from '@testing-library/react'
import Tooltip from '../../src/ui/Tooltip.jsx'

// jsdom ne mesure rien : on donne à la bulle une taille de 120 × 60 px.
const BUBBLE = { offsetWidth: 120, offsetHeight: 60 }
const BOUNDS = { width: 400, height: 300 }

const translationOf = (element) => /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(element.style.transform).slice(1).map(Number)

describe('Tooltip', () => {
  beforeEach(() => {
    Object.entries(BUBBLE).forEach(([key, value]) =>
      vi.spyOn(HTMLElement.prototype, key, 'get').mockReturnValue(value),
    )
  })
  afterEach(() => vi.restoreAllMocks())

  const renderAt = (x, y) => {
    render(
      <Tooltip id="t" x={x} y={y} bounds={BOUNDS}>
        Kenya
      </Tooltip>,
    )
    return translationOf(screen.getByRole('tooltip'))
  }

  test('se place en bas à droite du point quand il y a la place', () => {
    expect(renderAt(50, 40)).toEqual([64, 54])
  })

  test('passe à gauche près du bord droit et au-dessus près du bord bas', () => {
    expect(renderAt(350, 280)).toEqual([350 - 14 - 120, 280 - 14 - 60])
  })

  test('ne sort jamais du cadre par le haut ou la gauche', () => {
    expect(renderAt(-30, -30)).toEqual([0, 0])
  })
})
