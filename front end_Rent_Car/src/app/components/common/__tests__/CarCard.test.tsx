import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/test-utils'
import { makeCar } from '../../../../test/factories'
import { CarCard } from '../CarCard'

const noRating = { avg: 0, count: 0 }

describe('components/CarCard', () => {
  it('affiche la marque, le modèle, l’année et le prix', () => {
    renderWithProviders(<CarCard car={makeCar({ brand: 'Kia', model: 'Sportage', year: 2025, pricePerDay: 150 })} rating={noRating} />)

    expect(screen.getByRole('heading', { name: 'Kia Sportage' })).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    expect(screen.getByText('150 DT')).toBeInTheDocument()
    expect(screen.getByText('/jour')).toBeInTheDocument()
  })

  it('affiche l’image principale avec un texte alternatif descriptif', () => {
    renderWithProviders(<CarCard car={makeCar({ images: ['https://cdn/x.jpg'] })} rating={noRating} />)

    const img = screen.getByRole('img', { name: 'Renault Clio' })
    expect(img).toHaveAttribute('src', 'https://cdn/x.jpg')
  })

  it.each([
    ['AVAILABLE', 'Disponible'],
    ['RESERVED', 'Réservée'],
    ['RENTED', 'Louée'],
  ] as const)('affiche le badge de statut %s', (status, label) => {
    renderWithProviders(<CarCard car={makeCar({ status })} rating={noRating} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('affiche "Aucun avis" quand la voiture n’a pas été notée', () => {
    renderWithProviders(<CarCard car={makeCar()} rating={noRating} />)

    expect(screen.getByText('Aucun avis')).toBeInTheDocument()
  })

  it('affiche la note moyenne et le nombre d’avis quand ils existent', () => {
    renderWithProviders(<CarCard car={makeCar()} rating={{ avg: 4.5, count: 8 }} />)

    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(8 avis)')).toBeInTheDocument()
    expect(screen.queryByText('Aucun avis')).not.toBeInTheDocument()
  })

  it('traduit la transmission en libellé court', () => {
    const { unmount } = renderWithProviders(<CarCard car={makeCar({ transmission: 'Automatique' })} rating={noRating} />)
    expect(screen.getByText('Auto')).toBeInTheDocument()
    unmount()

    renderWithProviders(<CarCard car={makeCar({ transmission: 'Manuelle' })} rating={noRating} />)
    expect(screen.getByText('Man.')).toBeInTheDocument()
  })

  it('affiche le carburant et le nombre de places', () => {
    renderWithProviders(<CarCard car={makeCar({ fuel: 'Diesel', seats: 7 })} rating={noRating} />)

    expect(screen.getByText('Diesel')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('pointe vers la fiche détaillée de la voiture', () => {
    renderWithProviders(<CarCard car={makeCar({ id: '42' })} rating={noRating} />)

    expect(screen.getByRole('link', { name: 'Voir détails' })).toHaveAttribute('href', '/cars/42')
  })

  it('rend les libellés en anglais quand la langue est EN', () => {
    renderWithProviders(<CarCard car={makeCar()} rating={noRating} />, { lang: 'en' })

    expect(screen.getByText('View details')).toBeInTheDocument()
    expect(screen.getByText('No reviews')).toBeInTheDocument()
  })
})
