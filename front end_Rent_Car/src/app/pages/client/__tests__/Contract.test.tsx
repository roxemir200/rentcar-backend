import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse } from '../../../../test/factories'
import Contract from '../Contract'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/contrat.api', () => ({
  contractsAPI: { getByReservation: vi.fn(), sign: vi.fn() },
}))

import { contractsAPI } from '../../../api/contrat.api'

const apiContract = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  contractNumber: 'CONT-20260220-1234',
  reservationId: 'r1',
  status: 'DRAFT',
  clientFirstName: 'Amine',
  clientLastName: 'Ben Salah',
  clientEmail: 'amine@example.com',
  carBrand: 'Renault',
  carModel: 'Clio',
  carRegistration: '123 TU 4567',
  carColor: 'Blanc',
  carMileage: 12000,
  carFuelType: 'Essence',
  carTransmission: 'Manuelle',
  carSeats: 5,
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  pickupLocation: 'Tunis Centre',
  returnLocation: 'Tunis Centre',
  dailyRate: 120,
  totalAmount: 480,
  ...overrides,
})

const renderPage = (props = {}) =>
  renderWithProviders(<Contract {...props} />, {
    route: '/contract/r1',
    path: '/contract/:reservationId',
  })

beforeEach(() => {
  vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse(apiContract()))
  vi.mocked(contractsAPI.sign).mockResolvedValue(axiosResponse({ success: true, data: {} }))
})

describe('pages/client/Contract · chargement', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(contractsAPI.getByReservation).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('signale un contrat introuvable', async () => {
    vi.mocked(contractsAPI.getByReservation).mockRejectedValue(new Error('404'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Contrat introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/my-reservations')
  })

  it('renvoie l’administrateur vers la liste des réservations', async () => {
    vi.mocked(contractsAPI.getByReservation).mockRejectedValue(new Error('404'))

    renderPage({ admin: true })

    expect(await screen.findByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/admin/reservations')
  })
})

describe('pages/client/Contract · document', () => {
  it('affiche le numéro, le client et le véhicule', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'CONT-20260220-1234' })).toBeInTheDocument()
    expect(screen.getAllByText('Amine Ben Salah')).toHaveLength(2) // client + bloc signature
    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('123 TU 4567')).toBeInTheDocument()
    expect(screen.getByText(/12\s?000 km/)).toBeInTheDocument()
  })

  it('affiche les détails financiers de la location', async () => {
    renderPage()

    expect(await screen.findByText('4 jour(s)')).toBeInTheDocument()
    expect(screen.getByText('120 DT')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('affiche les clauses par défaut quand le backend n’en fournit pas', async () => {
    renderPage()

    expect(await screen.findByText(/La sous-location du véhicule est strictement interdite/)).toBeInTheDocument()
  })

  it('affiche les conditions transmises par le backend', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(
      axiosResponse(apiContract({ terms: 'Conditions particulières négociées.' })),
    )

    renderPage()

    expect(await screen.findByText('Conditions particulières négociées.')).toBeInTheDocument()
    expect(screen.queryByText(/La sous-location/)).not.toBeInTheDocument()
  })

  it.each([
    ['DRAFT', '⏳ En attente de signature'],
    ['CANCELLED', 'Contrat annulé'],
  ])('affiche l’état de signature pour un contrat %s', async (status, label) => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse(apiContract({ status })))

    renderPage()

    expect(await screen.findByText(label)).toBeInTheDocument()
  })

  it('affiche la date de signature d’un contrat signé', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(
      axiosResponse(apiContract({ status: 'SIGNED', signedAt: '2026-02-21T10:00:00Z' })),
    )

    renderPage()

    expect(await screen.findByText(/✅ Signé le/)).toBeInTheDocument()
  })

  it('affiche un bandeau pour un contrat annulé', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse(apiContract({ status: 'CANCELLED' })))

    renderPage()

    expect(await screen.findByText('Ce contrat a été annulé.')).toBeInTheDocument()
  })
})

describe('pages/client/Contract · signature', () => {
  it('exige l’acceptation des conditions avant de signer', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /Je signe le contrat/ })).toBeDisabled()
  })

  it('active la signature après acceptation', async () => {
    const { user } = renderPage()
    await screen.findByRole('checkbox')

    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('button', { name: /Je signe le contrat/ })).toBeEnabled()
  })

  it('signe le contrat et conduit au paiement', async () => {
    const { user } = renderPage()
    await screen.findByRole('checkbox')

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Je signe le contrat/ }))

    await waitFor(() => expect(contractsAPI.sign).toHaveBeenCalledWith(12))
    expect(navigate).toHaveBeenCalledWith('/payment/r1')
  })

  /**
   * L'acces au paiement dependait d'un `clientSecret` renvoye par la
   * signature. Le backend n'arrivait jamais a le produire, donc le bouton ne
   * s'affichait pas : un contrat signe ne menait plus nulle part.
   */
  it('propose de payer devant un contrat déjà signé', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(
      axiosResponse(apiContract({ status: 'SIGNED' })),
    )

    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: /Procéder au paiement/ }))

    expect(navigate).toHaveBeenCalledWith('/payment/r1')
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(contractsAPI.sign).mockResolvedValue(axiosResponse({ success: false, message: 'Contrat déjà signé' }))
    const { user } = renderPage()
    await screen.findByRole('checkbox')

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Je signe le contrat/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contrat déjà signé'))
  })

  it('affiche l’erreur réseau', async () => {
    vi.mocked(contractsAPI.sign).mockRejectedValue(new Error('Réseau indisponible'))
    const { user } = renderPage()
    await screen.findByRole('checkbox')

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Je signe le contrat/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Réseau indisponible'))
  })

  it('masque la signature en vue administrateur', async () => {
    renderPage({ admin: true })

    await screen.findByRole('heading', { name: 'CONT-20260220-1234' })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Je signe le contrat/ })).not.toBeInTheDocument()
  })
})
