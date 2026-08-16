import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makeContract, makePayment, makeUser } from '../../../../test/factories'
import ReservationDetail from '../ReservationDetail'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { getById: vi.fn(), cancel: vi.fn() },
}))

import { reservationsAPI } from '../../../api/reservations.api'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', plate: '123 TU 4567' })
const currentUser = makeUser({ id: 'u1' })

const apiReservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  carId: 'c1',
  userId: 'u1',
  clientFirstName: 'Amine',
  clientLastName: 'Ben Salah',
  clientEmail: 'amine@example.com',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  pickupLocation: 'Tunis Centre',
  returnLocation: 'Tunis Centre',
  totalAmount: 480,
  status: 'CONFIRMED',
  createdAt: '2026-02-20T09:00:00Z',
  ...overrides,
})

const renderPage = (app = {}, props = {}) =>
  renderWithProviders(<ReservationDetail {...props} />, {
    app: { currentUser, cars: [car], users: [currentUser], ...app },
    route: '/reservation/r1',
    path: '/reservation/:id',
  })

beforeEach(() => {
  vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation()))
  vi.mocked(reservationsAPI.cancel).mockResolvedValue(axiosResponse({ success: true }))
})

describe('pages/client/ReservationDetail · chargement', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(reservationsAPI.getById).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('signale une réservation introuvable', async () => {
    vi.mocked(reservationsAPI.getById).mockRejectedValue(new Error('404'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Réservation introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/my-reservations')
  })

  it('renvoie l’administrateur vers sa propre liste', async () => {
    vi.mocked(reservationsAPI.getById).mockRejectedValue(new Error('404'))

    renderPage({}, { admin: true })

    expect(await screen.findByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/admin/reservations')
  })

  it('accepte l’enveloppe { value }', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse({ value: apiReservation({ id: 'r9' }) }))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Réservation #r9' })).toBeInTheDocument()
  })
})

describe('pages/client/ReservationDetail · contenu', () => {
  it('affiche le véhicule, le client et les informations de location', async () => {
    renderPage()

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('123 TU 4567')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
    expect(screen.getByText('4 jours')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
    expect(screen.getAllByText('Tunis Centre')).toHaveLength(2)
  })

  it('affiche les notes du client quand elles existent', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation({ notes: 'Siège bébé' })))

    renderPage()

    expect(await screen.findByText(/Siège bébé/)).toBeInTheDocument()
  })

  it('affiche la frise d’avancement pour une réservation active', async () => {
    renderPage()

    expect(await screen.findByText('En attente')).toBeInTheDocument()
    expect(screen.getAllByText('Confirmée').length).toBeGreaterThan(0)
    expect(screen.getByText('Terminée')).toBeInTheDocument()
  })

  it('remplace la frise par un bandeau pour une réservation annulée', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation({ status: 'CANCELLED' })))

    renderPage()

    expect(await screen.findByText('Cette réservation a été annulée.')).toBeInTheDocument()
    expect(screen.queryByText('Terminée')).not.toBeInTheDocument()
  })

  it('affiche l’état des lieux d’une location en cours', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(
      axiosResponse(
        apiReservation({
          status: 'IN_PROGRESS',
          mileageStart: 12000,
          fuelLevelStart: 'Plein',
          damagesAtStart: 'Rayure portière',
        }),
      ),
    )

    renderPage()

    expect(await screen.findByText('État des lieux')).toBeInTheDocument()
    expect(screen.getByText(/12\s?000 km/)).toBeInTheDocument()
    expect(screen.getByText('Plein')).toBeInTheDocument()
    expect(screen.getByText('Rayure portière')).toBeInTheDocument()
    expect(screen.getByText('Non renseigné.')).toBeInTheDocument()
  })

  it('affiche "Aucun" quand aucun dégât n’est signalé', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(
      axiosResponse(apiReservation({ status: 'COMPLETED', mileageEnd: 12500 })),
    )

    renderPage()

    expect(await screen.findByText('Aucun')).toBeInTheDocument()
  })

  it('affiche le paiement associé et son statut', async () => {
    renderPage({ payments: [makePayment({ reservationId: 'r1', amount: 480, status: 'PENDING' })] })

    expect(await screen.findByText('Paiement')).toBeInTheDocument()
    // "En attente" apparaît aussi dans la frise d'avancement
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(1)
    expect(screen.getByText(/Montant/)).toBeInTheDocument()
  })

  it('masque le bloc paiement pour une réservation en attente', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation({ status: 'PENDING' })))

    renderPage({ payments: [makePayment({ reservationId: 'r1' })] })

    await screen.findByText('Renault Clio')
    expect(screen.queryByRole('heading', { name: /Paiement/ })).not.toBeInTheDocument()
  })
})

describe('pages/client/ReservationDetail · actions client', () => {
  it('propose de signer un contrat en brouillon', async () => {
    renderPage({ contracts: [makeContract({ reservationId: 'r1', status: 'DRAFT' })] })

    expect(await screen.findByRole('link', { name: /Signer le contrat/ })).toHaveAttribute('href', '/contract/r1')
  })

  it('propose de payer un contrat signé', async () => {
    renderPage({
      contracts: [makeContract({ reservationId: 'r1', status: 'SIGNED' })],
      payments: [makePayment({ reservationId: 'r1', status: 'PENDING' })],
    })

    expect(await screen.findAllByRole('link', { name: /Payer/ })).not.toHaveLength(0)
  })

  it('propose de donner un avis sur une location terminée', async () => {
    vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation({ status: 'COMPLETED' })))

    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: /Donner mon avis/ }))

    expect(await screen.findByText('Donner mon avis', { selector: 'h3' })).toBeInTheDocument()
  })

  it('annule la réservation après confirmation', async () => {
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Annuler la réservation/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(reservationsAPI.cancel).toHaveBeenCalledWith('r1'))
    expect(toast.success).toHaveBeenCalledWith('Réservation annulée.')
    expect(reservationsAPI.getById).toHaveBeenCalledTimes(2)
  })

  it('affiche le refus métier lors de l’annulation', async () => {
    vi.mocked(reservationsAPI.cancel).mockResolvedValue(axiosResponse({ success: false, message: 'Trop tard' }))
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Annuler la réservation/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trop tard'))
  })

  it('affiche l’erreur réseau lors de l’annulation', async () => {
    vi.mocked(reservationsAPI.cancel).mockRejectedValue(new Error('Réseau indisponible'))
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Annuler la réservation/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Réseau indisponible'))
  })

  it('revient à la page précédente', async () => {
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Retour/ }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })
})

describe('pages/client/ReservationDetail · vue administrateur', () => {
  it('n’expose que le lien vers le contrat', async () => {
    renderPage({ contracts: [makeContract({ reservationId: 'r1', status: 'DRAFT' })] }, { admin: true })

    expect(await screen.findByRole('link', { name: /Voir le contrat/ })).toHaveAttribute('href', '/admin/contract/r1')
    expect(screen.queryByRole('button', { name: /Annuler la réservation/ })).not.toBeInTheDocument()
  })

  it('masque le bouton de paiement du client', async () => {
    renderPage(
      {
        contracts: [makeContract({ reservationId: 'r1', status: 'SIGNED' })],
        payments: [makePayment({ reservationId: 'r1', status: 'PENDING' })],
      },
      { admin: true },
    )

    await screen.findByText('Renault Clio')
    expect(screen.queryByRole('link', { name: /Payer/ })).not.toBeInTheDocument()
  })
})
