import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InfoPanel from '../../src/ui/InfoPanel.jsx'

const panelName = /fiche du pays/i

describe('InfoPanel', () => {
  test("n'affiche rien sans pays sélectionné", () => {
    render(<InfoPanel countryId={null} onClose={() => {}} />)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  test('affiche la fiche complète du pays', () => {
    render(<InfoPanel countryId="SEN" onClose={() => {}} />)
    const panel = screen.getByRole('complementary', { name: panelName })

    expect(screen.getByRole('heading', { name: 'Sénégal' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /drapeau.*sénégal/i })).toBeInTheDocument()
    ;[
      'République du Sénégal',
      'Dakar',
      /18,9\smillions d'habitants/,
      /\b2025\b/,
      /196\s722\skm²/,
      /\d+\shab\.\/km²/,
      'français',
      'franc CFA (BCEAO)',
      'XOF',
      '+221',
      "Afrique de l'Ouest",
      'Sénégalais',
    ].forEach((text) => expect(panel).toHaveTextContent(text))
  })

  test('liste toutes les capitales quand il y en a plusieurs', () => {
    render(<InfoPanel countryId="ZAF" onClose={() => {}} />)

    expect(screen.getByRole('complementary', { name: panelName })).toHaveTextContent(
      'Pretoria, Bloemfontein et Le Cap',
    )
  })

  test('se ferme avec le bouton ✕', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<InfoPanel countryId="SEN" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /fermer/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('se ferme avec Échap', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<InfoPanel countryId="SEN" onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('place le focus sur le titre à l’ouverture', () => {
    render(<InfoPanel countryId="SEN" onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Sénégal' })).toHaveFocus()
  })

  test('joue une animation de fermeture avant de disparaître', async () => {
    const { rerender } = render(<InfoPanel countryId="SEN" onClose={() => {}} />)

    rerender(<InfoPanel countryId={null} onClose={() => {}} />)

    const panel = screen.getByRole('complementary', { name: panelName })
    expect(panel).toHaveClass('is-closing')
    await waitForElementToBeRemoved(panel)
  })

  test('change de contenu quand on choisit un autre pays', () => {
    const { rerender } = render(<InfoPanel countryId="SEN" onClose={() => {}} />)

    rerender(<InfoPanel countryId="MLI" onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Mali' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sénégal' })).not.toBeInTheDocument()
  })
})

describe('InfoPanel — fiche d’une région', () => {
  const farNorth = {
    id: 'R1',
    iso: 'CM-EN',
    name: 'Extrême-Nord',
    area: 35015,
    capitals: ['Maroua'],
    population: 3142883,
    populationYear: 2007,
    countryId: 'CMR',
    type: 'Région',
    license: 'Creative Commons Attribution 3.0 License',
  }

  test('affiche la fiche de la région et son pays', () => {
    render(<InfoPanel countryId="CMR" region={farNorth} onClose={() => {}} />)
    const panel = screen.getByRole('complementary', { name: /fiche de la région/i })

    expect(screen.getByRole('heading', { name: 'Extrême-Nord' })).toBeInTheDocument()
    ;['Région · Cameroun', 'Maroua', /3,1\smillions d'habitants \(2007\)/, /35\s015\skm²/, /\d+\shab\.\/km²/, 'CM-EN'].forEach(
      (text) => expect(panel).toHaveTextContent(text),
    )
    expect(panel).toHaveTextContent(/Creative Commons Attribution 3\.0/)
  })

  test('omet les informations que la source ne fournit pas', () => {
    const minimal = { ...farNorth, iso: null, capitals: [], population: null, populationYear: null }
    render(<InfoPanel countryId="CMR" region={minimal} onClose={() => {}} />)
    const panel = screen.getByRole('complementary', { name: /fiche de la région/i })

    expect(panel).not.toHaveTextContent('Chef-lieu')
    expect(panel).not.toHaveTextContent('Population')
    expect(panel).toHaveTextContent(/35\s015\skm²/)
  })

  test('revient à la fiche du pays quand on quitte la région', () => {
    const { rerender } = render(<InfoPanel countryId="CMR" region={farNorth} onClose={() => {}} />)

    rerender(<InfoPanel countryId="CMR" region={null} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Cameroun' })).toHaveFocus()
  })
})

describe('InfoPanel — fiche d’une subdivision', () => {
  const menoua = {
    id: 'S1',
    iso: null,
    name: 'Menoua',
    area: 1321,
    capitals: [],
    population: null,
    populationYear: null,
    countryId: 'CMR',
    type: 'Département',
    parentName: 'Ouest',
    license: 'CC BY 4.0',
  }

  test('affiche la subdivision, sa région et son pays', () => {
    render(<InfoPanel countryId="CMR" region={{ id: 'R', name: 'Ouest' }} subregion={menoua} onClose={() => {}} />)
    const panel = screen.getByRole('complementary', { name: /fiche de la région : menoua/i })

    expect(screen.getByRole('heading', { name: 'Menoua' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('Département · Cameroun')
    expect(panel).toHaveTextContent(/Rattachée à\s*Ouest/)
    expect(panel).toHaveTextContent(/1\s321\skm²/)
  })
})
