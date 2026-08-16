import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makeReservation, makeUser } from '../../../../test/factories'
import MyReservations from '../MyReservations'

vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { getMyReservations: vi.fn(), cancel: vi.fn() },
}))
vi.mock('../../../api/contrat.api', () => ({
  contractsAPI: { getByReservation: vi.fn() },
}))

import { reservationsAPI } from '../../../api/reservations.api'
import { contractsAPI } from '../../../api/contrat.api'

const currentUser = makeUser({ id: 'u1' })
const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })

const renderPage = (app = {}) =>
  renderWithProviders(<MyReservations />, { app: { currentUser, cars: [car], ...app } })

beforeEach(() => {
  vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(axiosResponse([]))
  vi.mocked(reservationsAPI.cancel).mockResolvedValue(axiosResponse({ success: true }))
  vi.mocked(contractsAPI.getByReservation).mockRejectedValue(new Error('404'))
})

describe('pages/client/MyReservations · chargement', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(reservationsAPI.getMyReservations).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('affiche l’erreur et permet de réessayer', async () => {
    vi.mocked(reservationsAPI.getMyReservations).mockRejectedValue(new Error('500'))

    const { user } = renderPage()

    expect(await screen.findByText('Erreur lors du chargement des réservations')).toBeInTheDocument()

    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(axiosResponse([]))
    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(await screen.findByRole('heading', { name: 'Aucune réservation' })).toBeInTheDocument()
  })

  it('affiche un état vide quand il n’y a aucune réservation', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Aucune réservation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Découvrir les voitures/ })).toHaveAttribute('href', '/cars')
  })

  it('accepte l’enveloppe { value } du backend', async () => {
    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(
      axiosResponse({ value: [makeReservation({ id: 'r1', carId: 'c1' })] }),
    )

    renderPage()

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument()
  })

  it('recharge la liste sur un événement temps réel', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Aucune réservation' })
    expect(reservationsAPI.getMyReservations).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new CustomEvent('rentcar:data-updated', { detail: { kind: 'reservation' } }))
    await waitFor(() => expect(reservationsAPI.getMyReservations).toHaveBeenCalledTimes(2))

    window.dispatchEvent(new CustomEvent('rentcar:data-updated', { detail: { kind: 'car' } }))
    await new Promise((r) => setTimeout(r, 50))
    expect(reservationsAPI.getMyReservations).toHaveBeenCalledTimes(2)
  })
})

describe('pages/client/MyReservations · liste et filtres', () => {
  const reservations = [
    makeReservation({ id: 'r1', carId: 'c1', status: 'PENDING', totalAmount: 480 }),
    makeReservation({ id: 'r2', carId: 'c1', status: 'CONFIRMED' }),
    makeReservation({ id: 'r3', carId: 'c1', status: 'COMPLETED' }),
  ]

  beforeEach(() => {
    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(axiosResponse(reservations))
  })

  it('affiche chaque réservation avec sa voiture, ses dates et son montant', async () => {
    renderPage()

    expect(await screen.findAllByText('Renault Clio')).toHaveLength(3)
    expect(screen.getAllByText('480 DT').length).toBeGreaterThan(0)
    expect(screen.getByText(/#r1/)).toBeInTheDocument()
  })

  it('compte les réservations par onglet', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /Toutes \(3\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /En attente \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annulées \(0\)/ })).toBeInTheDocument()
  })

  it('filtre la liste au changement d’onglet', async () => {
    const { user } = renderPage()
    await screen.findAllByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Terminées \(1\)/ }))

    await waitFor(() => expect(screen.getAllByText('Renault Clio')).toHaveLength(1))
    expect(screen.getByRole('button', { name: /Donner mon avis/ })).toBeInTheDocument()
  })

  it('affiche un état vide pour un onglet sans réservation', async () => {
    const { user } = renderPage()
    await screen.findAllByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Annulées \(0\)/ }))

    expect(await screen.findByRole('heading', { name: 'Aucune réservation' })).toBeInTheDocument()
  })

  it('propose les bonnes actions selon le statut', async () => {
    renderPage()
    await screen.findAllByText('Renault Clio')

    expect(screen.getAllByRole('link', { name: /Détails/ })).toHaveLength(3)
    // PENDING + CONFIRMED peuvent être annulées
    expect(screen.getAllByRole('button', { name: /Annuler/ })).toHaveLength(2)
    // CONFIRMED donne accès au contrat
    expect(screen.getAllByRole('link', { name: /Contrat/ })).toHaveLength(1)
  })

  it('propose de signer le contrat quand il est en brouillon', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse({ status: 'DRAFT' }))

    renderPage()

    expect(await screen.findAllByRole('link', { name: /Signer/ })).not.toHaveLength(0)
  })

  it('propose de payer quand le contrat est signé', async () => {
    vi.mocked(contractsAPI.getByReservation).mockResolvedValue(axiosResponse({ status: 'SIGNED' }))

    renderPage()

    expect(await screen.findAllByRole('link', { name: /Payer/ })).not.toHaveLength(0)
  })

  it('ne charge pas de contrat pour les réservations en attente ou annulées', async () => {
    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(
      axiosResponse([
        makeReservation({ id: 'r1', status: 'PENDING' }),
        makeReservation({ id: 'r9', status: 'CANCELLED' }),
      ]),
    )

    renderPage()
    await screen.findAllByText(/#r/)

    expect(contractsAPI.getByReservation).not.toHaveBeenCalled()
  })
})

