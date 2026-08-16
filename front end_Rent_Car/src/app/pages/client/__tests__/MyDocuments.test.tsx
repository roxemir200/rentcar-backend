import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makeContract, makePayment, makeReservation, makeUser } from '../../../../test/factories'
import MyDocuments from '../MyDocuments'

vi.mock('../../../lib/exporters', () => ({
  generateContractPDF: vi.fn(),
  generateInvoicePDF: vi.fn(),
  downloadCSV: vi.fn(),
  downloadXLSX: vi.fn(),
}))
vi.mock('../../../api/contrat.api', () => ({
  contractsAPI: { getByReservation: vi.fn() },
}))

import { generateContractPDF, generateInvoicePDF } from '../../../lib/exporters'
import { contractsAPI } from '../../../api/contrat.api'

const currentUser = makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah' })
const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', year: 2024, pricePerDay: 120 })
const reservation = makeReservation({ id: 'r1', userId: 'u1', carId: 'c1', total: 480 })

const renderPage = (app = {}) =>
  renderWithProviders(<MyDocuments />, {
    app: { currentUser, cars: [car], reservations: [reservation], contracts: [], payments: [], ...app },
  })

beforeEach(() => {
  vi.mocked(contractsAPI.getByReservation).mockResolvedValue(
    axiosResponse({ id: 5, contractNumber: 'CONT-1', reservationId: 'r1', status: 'SIGNED', signedAt: '2026-03-01' }),
  )
})

describe('pages/client/MyDocuments · onglet contrats', () => {
  it('affiche les deux onglets traduits', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Factures & documents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Contrats/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Factures/ })).toBeInTheDocument()
  })

  it('affiche un état vide sans contrat', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Aucun contrat pour le moment.' })).toBeInTheDocument()
  })

  it('charge les contrats des réservations payées et alimente le contexte', async () => {
    const { app } = renderPage({ payments: [makePayment({ reservationId: 'r1' })] })

    await waitFor(() => expect(contractsAPI.getByReservation).toHaveBeenCalledWith('r1'))
    await waitFor(() =>
      expect(app.setContracts).toHaveBeenCalledWith([
        expect.objectContaining({ id: '5', number: 'CONT-1', reservationId: 'r1', status: 'SIGNED' }),
      ]),
    )
  })

  it('ignore les contrats dont le chargement échoue', async () => {
    vi.mocked(contractsAPI.getByReservation).mockRejectedValue(new Error('404'))

    const { app } = renderPage({ payments: [makePayment({ reservationId: 'r1' })] })

    await waitFor(() => expect(app.setContracts).toHaveBeenCalledWith([]))
  })

  it('ne charge pas les contrats des réservations d’autres clients', async () => {
    renderPage({
      reservations: [makeReservation({ id: 'r9', userId: 'autre' })],
      payments: [makePayment({ reservationId: 'r9' })],
    })

    await waitFor(() => expect(screen.queryByText('Chargement des contrats...')).not.toBeInTheDocument())
    expect(contractsAPI.getByReservation).not.toHaveBeenCalled()
  })

  it('liste les contrats du client avec leur statut', async () => {
    renderPage({
      contracts: [makeContract({ id: 'ct1', number: 'CONT-1', reservationId: 'r1', status: 'SIGNED' })],
    })

    expect(await screen.findByText('CONT-1')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('Signé')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/contract/r1')
  })

  it('exclut les contrats liés aux réservations d’autres clients', async () => {
    renderPage({
      contracts: [makeContract({ id: 'ct9', number: 'CONT-9', reservationId: 'inconnue' })],
    })

    expect(await screen.findByRole('heading', { name: 'Aucun contrat pour le moment.' })).toBeInTheDocument()
  })

  it('génère le PDF du contrat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      contracts: [makeContract({ id: 'ct1', number: 'CONT-1', reservationId: 'r1', status: 'SIGNED', signedAt: '2026-03-01' })],
    })

    await user.click(await screen.findByRole('button', { name: /PDF/ }))
    await vi.advanceTimersByTimeAsync(500)

    expect(generateContractPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 'CONT-1',
        status: 'Signé',
        client: 'Amine Ben Salah',
        car: 'Renault Clio (2024)',
        total: '480 DT',
        signedAt: expect.any(String),
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Contrat téléchargé (PDF).')
    vi.useRealTimers()
  })

  it.each([
    ['DRAFT', 'Brouillon'],
    ['CANCELLED', 'Annulé'],
  ] as const)('traduit le statut %s dans le PDF', async (status, label) => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      contracts: [makeContract({ id: 'ct1', reservationId: 'r1', status })],
    })

    await user.click(await screen.findByRole('button', { name: /PDF/ }))
    await vi.advanceTimersByTimeAsync(500)

    expect(generateContractPDF).toHaveBeenCalledWith(expect.objectContaining({ status: label }))
    vi.useRealTimers()
  })
})

describe('pages/client/MyDocuments · onglet factures', () => {
  const openInvoices = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await user.click(screen.getByRole('button', { name: /Factures/ }))
  }

  it('affiche un état vide sans facture', async () => {
    const { user } = renderPage()

    await openInvoices(user)

    expect(await screen.findByRole('heading', { name: 'Aucune facture pour le moment.' })).toBeInTheDocument()
  })

  it('liste les factures du client', async () => {
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', amount: 480, status: 'COMPLETED', stripeId: 'pi_abcd1234' })],
    })

    await openInvoices(user)

    expect(await screen.findByText('FAC-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
    expect(screen.getByText('Payé')).toBeInTheDocument()
  })

  it('affiche un tiret quand la facture n’a pas de date', async () => {
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', date: undefined })],
    })

    await openInvoices(user)

    expect(await screen.findByText('—')).toBeInTheDocument()
  })

  it('génère le PDF de la facture avec HT et TVA', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', amount: 476, status: 'COMPLETED', stripeId: 'pi_abcd1234' })],
    })

    await openInvoices(user)
    await user.click(await screen.findByRole('button', { name: /PDF/ }))
    await vi.advanceTimersByTimeAsync(500)

    expect(generateInvoicePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 'FAC-ABCD1234',
        client: 'Amine Ben Salah',
        car: 'Renault Clio',
        days: 4,
        subtotal: '400 DT',
        tax: '76 DT',
        total: '476 DT',
        status: 'Payé',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Facture téléchargée (PDF).')
    vi.useRealTimers()
  })

  it('marque les paiements non aboutis comme "En attente" dans le PDF', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', status: 'PENDING' })],
    })

    await openInvoices(user)
    await user.click(await screen.findByRole('button', { name: /PDF/ }))
    await vi.advanceTimersByTimeAsync(500)

    expect(generateInvoicePDF).toHaveBeenCalledWith(expect.objectContaining({ status: 'En attente' }))
    vi.useRealTimers()
  })

  it('trie les factures de la plus récente à la plus ancienne', async () => {
    const { user } = renderPage({
      payments: [
        makePayment({ id: 'p1', reservationId: 'r1', stripeId: 'pi_ancien1', date: '2026-01-01T00:00:00Z' }),
        makePayment({ id: 'p2', reservationId: 'r1', stripeId: 'pi_recent1', date: '2026-06-01T00:00:00Z' }),
      ],
    })

    await openInvoices(user)

    const numbers = (await screen.findAllByText(/^FAC-/)).map((el) => el.textContent)
    expect(numbers).toEqual(['FAC-_RECENT1', 'FAC-_ANCIEN1'])
  })
})
