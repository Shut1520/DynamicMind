import { render, screen } from '@testing-library/react'
import App from '../../src/App.jsx'

describe('App', () => {
  test('affiche le titre et la zone de carte', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /carte de l'afrique/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /carte interactive/i })).toBeInTheDocument()
  })
})
