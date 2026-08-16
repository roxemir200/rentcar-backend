import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeCar, makePayment, makeReservation, makeUser } from '../../../../test/factories'
import AdminPayments from '../AdminPayments'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })
const client = makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah' })
const reservation = makeReservation({ id: 'r1', userId: 'u1', carId: 'c1' })

const renderPage = (app = {}) =>
  renderWithProviders(<AdminPayments />, {
    app: { cars: [car], users: [client], reservations: [reservation], payments: [], ...app },
  })

describe('pages/admin/AdminPayments', () => {
  it('affiche un état vide sans paiement', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Aucun paiement' })).toBeInTheDocument()
    expect(screen.getByText('0 transactions')).toBeInTheDocument()
  })

  it('liste les paiements avec client, voiture et montant', () => {
    renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', amount: 480, status: 'COMPLETED', stripeId: 'pi_1' })],
    })

    expect(screen.getByText('pi_1')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
    expect(screen.getByText('1 transactions')).toBeInTheDocument()
  })

  it('privilégie les libellés dénormalisés du paiement', () => {
    renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', clientName: 'Client API', carInfo: 'Kia Rio' })],
    })

    expect(screen.getByText('Client API')).toBeInTheDocument()
    expect(screen.getByText('Kia Rio')).toBeInTheDocument()
  })

  it('affiche un tiret quand ni le paiement ni la réservation ne renseignent le client', () => {
    renderPage({ payments: [makePayment({ id: 'p1', reservationId: 'inconnue' })], users: [], cars: [] })

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('affiche un tiret quand le paiement n’a pas de date', () => {
    renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', paymentDate: undefined, createdAt: undefined })],
    })

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('filtre les paiements par statut', async () => {
    const { user } = renderPage({
      payments: [
        makePayment({ id: 'p1', stripeId: 'pi_paye', status: 'COMPLETED' }),
        makePayment({ id: 'p2', stripeId: 'pi_attente', status: 'PENDING' }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'En attente' }))

    await waitFor(() => expect(screen.queryByText('pi_paye')).not.toBeInTheDocument())
    expect(screen.getByText('pi_attente')).toBeInTheDocument()
  })

  it('trie les paiements du plus récent au plus ancien', () => {
    renderPage({
      payments: [
        makePayment({ id: 'p1', stripeId: 'pi_ancien', paymentDate: '2026-01-01T00:00:00Z' }),
        makePayment({ id: 'p2', stripeId: 'pi_recent', paymentDate: '2026-06-01T00:00:00Z' }),
      ],
    })

    const ids = screen.getAllByText(/^pi_/).map((el) => el.textContent)
    expect(ids).toEqual(['pi_recent', 'pi_ancien'])
  })

  it('ne propose le remboursement que pour les paiements aboutis', () => {
    renderPage({
      payments: [
        makePayment({ id: 'p1', status: 'COMPLETED' }),
        makePayment({ id: 'p2', status: 'PENDING' }),
      ],
    })

    expect(screen.getAllByRole('button', { name: /Rembourser/ })).toHaveLength(1)
  })

  it('détaille le remboursement dans la fenêtre de confirmation', async () => {
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', amount: 480, status: 'COMPLETED' })],
    })

    await user.click(screen.getByRole('button', { name: /Rembourser/ }))

    expect(await screen.findByText('Confirmer le remboursement')).toBeInTheDocument()
    expect(
      screen.getByText(/rembourser 480 DT à Amine Ben Salah pour la réservation #r1 \(Renault Clio\)/),
    ).toBeInTheDocument()
  })

  it('rembourse le paiement et referme la fenêtre', async () => {
    const refundPayment = vi.fn().mockResolvedValue({ ok: true })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', status: 'COMPLETED' })],
      refundPayment,
    })

    await user.click(screen.getByRole('button', { name: /Rembourser/ }))
    await user.click(screen.getAllByRole('button', { name: 'Rembourser' }).at(-1)!)

    await waitFor(() => expect(refundPayment).toHaveBeenCalledWith('p1'))
    await waitFor(() => expect(screen.queryByText('Confirmer le remboursement')).not.toBeInTheDocument())
  })

  it('garde la fenêtre ouverte si le remboursement échoue', async () => {
    const refundPayment = vi.fn().mockResolvedValue({ ok: false, error: 'Refusé' })
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', reservationId: 'r1', status: 'COMPLETED' })],
      refundPayment,
    })

    await user.click(screen.getByRole('button', { name: /Rembourser/ }))
    await user.click(screen.getAllByRole('button', { name: 'Rembourser' }).at(-1)!)

    await waitFor(() => expect(refundPayment).toHaveBeenCalled())
    expect(screen.getByText('Confirmer le remboursement')).toBeInTheDocument()
  })

  it('referme la fenêtre sans rembourser', async () => {
    const refundPayment = vi.fn()
    const { user } = renderPage({
      payments: [makePayment({ id: 'p1', status: 'COMPLETED' })],
      refundPayment,
    })

    await user.click(screen.getByRole('button', { name: /Rembourser/ }))
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByText('Confirmer le remboursement')).not.toBeInTheDocument())
    expect(refundPayment).not.toHaveBeenCalled()
  })
})
