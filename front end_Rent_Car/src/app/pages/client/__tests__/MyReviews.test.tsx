import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/test-utils'
import { makeCar, makeReview } from '../../../../test/factories'
import MyReviews from '../MyReviews'
import Recommendations from '../Recommendations'
import Notifications from '../Notifications'
import { makeUser } from '../../../../test/factories'

vi.mock('../../../components/common/CarRecommender', () => ({
  CarRecommender: ({ cars }: { cars: unknown[] }) => (
    <div data-testid="recommender">{cars.length} voitures analysées</div>
  ),
}))

describe('pages/client/MyReviews', () => {
  it('affiche un état vide sans avis', () => {
    renderWithProviders(<MyReviews />, { app: { reviews: [] } })

    expect(screen.getByRole('heading', { name: "Vous n'avez pas encore donné d'avis" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir mes réservations/ })).toHaveAttribute('href', '/my-reservations')
  })

  it('affiche chaque avis avec sa voiture, sa note et son commentaire', () => {
    renderWithProviders(<MyReviews />, {
      app: {
        cars: [makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })],
        reviews: [makeReview({ id: 'rev1', carId: 'c1', rating: 4, comment: 'Très bonne expérience.' })],
      },
    })

    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('Très bonne expérience.')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(5) // 5 étoiles en lecture seule
  })

  it('trie les avis du plus récent au plus ancien', () => {
    renderWithProviders(<MyReviews />, {
      app: {
        cars: [makeCar({ id: 'c1' }), makeCar({ id: 'c2', brand: 'Kia', model: 'Rio' })],
        reviews: [
          makeReview({ id: '1', carId: 'c1', date: '2026-01-01T00:00:00Z', comment: 'Ancien' }),
          makeReview({ id: '2', carId: 'c2', date: '2026-06-01T00:00:00Z', comment: 'Récent' }),
        ],
      },
    })

    const comments = screen.getAllByText(/Ancien|Récent/).map((el) => el.textContent)
    expect(comments).toEqual(['Récent', 'Ancien'])
  })

  it('reste lisible quand la voiture notée n’existe plus', () => {
    renderWithProviders(<MyReviews />, {
      app: { cars: [], reviews: [makeReview({ carId: 'supprimée', comment: 'Bien' })] },
    })

    expect(screen.getByText('Bien')).toBeInTheDocument()
  })

  it('masque le commentaire vide', () => {
    renderWithProviders(<MyReviews />, {
      app: { cars: [makeCar({ id: 'c1' })], reviews: [makeReview({ carId: 'c1', comment: '' })] },
    })

    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
  })
})

describe('pages/client/Recommendations', () => {
  it('affiche un squelette pendant le chargement de la flotte', () => {
    const { container } = renderWithProviders(<Recommendations />, { app: { carsLoading: true } })

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByTestId('recommender')).not.toBeInTheDocument()
  })

  it('passe la flotte au moteur de recommandation', () => {
    renderWithProviders(<Recommendations />, {
      app: { cars: [makeCar({ id: '1' }), makeCar({ id: '2' })] },
    })

    expect(screen.getByTestId('recommender')).toHaveTextContent('2 voitures analysées')
  })

  it('déclenche le message de bienvenue', () => {
    const { app } = renderWithProviders(<Recommendations />)

    expect(app.showWelcomeToast).toHaveBeenCalled()
  })
})

describe('pages/client/Notifications', () => {
  it('rend la vue de notifications du client', () => {
    renderWithProviders(<Notifications />, { app: { currentUser: makeUser({ id: 'u1' }), notifications: [] } })

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aucune notification' })).toBeInTheDocument()
  })
})
