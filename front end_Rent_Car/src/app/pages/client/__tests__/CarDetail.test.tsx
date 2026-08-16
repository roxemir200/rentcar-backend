import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makeUser } from '../../../../test/factories'
import CarDetail from '../CarDetail'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { create: vi.fn() },
}))
vi.mock('../../../api/reviews.api', () => ({
  reviewsAPI: { getByCar: vi.fn(), getAverageRating: vi.fn() },
}))

import { reservationsAPI } from '../../../api/reservations.api'
import { reviewsAPI } from '../../../api/reviews.api'

const car = makeCar({
  id: '1',
  brand: 'Renault',
  model: 'Clio',
  plate: '123 TU 4567',
  color: 'Blanc',
  mileage: 12000,
  pricePerDay: 120,
  images: ['https://cdn/1.jpg', 'https://cdn/2.jpg'],
})

const currentUser = makeUser({ id: 'u1' })

/** Dates toujours futures pour satisfaire la validation métier. */
const future = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const renderPage = (app = {}) =>
  renderWithProviders(<CarDetail />, {
    app: { cars: [car], currentUser, ...app },
    route: '/cars/1',
    path: '/cars/:id',
  })

const fillDates = async (user: ReturnType<typeof renderWithProviders>['user'], from = future(2), to = future(6)) => {
  await user.type(screen.getByLabelText(/Début/), from)
  await user.type(screen.getByLabelText(/Fin/), to)
}

beforeEach(() => {
  vi.mocked(reviewsAPI.getByCar).mockResolvedValue(axiosResponse([]))
  vi.mocked(reviewsAPI.getAverageRating).mockResolvedValue(axiosResponse(0))
  vi.mocked(reservationsAPI.create).mockResolvedValue(axiosResponse({ success: true, data: { id: 9 } }))
})

