import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeCar, makePayment, makeReservation, makeUser } from '../../../../test/factories'
import InspectionForm from '../InspectionForm'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/reservations.api', () => ({
  reservationsAPI: { start: vi.fn(), complete: vi.fn() },
}))

import { reservationsAPI } from '../../../api/reservations.api'

const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', plate: '123 TU 4567' })
const client = makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah' })
const reservation = makeReservation({ id: 'r1', carId: 'c1', userId: 'u1', total: 480, status: 'CONFIRMED' })

const renderPage = (mode: 'start' | 'complete' = 'start', app = {}) =>
  renderWithProviders(<InspectionForm mode={mode} />, {
    app: { cars: [car], users: [client], reservations: [reservation], ...app },
    route: '/admin/reservation/r1/start',
    path: '/admin/reservation/:id/start',
  })

const fill = async (user: ReturnType<typeof renderWithProviders>['user'], mileage = '21000', fuel = 'Plein') => {
  await user.type(screen.getByLabelText(/Kilométrage/), mileage)
  await user.selectOptions(screen.getByLabelText(/Niveau carburant/), fuel)
}

beforeEach(() => {
  vi.mocked(reservationsAPI.start).mockResolvedValue(axiosResponse({ success: true }))
  vi.mocked(reservationsAPI.complete).mockResolvedValue(axiosResponse({ success: true }))
})

describe('pages/admin/InspectionForm · contexte', () => {
  it('signale une réservation introuvable', () => {
    renderPage('start', { reservations: [] })

    expect(screen.getByRole('heading', { name: 'Réservation introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/admin/reservations')
  })

  it('affiche le rappel de la réservation', () => {
    renderPage()

    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('123 TU 4567')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('480 DT')).toBeInTheDocument()
  })

  it('affiche des valeurs de repli quand voiture et client sont inconnus', () => {
    renderPage('start', { cars: [], users: [] })

    expect(screen.getByText('Voiture inconnue')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('affiche le statut du paiement lié', () => {
    renderPage('start', { payments: [makePayment({ reservationId: 'r1', status: 'COMPLETED' })] })

    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })

  it('adapte les libellés au mode départ', () => {
    renderPage('start')

    expect(screen.getByRole('heading', { name: 'Démarrer la location' })).toBeInTheDocument()
    expect(screen.getByText('État des lieux de départ')).toBeInTheDocument()
    expect(screen.getByLabelText(/Kilométrage de départ/)).toBeInTheDocument()
  })

  it('adapte les libellés au mode retour', () => {
    renderPage('complete')

    expect(screen.getByRole('heading', { name: 'Terminer la location' })).toBeInTheDocument()
    expect(screen.getByText('État des lieux de retour')).toBeInTheDocument()
    expect(screen.getByLabelText(/Kilométrage de retour/)).toBeInTheDocument()
  })

  it('revient à la page précédente', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /Retour/ }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })
})

describe('pages/admin/InspectionForm · validation', () => {
  it('exige le kilométrage et le carburant', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    expect(await screen.findByText('Le kilométrage est obligatoire')).toBeInTheDocument()
    expect(screen.getByText('Le niveau de carburant est obligatoire')).toBeInTheDocument()
    expect(reservationsAPI.start).not.toHaveBeenCalled()
  })

  it('refuse un kilométrage nul ou négatif', async () => {
    const { user } = renderPage()

    await user.type(screen.getByLabelText(/Kilométrage/), '0')
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    expect(await screen.findByText('Le kilométrage doit être positif')).toBeInTheDocument()
    expect(reservationsAPI.start).not.toHaveBeenCalled()
  })

  it('valide un champ dès qu’il est quitté', async () => {
    const { user } = renderPage()

    await user.click(screen.getByLabelText(/Kilométrage/))
    await user.tab()

    expect(await screen.findByText('Le kilométrage est obligatoire')).toBeInTheDocument()
  })
})

describe('pages/admin/InspectionForm · soumission', () => {
  it('démarre la location avec les données saisies', async () => {
    const { user, app } = renderPage()

    await fill(user)
    await user.type(screen.getByLabelText(/Dégâts constatés au départ/), 'Rayure portière')
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    await waitFor(() =>
      expect(reservationsAPI.start).toHaveBeenCalledWith('r1', {
        mileageStart: 21000,
        fuelLevelStart: 'Plein',
        damagesAtStart: 'Rayure portière',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Location démarrée. Le véhicule est maintenant loué.')
    expect(app.loadReservations).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/admin/reservations')
  })

  it('termine la location avec les données de retour', async () => {
    const { user } = renderPage('complete')

    await fill(user, '21500', 'Moitié')
    await user.click(screen.getByRole('button', { name: /Terminer la location/ }))

    await waitFor(() =>
      expect(reservationsAPI.complete).toHaveBeenCalledWith('r1', {
        mileageEnd: 21500,
        fuelLevelEnd: 'Moitié',
        damagesAtEnd: '',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Location terminée. Le véhicule est de nouveau disponible.')
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(reservationsAPI.start).mockResolvedValue(axiosResponse({ success: false, message: 'Réservation déjà démarrée' }))
    const { user } = renderPage()

    await fill(user)
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Réservation déjà démarrée'))
    expect(navigate).not.toHaveBeenCalledWith('/admin/reservations')
  })

  it.each([
    [403, "Action non autorisée. Votre session a peut-être expiré ou vous n'avez pas les droits nécessaires."],
    [401, 'Session expirée. Veuillez vous reconnecter.'],
    [400, 'Demande invalide. Vérifiez les informations saisies.'],
    [500, 'Erreur serveur. Veuillez réessayer dans un instant.'],
  ])('traduit l’erreur HTTP %s en message métier', async (status, message) => {
    vi.mocked(reservationsAPI.start).mockRejectedValue({ response: { status } })
    const { user } = renderPage()

    await fill(user)
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message))
  })

  it('privilégie le message renvoyé par le serveur', async () => {
    vi.mocked(reservationsAPI.start).mockRejectedValue({
      response: { status: 500, data: { message: 'Véhicule déjà loué' } },
    })
    const { user } = renderPage()

    await fill(user)
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Véhicule déjà loué'))
  })

  it('affiche un message générique pour une erreur inconnue', async () => {
    vi.mocked(reservationsAPI.start).mockRejectedValue(new Error('boom'))
    const { user } = renderPage()

    await fill(user)
    await user.click(screen.getByRole('button', { name: /Démarrer la location/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Une erreur est survenue lors de l'opération."))
  })
})
