import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeAdmin, makeCar, makePayment, makeReservation, makeUser } from '../../../../test/factories'
import AdminExport from '../AdminExport'

vi.mock('../../../lib/exporters', () => ({
  downloadCSV: vi.fn(),
  downloadXLSX: vi.fn(),
  generateContractPDF: vi.fn(),
  generateInvoicePDF: vi.fn(),
}))

import { downloadCSV, downloadXLSX } from '../../../lib/exporters'

const NOW = '2026-03-15T10:00:00.000Z'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', pricePerDay: 120 })
const client = makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah', createdAt: NOW })
const reservation = makeReservation({ id: 'r1', userId: 'u1', carId: 'c1', total: 480, createdAt: NOW })
const payment = makePayment({ id: 'p1', reservationId: 'r1', amount: 480, date: NOW, stripeId: 'pi_1' })

const renderPage = (app = {}) =>
  renderWithProviders(<AdminExport />, {
    app: {
      currentUser: makeAdmin(),
      cars: [car],
      users: [client],
      reservations: [reservation],
      payments: [payment],
      ...app,
    },
  })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('pages/admin/AdminExport · sélection', () => {
  it('exporte les réservations du mois par défaut', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /Exporter \(1\)/ })).toBeInTheDocument()
    expect(screen.getByText('1 enregistrement(s)')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Client' })).toBeInTheDocument()
  })

  it('affiche l’aperçu des réservations avec données dénormalisées', () => {
    renderPage()

    expect(screen.getByText('R1')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('bascule sur les paiements', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Paiements' }))

    expect(await screen.findByRole('columnheader', { name: 'ID Stripe' })).toBeInTheDocument()
    expect(screen.getByText('pi_1')).toBeInTheDocument()
  })

  it('affiche un tiret pour un paiement orphelin', async () => {
    const { user } = renderPage({ payments: [makePayment({ id: 'p9', reservationId: 'inconnue', date: NOW })] })

    await user.click(screen.getByRole('button', { name: 'Paiements' }))

    expect(await screen.findAllByText('—')).not.toHaveLength(0)
  })

  it('bascule sur les clients (rôle CLIENT uniquement)', async () => {
    const { user } = renderPage({ users: [client, makeAdmin({ createdAt: NOW })] })

    await user.click(screen.getByRole('button', { name: 'Clients' }))

    expect(await screen.findByRole('columnheader', { name: 'Prénom' })).toBeInTheDocument()
    expect(screen.getByText('1 enregistrement(s)')).toBeInTheDocument()
    expect(screen.getByText('Oui')).toBeInTheDocument()
  })

  it('remplit les champs optionnels des clients par un tiret', async () => {
    const { user } = renderPage({
      users: [makeUser({ id: 'u2', phone: undefined, address: undefined, licenseNumber: undefined, active: false, createdAt: NOW })],
    })

    await user.click(screen.getByRole('button', { name: 'Clients' }))

    expect(await screen.findAllByText('—')).toHaveLength(3)
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('bascule sur les voitures et neutralise le filtre de période', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Voitures' }))

    expect(await screen.findByRole('columnheader', { name: 'Immatriculation' })).toBeInTheDocument()
    expect(screen.getByText("L'export des voitures inclut tout le parc.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout' })).toBeDisabled()
  })
})

describe('pages/admin/AdminExport · filtres de période', () => {
  it('ne retient que les enregistrements du jour', async () => {
    const { user } = renderPage({
      reservations: [
        makeReservation({ id: 'r1', createdAt: NOW }),
        makeReservation({ id: 'r2', createdAt: '2026-03-01T10:00:00.000Z' }),
      ],
    })

    await user.click(screen.getByRole('button', { name: "Aujourd'hui" }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Exporter \(1\)/ })).toBeInTheDocument())
  })

  it('retient les enregistrements des sept derniers jours', async () => {
    const { user } = renderPage({
      reservations: [
        makeReservation({ id: 'r1', createdAt: '2026-03-12T10:00:00.000Z' }),
        makeReservation({ id: 'r2', createdAt: '2026-01-01T10:00:00.000Z' }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Cette semaine' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Exporter \(1\)/ })).toBeInTheDocument())
  })

  it('retient tous les enregistrements avec la période "Tout"', async () => {
    const { user } = renderPage({
      reservations: [
        makeReservation({ id: 'r1', createdAt: '2020-01-01T10:00:00.000Z' }),
        makeReservation({ id: 'r2', createdAt: NOW }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Tout' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Exporter \(2\)/ })).toBeInTheDocument())
  })

  it('exclut les enregistrements sans date sur une période bornée', async () => {
    const { user } = renderPage({ reservations: [makeReservation({ id: 'r1', createdAt: '' })] })

    await user.click(screen.getByRole('button', { name: 'Ce mois' }))

    expect(await screen.findByText('Aucune donnée pour cette sélection.')).toBeInTheDocument()
  })
})

describe('pages/admin/AdminExport · génération du fichier', () => {
  it('refuse d’exporter une sélection vide', async () => {
    const { user } = renderPage({ reservations: [] })

    await user.click(screen.getByRole('button', { name: /Exporter \(0\)/ }))

    expect(toast.error).toHaveBeenCalledWith('Aucune donnée à exporter pour cette période.')
    expect(downloadCSV).not.toHaveBeenCalled()
  })

  it('exporte en CSV avec un nom de fichier daté', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /Exporter \(1\)/ }))
    await vi.advanceTimersByTimeAsync(900)

    expect(downloadCSV).toHaveBeenCalledWith(
      'rentcar-reservations-month-2026-03-15',
      expect.arrayContaining([expect.objectContaining({ ID: 'R1' })]),
    )
    expect(toast.success).toHaveBeenCalledWith('1 ligne(s) exportée(s) en CSV.')
  })

  it('exporte en Excel avec le libellé du jeu de données', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: /Exporter \(1\)/ }))
    await vi.advanceTimersByTimeAsync(900)

    expect(downloadXLSX).toHaveBeenCalledWith(
      'rentcar-reservations-month-2026-03-15',
      expect.any(Array),
      'Réservations',
    )
    expect(toast.success).toHaveBeenCalledWith('1 ligne(s) exportée(s) en XLSX.')
  })

  it('limite l’aperçu à cinq lignes et annonce le reste', () => {
    renderPage({
      reservations: Array.from({ length: 8 }, (_, i) =>
        makeReservation({ id: `r${i}`, userId: 'u1', carId: 'c1', createdAt: NOW }),
      ),
    })

    expect(screen.getByText('8 enregistrement(s)')).toBeInTheDocument()
    expect(screen.getByText('… et 3 ligne(s) de plus dans le fichier exporté.')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6) // en-tête + 5 lignes
  })
})