describe('pages/client/MyReservations · annulation', () => {
  beforeEach(() => {
    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(
      axiosResponse([makeReservation({ id: 'r1', carId: 'c1', status: 'PENDING' })]),
    )
  })

  const openCancel = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await screen.findByText('Renault Clio')
    await user.click(screen.getByRole('button', { name: /Annuler/ }))
    await screen.findByText('Annuler la réservation')
  }

  it('demande confirmation avant d’annuler', async () => {
    const { user } = renderPage()

    await openCancel(user)

    expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    expect(reservationsAPI.cancel).not.toHaveBeenCalled()
  })

  it('annule la réservation et recharge la liste', async () => {
    const { user } = renderPage()
    await openCancel(user)

    await user.click(screen.getByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(reservationsAPI.cancel).toHaveBeenCalledWith('r1'))
    expect(toast.success).toHaveBeenCalledWith('Réservation annulée.')
    expect(reservationsAPI.getMyReservations).toHaveBeenCalledTimes(2)
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(reservationsAPI.cancel).mockResolvedValue(
      axiosResponse({ success: false, message: 'Annulation impossible à moins de 24h' }),
    )
    const { user } = renderPage()
    await openCancel(user)

    await user.click(screen.getByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Annulation impossible à moins de 24h'))
  })

  it('affiche l’erreur réseau', async () => {
    vi.mocked(reservationsAPI.cancel).mockRejectedValue(new Error('Réseau indisponible'))
    const { user } = renderPage()
    await openCancel(user)

    await user.click(screen.getByRole('button', { name: 'Oui, annuler' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Réseau indisponible'))
  })

  it('referme la fenêtre sans annuler', async () => {
    const { user } = renderPage()
    await openCancel(user)

    const dialogCancel = screen.getAllByRole('button', { name: 'Annuler' }).at(-1)!
    await user.click(dialogCancel)

    await waitFor(() => expect(screen.queryByText('Annuler la réservation')).not.toBeInTheDocument())
    expect(reservationsAPI.cancel).not.toHaveBeenCalled()
  })
})

describe('pages/client/MyReservations · avis', () => {
  it('ouvre la fenêtre d’avis pour une location terminée', async () => {
    vi.mocked(reservationsAPI.getMyReservations).mockResolvedValue(
      axiosResponse([makeReservation({ id: 'r3', carId: 'c1', status: 'COMPLETED' })]),
    )
    const { user } = renderPage()
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Donner mon avis/ }))

    expect(await screen.findByText('Donner mon avis', { selector: 'h3' })).toBeInTheDocument()
  })
})