describe('pages/client/CarDetail · états de la page', () => {
  it('affiche un squelette pendant le chargement de la flotte', () => {
    const { container } = renderPage({ carsLoading: true })

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('affiche l’erreur de chargement et permet de réessayer', async () => {
    const { app, user } = renderPage({ carsError: 'Erreur lors du chargement des voitures' })

    expect(screen.getByRole('heading', { name: 'Erreur de chargement' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(app.loadCars).toHaveBeenCalled()
  })

  it('signale une voiture introuvable', () => {
    renderPage({ cars: [] })

    expect(screen.getByRole('heading', { name: 'Voiture introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour aux voitures/ })).toHaveAttribute('href', '/cars')
  })
})

describe('pages/client/CarDetail · présentation du véhicule', () => {
  it('affiche l’identité, le prix et la description', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('120 DT')).toBeInTheDocument()
    expect(screen.getByText('Citadine économique et fiable.')).toBeInTheDocument()
  })

  it('affiche les caractéristiques techniques', async () => {
    renderPage()

    expect(await screen.findByText('123 TU 4567')).toBeInTheDocument()
    expect(screen.getByText('Blanc')).toBeInTheDocument()
    expect(screen.getByText(/12\s?000 km/)).toBeInTheDocument()
    expect(screen.getByText('Essence')).toBeInTheDocument()
    expect(screen.getByText('Manuelle')).toBeInTheDocument()
  })

  it('navigue dans la galerie avec les flèches et les vignettes', async () => {
    const { user, container } = renderPage()
    const mainImage = () => container.querySelector('.h-72 img') as HTMLImageElement

    await waitFor(() => expect(mainImage().src).toBe('https://cdn/1.jpg'))

    const next = container.querySelector('.absolute.right-3.size-10') as HTMLElement
    const prev = container.querySelector('.absolute.left-3.size-10') as HTMLElement

    await user.click(next)
    expect(mainImage().src).toBe('https://cdn/2.jpg')

    await user.click(prev)
    expect(mainImage().src).toBe('https://cdn/1.jpg')

    // Boucle : précédent depuis la première image → dernière
    await user.click(prev)
    expect(mainImage().src).toBe('https://cdn/2.jpg')
  })

  it('masque les flèches quand il n’y a qu’une seule image', () => {
    const { container } = renderPage({ cars: [makeCar({ id: '1', images: ['https://cdn/seule.jpg'] })] })

    expect(container.querySelector('.absolute.left-3.size-10')).not.toBeInTheDocument()
  })

  it('revient à la page précédente', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /Retour/ }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })
})

describe('pages/client/CarDetail · avis', () => {
  it('affiche un état vide quand la voiture n’a pas d’avis', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Aucun avis pour cette voiture' })).toBeInTheDocument()
  })

  it('affiche la note moyenne, la répartition et les avis', async () => {
    vi.mocked(reviewsAPI.getByCar).mockResolvedValue(
      axiosResponse([
        { id: 1, carId: 1, rating: 5, comment: 'Parfait', userFirstName: 'Amine', userLastName: 'Ben Salah', createdAt: '2026-03-01' },
        { id: 2, carId: 1, rating: 4, comment: '', createdAt: '2026-03-02' },
      ]),
    )
    vi.mocked(reviewsAPI.getAverageRating).mockResolvedValue(axiosResponse(4.5))

    renderPage()

    expect(await screen.findAllByText('4.5')).not.toHaveLength(0)
    expect(screen.getByText('2 avis')).toBeInTheDocument()
    expect(screen.getByText('Amine B.')).toBeInTheDocument()
    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('Parfait')).toBeInTheDocument()
  })

  it('affiche un auteur anonyme quand le nom est absent', async () => {
    vi.mocked(reviewsAPI.getByCar).mockResolvedValue(
      axiosResponse([{ id: 3, carId: 1, rating: 3, comment: 'Correct' }]),
    )
    vi.mocked(reviewsAPI.getAverageRating).mockResolvedValue(axiosResponse(3))

    renderPage()

    expect(await screen.findByText('Utilisateur')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('absorbe une erreur de chargement des avis', async () => {
    vi.mocked(reviewsAPI.getByCar).mockRejectedValue(new Error('500'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Aucun avis pour cette voiture' })).toBeInTheDocument()
  })
})

describe('pages/client/CarDetail · réservation', () => {
  it('calcule le total à partir des dates saisies', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await fillDates(user)

    expect(await screen.findByText('4 jours × 120 DT')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('refuse une date de début dans le passé', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await user.type(screen.getByLabelText(/Début/), '2020-01-01')

    expect(await screen.findByText('La date de début doit être dans le futur')).toBeInTheDocument()
  })

  it('refuse une date de fin antérieure à la date de début', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await user.type(screen.getByLabelText(/Début/), future(10))
    await user.type(screen.getByLabelText(/Fin/), future(5))

    expect(await screen.findByText('La date de fin doit être après la date de début')).toBeInTheDocument()
  })

  it('exige les dates avant d’appeler le backend', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    expect(toast.error).toHaveBeenCalledWith('Veuillez remplir tous les champs obligatoires')
    expect(await screen.findByText('La date de début est obligatoire')).toBeInTheDocument()
    expect(reservationsAPI.create).not.toHaveBeenCalled()
  })

  it('redirige un visiteur non connecté vers la connexion', async () => {
    const { user } = renderPage({ currentUser: null })
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    expect(screen.getByText('Connexion requise pour réserver')).toBeInTheDocument()

    await fillDates(user)
    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    expect(toast.error).toHaveBeenCalledWith('Vous devez être connecté pour réserver.')
    expect(navigate).toHaveBeenCalledWith('/login')
    expect(reservationsAPI.create).not.toHaveBeenCalled()
  })

  it('désactive la réservation pour un véhicule indisponible', async () => {
    renderPage({ cars: [makeCar({ id: '1', status: 'RENTED' })] })

    expect(await screen.findByRole('button', { name: 'Non disponible' })).toBeDisabled()
  })

  it('crée la réservation et redirige vers son détail', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await fillDates(user, future(2), future(6))
    await user.type(screen.getByLabelText(/Notes supplémentaires/), 'Siège bébé')
    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    await waitFor(() =>
      expect(reservationsAPI.create).toHaveBeenCalledWith({
        carId: 1,
        startDate: future(2),
        endDate: future(6),
        pickupLocation: 'Agence Tunis Centre',
        returnLocation: 'Agence Tunis Centre',
        additionalNotes: 'Siège bébé',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Réservation créée avec succès !')
    expect(navigate).toHaveBeenCalledWith('/reservation/9')
  })

  it('transmet les lieux personnalisés', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await user.clear(screen.getByLabelText(/Lieu de prise en charge/))
    await user.type(screen.getByLabelText(/Lieu de prise en charge/), 'Aéroport')
    await fillDates(user)
    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    await waitFor(() =>
      expect(reservationsAPI.create).toHaveBeenCalledWith(expect.objectContaining({ pickupLocation: 'Aéroport' })),
    )
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(reservationsAPI.create).mockResolvedValue(
      axiosResponse({ success: false, message: 'Véhicule déjà réservé sur cette période' }),
    )
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await fillDates(user)
    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Véhicule déjà réservé sur cette période'))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('affiche l’erreur réseau', async () => {
    vi.mocked(reservationsAPI.create).mockRejectedValue(new Error('Réseau indisponible'))
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await fillDates(user)
    await user.click(screen.getByRole('button', { name: 'Réserver maintenant' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Réseau indisponible'))
  })

  it('affiche le total au singulier pour une location d’un jour', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { name: 'Renault Clio', level: 1 })

    await fillDates(user, future(2), future(3))

    const recap = await screen.findByText(/1 jour ×/)
    expect(within(recap.parentElement!).getByText('120 DT')).toBeInTheDocument()
  })
})
