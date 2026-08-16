import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar } from '../../../../test/factories'
import AdminReservations from '../AdminReservations'

vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { getAll: vi.fn(), confirm: vi.fn(), cancel: vi.fn() },
}))

import { reservationsAPI } from '../../../api/reservations.api'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })

const apiReservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  carId: 'c1',
  clientId: 3,
  clientFirstName: 'Amine',
  clientLastName: 'Ben Salah',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  totalAmount: 480,
  status: 'PENDING',
  createdAt: '2026-02-20T09:00:00Z',
  ...overrides,
})

const renderPage = () => renderWithProviders(<AdminReservations />, { app: { cars: [car] } })

beforeEach(() => {
  vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([]))
  vi.mocked(reservationsAPI.confirm).mockResolvedValue(axiosResponse({ success: true }))
  vi.mocked(reservationsAPI.cancel).mockResolvedValue(axiosResponse({ success: true }))
})

describe('pages/admin/AdminReservations · chargement', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(reservationsAPI.getAll).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('affiche l’erreur et permet de réessayer', async () => {
    vi.mocked(reservationsAPI.getAll).mockRejectedValue(new Error('500'))

    const { user } = renderPage()

    expect(await screen.findByText('Erreur lors du chargement des réservations')).toBeInTheDocument()

    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([]))
    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(await screen.findByRole('heading', { name: 'Aucune réservation' })).toBeInTheDocument()
  })

  it('accepte l’enveloppe { value }', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse({ value: [apiReservation()] }))

    renderPage()

    expect(await screen.findByText('#r1')).toBeInTheDocument()
  })
})

describe('pages/admin/AdminReservations · liste', () => {
  it('affiche les informations de chaque réservation', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([apiReservation()]))

    renderPage()

    expect(await screen.findByText('#r1')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('retombe sur l’identifiant client quand le nom est absent', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(
      axiosResponse([apiReservation({ clientFirstName: null, clientLastName: null })]),
    )

    renderPage()

    expect(await screen.findByText('Client #3')).toBeInTheDocument()
  })

  it('trie les réservations de la plus récente à la plus ancienne', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(
      axiosResponse([
        apiReservation({ id: 'ancienne', createdAt: '2026-01-01T00:00:00Z' }),
        apiReservation({ id: 'recente', createdAt: '2026-06-01T00:00:00Z' }),
      ]),
    )

    renderPage()

    const ids = (await screen.findAllByText(/^#/)).map((el) => el.textContent)
    expect(ids).toEqual(['#recente', '#ancienne'])
  })

  it('filtre les réservations par onglet', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(
      axiosResponse([
        apiReservation({ id: 'r1', status: 'PENDING' }),
        apiReservation({ id: 'r2', status: 'COMPLETED' }),
      ]),
    )

    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: 'Terminées' }))

    await waitFor(() => expect(screen.queryByText('#r1')).not.toBeInTheDocument())
    expect(screen.getByText('#r2')).toBeInTheDocument()
  })

  it.each([
    ['PENDING', 'Confirmer'],
    ['CONFIRMED', 'Démarrer'],
    ['IN_PROGRESS', 'Terminer'],
  ])('propose l’action adaptée au statut %s', async (status, action) => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([apiReservation({ status })]))

    renderPage()

    expect(await screen.findByText(new RegExp(action))).toBeInTheDocument()
  })

  it('n’expose aucune action de gestion sur une réservation terminée', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([apiReservation({ status: 'COMPLETED' })]))

    renderPage()

    await screen.findByText('#r1')
    expect(screen.queryByRole('button', { name: /Confirmer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Annuler/ })).not.toBeInTheDocument()
  })
})

describe('pages/admin/AdminReservations · actions', () => {
  beforeEach(() => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(axiosResponse([apiReservation()]))
  })

  it('confirme une réservation et recharge la liste', async () => {
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Confirmer/ }))

    await waitFor(() => expect(reservationsAPI.confirm).toHaveBeenCalledWith('r1'))
    expect(toast.success).toHaveBeenCalledWith('Réservation confirmée. Contrat généré automatiquement.')
    expect(reservationsAPI.getAll).toHaveBeenCalledTimes(2)
  })

  it('affiche le refus métier lors de la confirmation', async () => {
    vi.mocked(reservationsAPI.confirm).mockResolvedValue(axiosResponse({ success: false, message: 'Voiture indisponible' }))
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Confirmer/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Voiture indisponible'))
  })

  it('affiche l’erreur réseau lors de la confirmation', async () => {
    vi.mocked(reservationsAPI.confirm).mockRejectedValue(new Error('500'))
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Confirmer/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur lors de la confirmation'))
  })

  it('annule une réservation après confirmation', async () => {
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Annuler/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(reservationsAPI.cancel).toHaveBeenCalledWith('r1'))
    expect(toast.success).toHaveBeenCalledWith('Réservation annulée.')
  })

  it('affiche le refus métier lors de l’annulation', async () => {
    vi.mocked(reservationsAPI.cancel).mockResolvedValue(axiosResponse({ success: false, message: 'Déjà démarrée' }))
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Annuler/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Déjà démarrée'))
  })

  it('affiche l’erreur réseau lors de l’annulation', async () => {
    vi.mocked(reservationsAPI.cancel).mockRejectedValue(new Error('500'))
    const { user } = renderPage()
    await screen.findByText('#r1')

    await user.click(screen.getByRole('button', { name: /Annuler/ }))
    await user.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'annulation"))
  })

  it('pointe vers le détail et les états des lieux', async () => {
    vi.mocked(reservationsAPI.getAll).mockResolvedValue(
      axiosResponse([apiReservation({ id: 'r2', status: 'CONFIRMED' })]),
    )

    renderPage()

    expect(await screen.findByRole('link', { name: /Démarrer/ })).toHaveAttribute('href', '/admin/reservation/r2/start')
    expect(screen.getAllByRole('link').at(-1)).toHaveAttribute('href', '/admin/reservation/r2')
  })
})
