import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makeCategory, makeUser } from '../../../../test/factories'
import Home from '../Home'

vi.mock('../../../api/stats.api', () => ({
  statsAPI: { getPublic: vi.fn() },
}))

import { statsAPI } from '../../../api/stats.api'

const publicStats = (overrides = {}) =>
  axiosResponse({ vehicles: 8, clients: 12, reviews: 5, averageRating: 4.3, ...overrides })

beforeEach(() => {
  vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats())
})

describe('pages/client/Home · chiffres du bandeau', () => {
  /**
   * Le bandeau annoncait « 500+ vehicules », « 25 agences » et « 4.8★ » :
   * trois nombres inventes, dont deux faux par nature.
   */
  it('affiche les chiffres réels de la base', async () => {
    renderWithProviders(<Home />)

    expect(await screen.findByText('8')).toBeInTheDocument()
    expect(screen.getByText('Véhicules')).toBeInTheDocument()
    expect(screen.getByText('4.3★')).toBeInTheDocument()
    expect(screen.getByText('Satisfaction')).toBeInTheDocument()
  })

  it('annonce une seule agence, au singulier', async () => {
    renderWithProviders(<Home />)

    expect(await screen.findByText('Agence')).toBeInTheDocument()
    expect(screen.queryByText('Agences')).not.toBeInTheDocument()
  })

  /**
   * « 0★ » se lirait comme un mecontentement general, alors que personne ne
   * s'est encore prononce.
   */
  it('masque la satisfaction tant qu’aucun avis n’existe', async () => {
    vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats({ reviews: 0, averageRating: null }))

    renderWithProviders(<Home />)

    expect(await screen.findByText('Agence')).toBeInTheDocument()
    expect(screen.queryByText('Satisfaction')).not.toBeInTheDocument()
  })

  it('accorde le libellé au singulier pour un seul véhicule', async () => {
    vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats({ vehicles: 1 }))

    renderWithProviders(<Home />)

    expect(await screen.findByText('Véhicule')).toBeInTheDocument()
  })

  it('n’affiche aucun chiffre quand l’API est injoignable', async () => {
    vi.mocked(statsAPI.getPublic).mockRejectedValue(new Error('réseau'))

    renderWithProviders(<Home />)

    await waitFor(() => expect(statsAPI.getPublic).toHaveBeenCalled())
    expect(screen.queryByText('Agence')).not.toBeInTheDocument()
    expect(screen.queryByText('Satisfaction')).not.toBeInTheDocument()
  })
})

describe('pages/client/Home', () => {
  it('affiche la proposition de valeur et les appels à l’action', () => {
    renderWithProviders(<Home />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Votre prochaine voiture/)
    expect(screen.getByRole('link', { name: /Voir les voitures/ })).toHaveAttribute('href', '/cars')
    expect(screen.getByText('Réservation instantanée')).toBeInTheDocument()
    expect(screen.getByText('Assurance incluse')).toBeInTheDocument()
    expect(screen.getByText('Partout en Tunisie')).toBeInTheDocument()
  })

  it('liste les catégories avec un lien filtré sur le catalogue', () => {
    renderWithProviders(<Home />, {
      app: { categories: [makeCategory({ id: '1', name: 'SUV / Spacieux' })] },
    })

    expect(screen.getByRole('link', { name: new RegExp('SUV\ \/\ Spacieux') })).toHaveAttribute(
      'href',
      '/cars?category=SUV%20%2F%20Spacieux',
    )
  })

  it('illustre une catégorie avec la photo de sa première voiture (via categoryId)', () => {
    renderWithProviders(<Home />, {
      app: {
        categories: [makeCategory({ id: '7', name: 'Luxe' })],
        cars: [makeCar({ categoryId: '7', category: 'Autre', images: ['https://cdn/lux.jpg'] })],
      },
    })

    expect(screen.getByRole('link', { name: new RegExp('Luxe') }).querySelector('img')).toHaveAttribute('src', 'https://cdn/lux.jpg')
  })

  it('retombe sur la correspondance par nom de catégorie', () => {
    renderWithProviders(<Home />, {
      app: {
        categories: [makeCategory({ id: '7', name: 'SUV' })],
        cars: [makeCar({ categoryId: '99', category: 'SUV', images: ['https://cdn/suv.jpg'] })],
      },
    })

    expect(screen.getByRole('link', { name: new RegExp('SUV') }).querySelector('img')).toHaveAttribute('src', 'https://cdn/suv.jpg')
  })

  it('utilise l’image de secours de la catégorie quand aucune voiture n’a de photo', () => {
    renderWithProviders(<Home />, {
      app: {
        categories: [makeCategory({ id: '7', name: 'Berline' })],
        cars: [makeCar({ categoryId: '7', images: [] })],
      },
    })

    expect(screen.getByRole('link', { name: new RegExp('Berline') }).querySelector('img')?.getAttribute('src')).toContain(
      'photo-1552519507',
    )
  })

  it('utilise l’image générique pour une catégorie inconnue et sans voiture', () => {
    renderWithProviders(<Home />, {
      app: { categories: [makeCategory({ id: '7', name: 'Cabriolet' })], cars: [] },
    })

    expect(screen.getByRole('link', { name: new RegExp('Cabriolet') }).querySelector('img')?.getAttribute('src')).toContain(
      'photo-1494976388531',
    )
  })

  it('met en avant au maximum trois voitures disponibles', () => {
    renderWithProviders(<Home />, {
      app: {
        cars: [
          makeCar({ id: '1', brand: 'A', status: 'AVAILABLE' }),
          makeCar({ id: '2', brand: 'B', status: 'AVAILABLE' }),
          makeCar({ id: '3', brand: 'C', status: 'AVAILABLE' }),
          makeCar({ id: '4', brand: 'D', status: 'AVAILABLE' }),
          makeCar({ id: '5', brand: 'E', status: 'RENTED' }),
        ],
      },
    })

    const featured = screen.getByRole('heading', { name: 'Véhicules à la une' }).closest('section')!
    expect(within(featured).getAllByRole('link', { name: 'Voir détails' })).toHaveLength(3)
    expect(within(featured).queryByText(/^E /)).not.toBeInTheDocument()
  })

  it('invite les visiteurs anonymes à créer un compte', () => {
    renderWithProviders(<Home />, { app: { currentUser: null } })

    expect(screen.getByRole('heading', { name: /Prêt à réserver votre voiture idéale/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Créer mon compte/ })).toHaveAttribute('href', '/register')
  })

  it('masque l’encart d’inscription pour un utilisateur connecté', () => {
    renderWithProviders(<Home />, { app: { currentUser: makeUser() } })

    expect(screen.queryByRole('heading', { name: /Prêt à réserver votre voiture idéale/ })).not.toBeInTheDocument()
  })
})
