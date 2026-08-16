import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeCar, makePayment, makeReservation, makeUser } from '../../../../test/factories'
import PaymentsHistory from '../PaymentsHistory'

vi.mock('../../../lib/exporters', () => ({
  generateInvoicePDF: vi.fn(),
  generateContractPDF: vi.fn(),
  downloadCSV: vi.fn(),
  downloadXLSX: vi.fn(),
}))

import { generateInvoicePDF } from '../../../lib/exporters'

const currentUser = makeUser({ id: 'u1' })
const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', pricePerDay: 120 })
const reservation = makeReservation({ id: 'r1', carId: 'c1', userId: 'u1', startDate: '2026-03-01', endDate: '2026-03-05' })

const renderPage = (app = {}) =>
  renderWithProviders(<PaymentsHistory />, {
    app: { currentUser, users: [currentUser], cars: [car], reservations: [reservation], ...app },
  })

describe('pages/client/PaymentsHistory', () => {
  it('affiche un état vide sans paiement', () => {
    renderPage({ payments: [] })

    expect(screen.getByRole('heading', { name: 'Aucun paiement' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Découvrir les voitures/ })).toHaveAttribute('href', '/cars')
  })

  it('affiche le total payé (paiements aboutis uniquement)', () => {
    renderPage({
      payments: [
        makePayment({ id: 'p1', amount: 480, status: 'COMPLETED' }),
        makePayment({ id: 'p2', amount: 300, status: 'PENDING' }),
        makePayment({ id: 'p3', amount: 100, status: 'REFUNDED' }),
      ],
    })

    expect(screen.getByText('Total payé')).toBeInTheDocument()
    // Le cumul est affiché dans l'encart de synthèse (première occurrence)
    expect(screen.getAllByText('480 DT')[0]).toBeInTheDocument()
    expect(screen.queryByText('880 DT')).not.toBeInTheDocument()
  })

  it('trie les paiements du plus récent au plus ancien', () => {
    renderPage({
      payments: [
        makePayment({ id: 'p1', stripeId: 'pi_ancien', paymentDate: '2026-01-01T10:00:00Z' }),
        makePayment({ id: 'p2', stripeId: 'pi_recent', paymentDate: '2026-06-01T10:00:00Z' }),
      ],
    })

    const ids = screen.getAllByText(/^pi_/).map((el) => el.textContent)
    expect(ids).toEqual(['pi_recent', 'pi_ancien'])
  })

  it('affiche la voiture liée quand la réservation est connue', () => {
    renderPage({ payments: [makePayment({ reservationId: 'r1' })] })

    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/payment/r1')
  })

  it('retombe sur les informations du paiement quand la réservation est inconnue', () => {
    renderPage({
      payments: [makePayment({ reservationId: 'inconnue', carInfo: 'Peugeot 208' })],
    })

    expect(screen.getByText('Peugeot 208')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '' })).not.toBeInTheDocument()
  })

  it('affiche un libellé générique sans information de voiture', () => {
    renderPage({ payments: [makePayment({ reservationId: 'inconnue', carInfo: undefined })] })

    expect(screen.getByText('Réservation')).toBeInTheDocument()
  })

  it('affiche un tiret quand aucune date n’est disponible', () => {
    renderPage({
      payments: [makePayment({ paymentDate: undefined, createdAt: undefined, date: undefined })],
    })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('génère la facture PDF avec les montants HT, TVA et TTC', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', amount: 476, status: 'COMPLETED', stripeId: 'pi_abcd1234' })],
    })

    await user.click(screen.getAllByRole('button').at(-1)!)
    await vi.advanceTimersByTimeAsync(500)

    expect(generateInvoicePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 'FAC-ABCD1234',
        client: 'Amine Ben Salah',
        car: 'Renault Clio',
        days: 4,
        unitPrice: '120 DT',
        subtotal: '400 DT',
        tax: '76 DT',
        total: '476 DT',
        status: 'Payé',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Facture téléchargée (PDF).')
    vi.useRealTimers()
  })

  it('indique "En attente" sur la facture d’un paiement non abouti', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', status: 'PENDING' })],
    })

    await user.click(screen.getAllByRole('button').at(-1)!)
    await vi.advanceTimersByTimeAsync(500)

    expect(generateInvoicePDF).toHaveBeenCalledWith(expect.objectContaining({ status: 'En attente' }))
    vi.useRealTimers()
  })

  it('ne génère aucune facture si la réservation est introuvable', async () => {
    const { user } = renderPage({ payments: [makePayment({ id: 'p1', reservationId: 'inconnue' })] })

    await user.click(screen.getAllByRole('button').at(-1)!)

    await waitFor(() => expect(generateInvoicePDF).not.toHaveBeenCalled())
  })
})
