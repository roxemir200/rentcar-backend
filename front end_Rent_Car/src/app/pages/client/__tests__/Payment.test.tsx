import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makePayment } from '../../../../test/factories'
import Payment from '../Payment'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

// Stripe : on remplace les primitives par des doubles pilotables.
const confirmCardPayment = vi.fn()
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({ confirmCardPayment }),
  useElements: () => ({ getElement: () => ({}) }),
  CardElement: ({ onReady }: { onReady?: () => void }) => {
    onReady?.()
    return <div data-testid="card-element" />
  },
}))

vi.mock('../../../api/payments.api', () => ({
  paymentsAPI: { getByReservation: vi.fn() },
}))
vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { getById: vi.fn() },
}))
vi.mock('../../../api/contrat.api', () => ({
  contractsAPI: { getByReservation: vi.fn() },
}))

import { paymentsAPI } from '../../../api/payments.api'
import { reservationsAPI } from '../../../api/reservations.api'
import { contractsAPI } from '../../../api/contrat.api'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })

const apiReservation = (overrides = {}) => ({
  id: 'r1',
  carId: 'c1',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  totalAmount: 480,
  status: 'CONFIRMED',
  ...overrides,
})

const renderPage = (app = {}, options = {}) =>
  renderWithProviders(<Payment />, {
    app: { cars: [car], ...app },
    route: '/payment/r1',
    path: '/payment/:reservationId',
    ...options,
  })

beforeEach(() => {
  vi.mocked(reservationsAPI.getById).mockResolvedValue(axiosResponse(apiReservation()))
  vi.mocked(paymentsAPI.getByReservation).mockResolvedValue(axiosResponse(null))
  vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse({ status: 'SIGNED' }))
  confirmCardPayment.mockResolvedValue({})
})

describe('pages/client/Payment · chargement', () => {
  it('affiche un indicateur de chargement', () => {
    vi.mocked(reservationsAPI.getById).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('signale une erreur de chargement', async () => {
    vi.mocked(reservationsAPI.getById).mockRejectedValue(new Error('500'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Erreur lors du chargement des données' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/my-reservations')
  })

  it('tolère l’absence de paiement et de contrat', async () => {
    vi.mocked(paymentsAPI.getByReservation).mockRejectedValue(new Error('404'))
    vi.mocked(contractsAPI.getByReservation).mockRejectedValue(new Error('404'))

    renderPage()

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument()
  })

  it('injecte le paiement reçu de l’API dans le contexte', async () => {
    vi.mocked(paymentsAPI.getByReservation).mockResolvedValue(
      axiosResponse({ id: 9, reservationId: 'r1', amount: 480, status: 'PENDING', externalPaymentId: 'pi_1' }),
    )

    const { app } = renderPage()

    await waitFor(() =>
      expect(app.addOrUpdatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ id: '9', reservationId: 'r1', stripeId: 'pi_1', status: 'PENDING' }),
      ),
    )
  })

  it('recharge les données à la demande', async () => {
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Actualiser/ }))

    await waitFor(() => expect(reservationsAPI.getById).toHaveBeenCalledTimes(2))
  })
})

describe('pages/client/Payment · résumé et états', () => {
  it('affiche le véhicule, les dates et le montant', async () => {
    renderPage()

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('invite à signer le contrat quand il ne l’est pas', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse({ status: 'DRAFT' }))

    renderPage()

    expect(await screen.findByText('Le contrat doit être signé avant de pouvoir payer.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Signer le contrat maintenant/ })).toHaveAttribute('href', '/contract/r1')
  })

  it('indique qu’aucun paiement n’est en attente', async () => {
    renderPage()

    expect(await screen.findByText('Aucun paiement en attente.')).toBeInTheDocument()
  })

  it('affiche la confirmation et l’historique d’un paiement abouti', async () => {
    renderPage({
      payments: [makePayment({ reservationId: 'r1', status: 'COMPLETED', amount: 480, stripeId: 'pi_ok', paymentDate: '2026-03-01T10:00:00Z' })],
    })

    expect(await screen.findByRole('heading', { name: 'Paiement réussi ✅' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir ma réservation/ })).toHaveAttribute('href', '/reservation/r1')
    expect(screen.getByText('Historique du paiement')).toBeInTheDocument()
    expect(screen.getByText('pi_ok')).toBeInTheDocument()
  })

  it('propose de réessayer après un échec', async () => {
    const { user } = renderPage({ payments: [makePayment({ reservationId: 'r1', status: 'FAILED' })] })

    expect(await screen.findByRole('heading', { name: 'Paiement échoué ❌' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    await waitFor(() => expect(reservationsAPI.getById).toHaveBeenCalledTimes(2))
  })

  it('signale un paiement remboursé', async () => {
    renderPage({ payments: [makePayment({ reservationId: 'r1', status: 'REFUNDED' })] })

    expect(await screen.findByText('Ce paiement a été remboursé.')).toBeInTheDocument()
    expect(screen.getByText('Historique du paiement')).toBeInTheDocument()
  })

  it('revient à la page précédente', async () => {
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Retour/ }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })
})

describe('pages/client/Payment · tunnel Stripe', () => {
  const payable = (app = {}) =>
    renderPage(
      { payments: [makePayment({ reservationId: 'r1', status: 'PENDING', amount: 480 })], ...app },
      { route: '/payment/r1' },
    )

  it('n’affiche pas le formulaire sans clientSecret', async () => {
    payable()

    await screen.findByText('Renault Clio')
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument()
    expect(screen.getByText('Aucun paiement en attente.')).toBeInTheDocument()
  })

  const withSecret = () =>
    renderPage(
      { payments: [makePayment({ reservationId: 'r1', status: 'PENDING', amount: 480 })] },
      { state: { clientSecret: 'pi_secret_1' } },
    )

  it('affiche le formulaire de carte quand contrat signé et clientSecret transmis', async () => {
    withSecret()

    expect(await screen.findByTestId('card-element')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Payer 480 DT/ })).toBeEnabled()
    expect(screen.getByText(/Paiement 100% sécurisé via Stripe/)).toBeInTheDocument()
  })

  it('confirme le paiement auprès de Stripe et attend la confirmation serveur', async () => {
    const { user } = withSecret()

    await user.click(await screen.findByRole('button', { name: /Payer 480 DT/ }))

    await waitFor(() =>
      expect(confirmCardPayment).toHaveBeenCalledWith('pi_secret_1', {
        payment_method: { card: expect.anything() },
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Confirmation du paiement en cours' })).toBeInTheDocument()
  })

  it('reste sur le formulaire quand Stripe refuse la carte', async () => {
    confirmCardPayment.mockResolvedValue({ error: { message: 'Carte refusée' } })
    const { user } = withSecret()

    await user.click(await screen.findByRole('button', { name: /Payer 480 DT/ }))

    await waitFor(() => expect(confirmCardPayment).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Confirmation du paiement en cours' })).not.toBeInTheDocument()
    expect(screen.getByTestId('card-element')).toBeInTheDocument()
  })

  it('exige un contrat signé pour afficher le formulaire', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse({ status: 'DRAFT' }))

    withSecret()

    await screen.findByText('Renault Clio')
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument()
  })
})
