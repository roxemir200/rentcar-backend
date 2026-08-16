import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../../api/cars.api', async () => ({ carsAPI: (await import('../../../test/mocks/api')).carsAPI }))
vi.mock('../../api/categories.api', async () => ({ categoriesAPI: (await import('../../../test/mocks/api')).categoriesAPI }))
vi.mock('../../api/reservations.api', async () => ({ reservationsAPI: (await import('../../../test/mocks/api')).reservationsAPI }))
vi.mock('../../api/payments.api', async () => ({ paymentsAPI: (await import('../../../test/mocks/api')).paymentsAPI }))
vi.mock('../../api/users.api', async () => ({ usersAPI: (await import('../../../test/mocks/api')).usersAPI }))
vi.mock('../../api/reviews.api', async () => ({ reviewsAPI: (await import('../../../test/mocks/api')).reviewsAPI }))
vi.mock('../../api/contrat.api', async () => ({ contractsAPI: (await import('../../../test/mocks/api')).contractsAPI }))
vi.mock('../../api/dashboard.api', async () => ({ dashboardAPI: (await import('../../../test/mocks/api')).dashboardAPI }))
vi.mock('../../api/notifications.api', async () => ({ notificationsAPI: (await import('../../../test/mocks/api')).notificationsAPI }))
vi.mock('../../api/calendar.api', async () => ({ calendarAPI: (await import('../../../test/mocks/api')).calendarAPI }))
vi.mock('../../api/axios', async () => ({ api: (await import('../../../test/mocks/api')).apiClient }))
vi.mock('../../api/auth.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/auth.api')>()
  return { toFrontendUser: actual.toFrontendUser, authAPI: (await import('../../../test/mocks/api')).authAPI }
})

import { toast } from 'sonner'
import { AppProvider, useApp } from '../AppContext'
import {
  apiClient, calendarAPI, carsAPI, categoriesAPI, contractsAPI, dashboardAPI,
  notificationsAPI, paymentsAPI, reservationsAPI, resetApiMocks, reviewsAPI, usersAPI,
} from '../../../test/mocks/api'
import { axiosResponse, makeAdmin, makeUser } from '../../../test/factories'

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

/** Connecte un utilisateur avant le montage du provider. */
const authenticate = (user = makeUser()) => {
  localStorage.setItem('token', 'jwt')
  localStorage.setItem('user', JSON.stringify(user))
}

const renderApp = async () => {
  const utils = renderHook(() => useApp(), { wrapper })
  await waitFor(() => expect(utils.result.current.carsLoading).toBe(false))
  return utils
}

const apiCar = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  brand: 'Renault',
  model: 'Clio',
  year: 2024,
  registrationNumber: '123 TU 4567',
  color: 'Blanc',
  mileage: 12000,
  seats: 5,
  fuelType: 'GASOLINE',
  transmission: 'MANUAL',
  dailyRate: 120,
  status: 'AVAILABLE',
  description: 'Citadine',
  categoryName: 'Économique',
  categoryId: 3,
  images: [],
  ...overrides,
})

beforeEach(() => {
  resetApiMocks()
})

describe('AppContext · chargement et mapping des voitures', () => {
  it('charge les voitures au montage et mappe les champs backend', async () => {
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar()]))

    const { result } = await renderApp()

    expect(carsAPI.getAll).toHaveBeenCalled()
    expect(result.current.cars[0]).toMatchObject({
      id: '1',
      plate: '123 TU 4567',
      pricePerDay: 120,
      category: 'Économique',
      categoryId: '3',
      fuel: 'Essence',
      transmission: 'Manuelle',
    })
  })

  it.each([
    ['GASOLINE', 'Essence'],
    ['DIESEL', 'Diesel'],
    ['HYBRID', 'Hybride'],
    ['ELECTRIC', 'Électrique'],
    ['INCONNU', 'Essence'],
  ])('traduit le carburant %s en %s', async (fuelType, expected) => {
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ fuelType })]))

    const { result } = await renderApp()

    expect(result.current.cars[0].fuel).toBe(expected)
  })

  it('traduit AUTOMATIC en transmission automatique', async () => {
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ transmission: 'AUTOMATIC' })]))

    const { result } = await renderApp()

    expect(result.current.cars[0].transmission).toBe('Automatique')
  })

  it('applique des valeurs par défaut sur une voiture incomplète', async () => {
    carsAPI.getAll.mockResolvedValue(axiosResponse([{ id: 2 }]))

    const { result } = await renderApp()

    expect(result.current.cars[0]).toMatchObject({
      id: '2', brand: '', model: '', year: 0, seats: 5, pricePerDay: 0, status: 'AVAILABLE',
    })
  })

  it('place l’image principale en tête, dédoublonne et préfixe les URLs relatives', async () => {
    carsAPI.getAll.mockResolvedValue(
      axiosResponse([
        apiCar({
          primaryImage: '/uploads/main.jpg',
          images: ['/uploads/main.jpg', 'https://cdn/x.jpg', '/uploads/second.jpg'],
        }),
      ]),
    )

    const { result } = await renderApp()

    expect(result.current.cars[0].images).toEqual([
      'http://localhost:8089/uploads/main.jpg',
      'https://cdn/x.jpg',
      'http://localhost:8089/uploads/second.jpg',
    ])
  })

  it('conserve les images en base64 telles quelles', async () => {
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ images: ['data:image/png;base64,AAA'] })]))

    const { result } = await renderApp()

    expect(result.current.cars[0].images).toEqual(['data:image/png;base64,AAA'])
  })

  it('accepte l’enveloppe { value } du backend', async () => {
    carsAPI.getAll.mockResolvedValue(axiosResponse({ value: [apiCar({ id: 42 })] }))

    const { result } = await renderApp()

    expect(result.current.cars).toHaveLength(1)
    expect(result.current.cars[0].id).toBe('42')
  })

  it('expose un message d’erreur quand le chargement échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    carsAPI.getAll.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    expect(result.current.carsError).toBe('Erreur lors du chargement des voitures')
    expect(result.current.cars).toEqual([])
  })

  it('réinitialise l’erreur lors d’un rechargement réussi', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    carsAPI.getAll.mockRejectedValueOnce(new Error('500'))

    const { result } = await renderApp()
    expect(result.current.carsError).not.toBeNull()

    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar()]))
    await act(async () => {
      await result.current.loadCars()
    })

    expect(result.current.carsError).toBeNull()
    expect(result.current.cars).toHaveLength(1)
  })

  it('charge les catégories et absorbe les erreurs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    categoriesAPI.getAll.mockResolvedValue(axiosResponse([{ id: '1', name: 'SUV' }]))

    const { result } = await renderApp()
    expect(result.current.categories).toHaveLength(1)

    categoriesAPI.getAll.mockRejectedValue(new Error('500'))
    await act(async () => {
      await result.current.loadCategories()
    })

    expect(result.current.categories).toHaveLength(1) // état précédent conservé
  })
})

describe('AppContext · chargements dépendants du rôle', () => {
  it('un client charge ses propres réservations', async () => {
    authenticate(makeUser({ role: 'CLIENT' }))
    reservationsAPI.getMyReservations.mockResolvedValue(
      axiosResponse([{ id: 5, clientId: 1, carId: 2, totalAmount: 480, status: 'PENDING' }]),
    )

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.reservations).toHaveLength(1))
    expect(reservationsAPI.getMyReservations).toHaveBeenCalled()
    expect(reservationsAPI.getAll).not.toHaveBeenCalled()
    expect(result.current.reservations[0]).toMatchObject({ id: '5', userId: '1', carId: '2', total: 480 })
  })

  it('un administrateur charge toutes les réservations', async () => {
    authenticate(makeAdmin())
    reservationsAPI.getAll.mockResolvedValue(axiosResponse([{ id: 5, userId: 3, carId: 2 }]))

    const { result } = await renderApp()

    await waitFor(() => expect(reservationsAPI.getAll).toHaveBeenCalled())
    expect(reservationsAPI.getMyReservations).not.toHaveBeenCalled()
    expect(result.current.reservations[0].userId).toBe('3')
  })

  it('mappe les paiements (identifiant externe, montant, date)', async () => {
    authenticate()
    paymentsAPI.getMyPayments.mockResolvedValue(
      axiosResponse([
        { id: 9, externalPaymentId: 'pi_1', reservationId: 5, amount: '480', status: 'COMPLETED', paymentDate: '2026-03-01' },
      ]),
    )

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.payments).toHaveLength(1))
    expect(result.current.payments[0]).toMatchObject({
      id: '9', stripeId: 'pi_1', reservationId: '5', amount: 480, status: 'COMPLETED', date: '2026-03-01',
    })
  })

  it('vide les paiements si l’appel échoue', async () => {
    authenticate()
    paymentsAPI.getMyPayments.mockRejectedValue(new Error('403'))

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.payments).toEqual([]))
  })

  it('seul un administrateur charge la liste des utilisateurs', async () => {
    authenticate(makeUser({ role: 'CLIENT' }))
    const client = await renderApp()
    await waitFor(() => expect(client.result.current.users).toEqual([]))
    expect(usersAPI.getAll).not.toHaveBeenCalled()
    client.unmount()

    localStorage.clear()
    authenticate(makeAdmin())
    usersAPI.getAll.mockResolvedValue(axiosResponse([{ id: 1, firstName: 'Sofia', phoneNumber: '99', isActive: true }]))

    const admin = await renderApp()

    await waitFor(() => expect(admin.result.current.users).toHaveLength(1))
    expect(admin.result.current.users[0]).toMatchObject({ id: '1', firstName: 'Sofia', phone: '99' })
  })

  it('ne charge pas les avis pour un administrateur', async () => {
    authenticate(makeAdmin())

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.reviews).toEqual([]))
    expect(reviewsAPI.getMyReviews).not.toHaveBeenCalled()
  })

  it('charge et mappe les avis d’un client', async () => {
    authenticate()
    reviewsAPI.getMyReviews.mockResolvedValue(
      axiosResponse([{ id: 3, clientId: 1, carId: 2, reservationId: 5, rating: 5, comment: 'Top', createdAt: '2026-03-06' }]),
    )

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.reviews).toHaveLength(1))
    expect(result.current.reviews[0]).toMatchObject({ id: '3', userId: '1', carId: '2', rating: 5, date: '2026-03-06' })
  })

  it('ne charge les contrats que pour un administrateur', async () => {
    authenticate(makeUser({ role: 'CLIENT' }))
    const client = await renderApp()
    await waitFor(() => expect(client.result.current.contracts).toEqual([]))
    expect(contractsAPI.getAll).not.toHaveBeenCalled()
    client.unmount()

    localStorage.clear()
    authenticate(makeAdmin())
    contractsAPI.getAll.mockResolvedValue(
      axiosResponse([{ id: 4, contractNumber: 'CONT-1', reservationId: 5, status: 'SIGNED', signedAt: '2026-03-01' }]),
    )

    const admin = await renderApp()

    await waitFor(() => expect(admin.result.current.contracts).toHaveLength(1))
    expect(admin.result.current.contracts[0]).toMatchObject({ id: '4', number: 'CONT-1', status: 'SIGNED' })
  })

  it('préfixe les identifiants de notifications serveur et lit l’état de lecture', async () => {
    authenticate(makeUser({ id: 'u1' }))
    notificationsAPI.getMyNotifications.mockResolvedValue(
      axiosResponse([{ id: 12, type: 'PAYMENT', title: 'Paiement reçu', message: 'Merci', isRead: true, createdAt: '2026-03-01' }]),
    )

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    expect(result.current.notifications[0]).toMatchObject({ id: 'server-12', userId: 'u1', read: true, type: 'PAYMENT' })
  })

  it('vide les notifications si l’appel échoue', async () => {
    authenticate()
    notificationsAPI.getMyNotifications.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.notifications).toEqual([]))
  })
})

describe('AppContext · tableau de bord et calendrier (admin)', () => {
  it('refuse les statistiques à un client', async () => {
    authenticate(makeUser({ role: 'CLIENT' }))

    const { result } = await renderApp()

    await expect(result.current.loadDashboardStats()).resolves.toBeNull()
    await expect(result.current.loadDashboardRevenue(2026)).resolves.toEqual([])
    await expect(result.current.loadDashboardTopCars(5)).resolves.toEqual([])
    await expect(result.current.loadCalendarReservations(2026, 3)).resolves.toEqual([])
    expect(dashboardAPI.getStats).not.toHaveBeenCalled()
  })

  it('charge les statistiques pour un administrateur', async () => {
    authenticate(makeAdmin())
    dashboardAPI.getStats.mockResolvedValue(axiosResponse({ data: { totalCars: 12 } }))

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.dashboardStats).toMatchObject({ totalCars: 12 }))
  })

  it('gère l’échec du chargement des statistiques', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    dashboardAPI.getStats.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await expect(result.current.loadDashboardStats()).resolves.toBeNull()
  })

  it('charge les revenus et le top des voitures', async () => {
    authenticate(makeAdmin())
    dashboardAPI.getRevenue.mockResolvedValue(axiosResponse([{ month: 1, revenue: 100 }]))
    dashboardAPI.getTopCars.mockResolvedValue(axiosResponse([{ carId: 1, count: 4 }]))

    const { result } = await renderApp()

    await waitFor(() => expect(result.current.dashboardRevenue).toHaveLength(1))
    await waitFor(() => expect(result.current.dashboardTopCars).toHaveLength(1))
    expect(dashboardAPI.getRevenue).toHaveBeenCalledWith(2026)
    expect(dashboardAPI.getTopCars).toHaveBeenCalledWith(5)
  })

  it('gère l’échec des revenus et du top des voitures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    dashboardAPI.getRevenue.mockRejectedValue(new Error('500'))
    dashboardAPI.getTopCars.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await expect(result.current.loadDashboardRevenue(2025)).resolves.toEqual([])
    await expect(result.current.loadDashboardTopCars(3)).resolves.toEqual([])
  })

  it('enrichit les réservations du calendrier avec voiture et client', async () => {
    authenticate(makeAdmin())
    calendarAPI.getReservations.mockResolvedValue(
      axiosResponse([{ id: 5, carId: 2, userId: 1, carBrand: 'Kia', carModel: 'Rio', clientFirstName: 'Amine', clientLastName: 'B' }]),
    )

    const { result } = await renderApp()

    let data: unknown[] = []
    await act(async () => {
      data = await result.current.loadCalendarReservations(2026, 3)
    })

    expect(calendarAPI.getReservations).toHaveBeenCalledWith(2026, 3)
    expect(data[0]).toMatchObject({ id: '5', carBrand: 'Kia', clientFirstName: 'Amine' })
    expect(result.current.calendarReservations).toHaveLength(1)
  })

  it('gère l’échec du chargement du calendrier', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    calendarAPI.getReservations.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await expect(result.current.loadCalendarReservations(2026, 3)).resolves.toEqual([])
  })
})

describe('AppContext · cycle de vie d’une réservation', () => {
  it('createReservation() ajoute la réservation en attente et notifie le client', async () => {
    authenticate(makeUser({ id: 'u1' }))

    const { result } = await renderApp()

    act(() => {
      result.current.createReservation({
        userId: 'u1', carId: 'c1', startDate: '2026-03-01', endDate: '2026-03-05',
        pickupLocation: 'Tunis', returnLocation: 'Tunis', total: 480,
      } as never)
    })

    expect(result.current.reservations[0]).toMatchObject({ status: 'PENDING', carId: 'c1' })
    expect(result.current.notifications[0]).toMatchObject({
      userId: 'u1', type: 'RESERVATION', title: 'Réservation créée',
    })
  })

  it('confirme une réservation : contrat, paiement, statut voiture et notification', async () => {
    authenticate(makeUser({ id: 'u1' }))
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ id: 1 })]))

    const { result } = await renderApp()

    let reservationId = ''
    act(() => {
      reservationId = result.current.createReservation({
        userId: 'u1', carId: '1', startDate: '2026-03-01', endDate: '2026-03-05',
        pickupLocation: 'T', returnLocation: 'T', total: 480,
      } as never).id
    })

    act(() => result.current.updateReservationStatus(reservationId, 'CONFIRMED'))

    await waitFor(() => expect(result.current.contracts).toHaveLength(1))
    expect(result.current.contracts[0]).toMatchObject({ reservationId, status: 'DRAFT' })
    expect(result.current.contracts[0].number).toMatch(/^CONT-\d{8}-\d{4}$/)
    expect(result.current.payments[0]).toMatchObject({ reservationId, amount: 480, status: 'PENDING' })
    expect(result.current.payments[0].stripeId).toMatch(/^pi_/)
    expect(result.current.cars[0].status).toBe('RESERVED')
    expect(result.current.notifications[0]).toMatchObject({ title: 'Réservation confirmée' })
  })

  it('ne duplique ni le contrat ni le paiement si la confirmation est rejouée', async () => {
    authenticate(makeUser({ id: 'u1' }))

    const { result } = await renderApp()

    let id = ''
    act(() => {
      id = result.current.createReservation({ userId: 'u1', carId: '1', total: 100 } as never).id
    })
    act(() => result.current.updateReservationStatus(id, 'CONFIRMED'))
    act(() => result.current.updateReservationStatus(id, 'CONFIRMED'))

    await waitFor(() => expect(result.current.contracts).toHaveLength(1))
    expect(result.current.payments).toHaveLength(1)
  })

  it.each([
    ['IN_PROGRESS', 'RENTED'],
    ['COMPLETED', 'AVAILABLE'],
    ['CANCELLED', 'AVAILABLE'],
  ] as const)('passe la voiture à %s → %s', async (status, carStatus) => {
    authenticate(makeUser({ id: 'u1' }))
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ id: 1, status: 'RESERVED' })]))

    const { result } = await renderApp()

    let id = ''
    act(() => {
      id = result.current.createReservation({ userId: 'u1', carId: '1', total: 100 } as never).id
    })
    act(() => result.current.updateReservationStatus(id, status))

    await waitFor(() => expect(result.current.cars[0].status).toBe(carStatus))
    expect(result.current.reservations[0].status).toBe(status)
  })

  it('enregistre les états des lieux fournis', async () => {
    authenticate(makeUser({ id: 'u1' }))

    const { result } = await renderApp()

    let id = ''
    act(() => {
      id = result.current.createReservation({ userId: 'u1', carId: '1', total: 100 } as never).id
    })
    act(() =>
      result.current.updateReservationStatus(id, 'IN_PROGRESS', {
        start: { mileage: 12000, fuel: 'Plein', damages: 'RAS' },
      }),
    )

    await waitFor(() => expect(result.current.reservations[0].startInspection).toMatchObject({ mileage: 12000 }))
  })

  it('ignore une réservation inconnue', async () => {
    authenticate()

    const { result } = await renderApp()

    act(() => result.current.updateReservationStatus('inexistant', 'CONFIRMED'))

    expect(result.current.contracts).toEqual([])
  })
})

describe('AppContext · contrats et paiements', () => {
  const setupConfirmed = async () => {
    authenticate(makeUser({ id: 'u1' }))
    const utils = await renderApp()
    let id = ''
    act(() => {
      id = utils.result.current.createReservation({ userId: 'u1', carId: '1', total: 480 } as never).id
    })
    act(() => utils.result.current.updateReservationStatus(id, 'CONFIRMED'))
    await waitFor(() => expect(utils.result.current.contracts).toHaveLength(1))
    return { ...utils, id }
  }

  it('signContract() signe le contrat et notifie le client', async () => {
    const { result, id } = await setupConfirmed()

    act(() => result.current.signContract(id))

    await waitFor(() => expect(result.current.contracts[0].status).toBe('SIGNED'))
    expect(result.current.contracts[0].signedAt).toEqual(expect.any(String))
    expect(result.current.notifications[0]).toMatchObject({ type: 'CONTRACT', title: 'Contrat signé' })
  })

  it('cancelContract() annule le contrat ciblé', async () => {
    const { result } = await setupConfirmed()
    const contractId = result.current.contracts[0].id

    act(() => result.current.cancelContract(contractId))

    await waitFor(() => expect(result.current.contracts[0].status).toBe('CANCELLED'))
  })

  it('payReservation() solde le paiement et notifie', async () => {
    const { result, id } = await setupConfirmed()

    act(() => result.current.payReservation(id))

    await waitFor(() => expect(result.current.payments[0].status).toBe('COMPLETED'))
    expect(result.current.notifications[0]).toMatchObject({ type: 'PAYMENT', title: 'Paiement réussi' })
  })

  it('addOrUpdatePayment() insère puis fusionne un paiement', async () => {
    authenticate()
    const { result } = await renderApp()

    act(() => result.current.addOrUpdatePayment({ id: 'p1', reservationId: 'r1', amount: 100, status: 'PENDING' } as never))
    expect(result.current.payments).toHaveLength(1)

    act(() => result.current.addOrUpdatePayment({ id: 'p1', reservationId: 'r1', amount: 100, status: 'COMPLETED' } as never))

    expect(result.current.payments).toHaveLength(1)
    expect(result.current.payments[0].status).toBe('COMPLETED')
  })

  it('refundPayment() rembourse, annule la réservation et libère la voiture', async () => {
    const { result, id } = await setupConfirmed()
    const paymentId = result.current.payments[0].id
    paymentsAPI.refund.mockResolvedValue(axiosResponse({ success: true }))

    let res: { ok: boolean } = { ok: false }
    await act(async () => {
      res = await result.current.refundPayment(paymentId)
    })

    expect(res.ok).toBe(true)
    expect(paymentsAPI.refund).toHaveBeenCalledWith(Number(paymentId))
    await waitFor(() => expect(result.current.payments[0].status).toBe('REFUNDED'))
    expect(result.current.reservations.find((r) => r.id === id)?.status).toBe('CANCELLED')
  })

  it('⚠ traite un 200 { success:false } comme un succès (comportement actuel)', async () => {
    // Le code retient `success || ok || isSuccess || statut 2xx` : le statut HTTP
    // l'emporte donc sur le refus métier. Ce test verrouille le comportement
    // observé ; il échouera volontairement le jour où la règle sera corrigée.
    const { result } = await setupConfirmed()
    paymentsAPI.refund.mockResolvedValue({ ...axiosResponse({ success: false, message: 'Déjà remboursé' }), status: 200 })

    let res: { ok: boolean; error?: string } = { ok: false }
    await act(async () => {
      res = await result.current.refundPayment(result.current.payments[0].id)
    })

    expect(res).toEqual({ ok: true })
    await waitFor(() => expect(result.current.payments[0].status).toBe('REFUNDED'))
  })

  it('refundPayment() remonte le refus métier sur une réponse non 2xx', async () => {
    const { result } = await setupConfirmed()
    paymentsAPI.refund.mockResolvedValue({ ...axiosResponse({ success: false, message: 'Déjà remboursé' }), status: 402 })

    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.refundPayment(result.current.payments[0].id)
    })

    expect(res).toEqual({ ok: false, error: 'Déjà remboursé' })
    expect(toast.error).toHaveBeenCalledWith('Remboursement impossible', { description: 'Déjà remboursé' })
    expect(result.current.payments[0].status).toBe('PENDING')
  })

  it('refundPayment() fournit un message par défaut si le backend n’en donne aucun', async () => {
    const { result } = await setupConfirmed()
    paymentsAPI.refund.mockResolvedValue({ ...axiosResponse({}), status: 500 })

    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.refundPayment(result.current.payments[0].id)
    })

    expect(res).toEqual({ ok: false, error: 'Échec du remboursement' })
  })

  it('refundPayment() gère l’erreur réseau', async () => {
    const { result } = await setupConfirmed()
    paymentsAPI.refund.mockRejectedValue({ response: { data: { message: 'Stripe indisponible' } } })

    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.refundPayment(result.current.payments[0].id)
    })

    expect(res).toEqual({ ok: false, error: 'Stripe indisponible' })
    expect(toast.error).toHaveBeenCalledWith('Remboursement échoué', { description: 'Stripe indisponible' })
  })
})

describe('AppContext · avis', () => {
  it('addReview() publie et ajoute l’avis en tête de liste', async () => {
    authenticate(makeUser({ id: 'u1' }))
    reviewsAPI.create.mockResolvedValue(
      axiosResponse({ success: true, data: { id: 7, clientId: 1, carId: 2, reservationId: 5, rating: 5, comment: 'Top' } }),
    )

    const { result } = await renderApp()

    await act(async () => {
      await result.current.addReview({ userId: 'u1', carId: '2', reservationId: '5', rating: 5, comment: 'Top' })
    })

    expect(reviewsAPI.create).toHaveBeenCalledWith({ reservationId: 5, rating: 5, comment: 'Top' })
    expect(result.current.reviews[0]).toMatchObject({ id: '7', rating: 5 })
  })

  it('addReview() signale le refus métier', async () => {
    authenticate()
    reviewsAPI.create.mockResolvedValue(axiosResponse({ success: false, message: 'Avis déjà publié' }))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.addReview({ userId: 'u1', carId: '2', reservationId: '5', rating: 5, comment: '' })
    })

    expect(toast.error).toHaveBeenCalledWith('Avis déjà publié')
    expect(result.current.reviews).toEqual([])
  })

  it('addReview() signale l’erreur réseau', async () => {
    authenticate()
    reviewsAPI.create.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.addReview({ userId: 'u1', carId: '2', reservationId: '5', rating: 5, comment: '' })
    })

    expect(toast.error).toHaveBeenCalledWith("Erreur lors de la publication de l'avis")
  })
})

describe('AppContext · notifications', () => {
  const withNotification = async () => {
    authenticate(makeUser({ id: 'u1' }))
    notificationsAPI.getMyNotifications.mockResolvedValue(
      axiosResponse([{ id: 12, type: 'SYSTEM', title: 'Info', message: 'M', isRead: false }]),
    )
    const utils = await renderApp()
    await waitFor(() => expect(utils.result.current.notifications).toHaveLength(1))
    return utils
  }

  it('markNotificationRead() met à jour immédiatement puis synchronise le serveur', async () => {
    const { result } = await withNotification()

    await act(async () => {
      await result.current.markNotificationRead('server-12')
    })

    expect(notificationsAPI.markAsRead).toHaveBeenCalledWith('12')
    expect(result.current.notifications[0].read).toBe(true)
  })

  it('markNotificationRead() annule la mise à jour si le serveur refuse', async () => {
    const { result } = await withNotification()
    notificationsAPI.markAsRead.mockRejectedValue(new Error('500'))

    await act(async () => {
      await result.current.markNotificationRead('server-12')
    })

    await waitFor(() => expect(result.current.notifications[0].read).toBe(false))
  })

  it('markAllRead() marque toutes les notifications de l’utilisateur', async () => {
    const { result } = await withNotification()

    await act(async () => {
      await result.current.markAllRead()
    })

    expect(notificationsAPI.markAllAsRead).toHaveBeenCalled()
    expect(result.current.notifications.every((n) => n.read)).toBe(true)
  })

  it('markAllRead() recharge depuis le serveur en cas d’échec', async () => {
    const { result } = await withNotification()
    notificationsAPI.markAllAsRead.mockRejectedValue(new Error('500'))
    notificationsAPI.getMyNotifications.mockClear()

    await act(async () => {
      await result.current.markAllRead()
    })

    expect(notificationsAPI.getMyNotifications).toHaveBeenCalled()
  })

  it('deleteNotification() retire la notification et appelle le serveur', async () => {
    const { result } = await withNotification()

    await act(async () => {
      await result.current.deleteNotification('server-12')
    })

    expect(notificationsAPI.deleteNotification).toHaveBeenCalledWith('12')
    expect(result.current.notifications).toEqual([])
  })

  it('deleteNotification() restaure la liste en cas d’échec', async () => {
    const { result } = await withNotification()
    notificationsAPI.deleteNotification.mockRejectedValue(new Error('500'))

    await act(async () => {
      await result.current.deleteNotification('server-12')
    })

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
  })
})

describe('AppContext · administration des utilisateurs', () => {
  const withUsers = async () => {
    authenticate(makeAdmin())
    usersAPI.getAll.mockResolvedValue(axiosResponse([{ id: 1, firstName: 'Sofia', role: 'CLIENT', isActive: true }]))
    const utils = await renderApp()
    await waitFor(() => expect(utils.result.current.users).toHaveLength(1))
    return utils
  }

  it('toggleUserActive() inverse l’état d’activation', async () => {
    const { result } = await withUsers()

    act(() => result.current.toggleUserActive('1'))
    expect(result.current.users[0].active).toBe(false)

    act(() => result.current.toggleUserActive('1'))
    expect(result.current.users[0].active).toBe(true)
  })

  it('changeUserRole() modifie le rôle', async () => {
    const { result } = await withUsers()

    act(() => result.current.changeUserRole('1', 'ADMIN'))

    expect(result.current.users[0].role).toBe('ADMIN')
  })

  it('n’altère pas les autres utilisateurs', async () => {
    authenticate(makeAdmin())
    usersAPI.getAll.mockResolvedValue(
      axiosResponse([{ id: 1, isActive: true, role: 'CLIENT' }, { id: 2, isActive: true, role: 'CLIENT' }]),
    )
    const { result } = await renderApp()
    await waitFor(() => expect(result.current.users).toHaveLength(2))

    act(() => result.current.toggleUserActive('1'))

    expect(result.current.users[1].active).toBe(true)
  })
})

describe('AppContext · gestion du parc (admin)', () => {
  it('saveCar() crée une nouvelle voiture et recharge la liste', async () => {
    authenticate(makeAdmin())
    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCar({
        id: '', brand: 'Kia', model: 'Rio', year: 2025, plate: '1 TU 1', color: 'Noir', mileage: 0,
        seats: 5, fuel: 'Diesel', transmission: 'Automatique', pricePerDay: 90, status: 'AVAILABLE',
        description: '', category: 'Économique', categoryId: '3', images: [],
      })
    })

    expect(carsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Kia', fuelType: 'DIESEL', transmission: 'AUTOMATIC', dailyRate: 90, categoryId: 3 }),
    )
    expect(carsAPI.update).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Voiture enregistrée avec succès !')
  })

  it('saveCar() met à jour une voiture existante', async () => {
    authenticate(makeAdmin())
    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCar({
        id: '7', brand: 'Kia', fuel: 'Électrique', transmission: 'Manuelle', images: [], categoryId: '',
      } as never)
    })

    expect(carsAPI.update).toHaveBeenCalledWith('7', expect.objectContaining({ fuelType: 'ELECTRIC', transmission: 'MANUAL', categoryId: null }))
    expect(carsAPI.create).not.toHaveBeenCalled()
  })

  it('saveCar() téléverse les images en base64 avant l’enregistrement', async () => {
    authenticate(makeAdmin())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: async () => new Blob(['x'], { type: 'image/jpeg' }) }))
    apiClient.post.mockResolvedValue(axiosResponse({ data: '/uploads/new.jpg' }))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCar({
        id: '', brand: 'Kia', fuel: 'Essence', transmission: 'Manuelle', categoryId: '1',
        images: ['data:image/jpeg;base64,AAA', 'https://cdn/keep.jpg'],
      } as never)
    })

    expect(apiClient.post).toHaveBeenCalledWith('/admin/upload-image', expect.any(FormData), expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }))
    expect(carsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrls: ['/uploads/new.jpg', 'https://cdn/keep.jpg'] }),
    )
  })

  it('saveCar() signale l’échec de l’enregistrement', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    carsAPI.create.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCar({ id: '', images: [], fuel: 'Essence', transmission: 'Manuelle' } as never)
    })

    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'enregistrement")
  })

  it('deleteCar() supprime puis recharge', async () => {
    authenticate(makeAdmin())
    const { result } = await renderApp()
    carsAPI.getAll.mockClear()

    await act(async () => {
      await result.current.deleteCar('7')
    })

    expect(carsAPI.delete).toHaveBeenCalledWith('7')
    expect(carsAPI.getAll).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Voiture supprimée avec succès !')
  })

  it('deleteCar() signale l’échec', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    carsAPI.delete.mockRejectedValue(new Error('409'))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.deleteCar('7')
    })

    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la suppression')
  })

  it('saveCategory() crée ou met à jour selon l’identifiant', async () => {
    authenticate(makeAdmin())
    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCategory({ id: '', name: 'SUV' } as never)
    })
    expect(categoriesAPI.create).toHaveBeenCalled()

    await act(async () => {
      await result.current.saveCategory({ id: '3', name: 'SUV' } as never)
    })
    expect(categoriesAPI.update).toHaveBeenCalledWith('3', expect.objectContaining({ name: 'SUV' }))
  })

  it('saveCategory() signale l’échec', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    categoriesAPI.create.mockRejectedValue(new Error('500'))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.saveCategory({ id: '', name: 'SUV' } as never)
    })

    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'enregistrement")
  })

  it('deleteCategory() supprime et signale les erreurs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authenticate(makeAdmin())
    const { result } = await renderApp()

    await act(async () => {
      await result.current.deleteCategory('3')
    })
    expect(categoriesAPI.delete).toHaveBeenCalledWith('3')
    expect(toast.success).toHaveBeenCalledWith('Catégorie supprimée avec succès !')

    categoriesAPI.delete.mockRejectedValue(new Error('409'))
    await act(async () => {
      await result.current.deleteCategory('3')
    })
    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la suppression')
  })
})

describe('AppContext · sélecteurs', () => {
  it('getCar() et getUser() retrouvent une entité ou undefined', async () => {
    authenticate(makeAdmin())
    carsAPI.getAll.mockResolvedValue(axiosResponse([apiCar({ id: 1 })]))
    usersAPI.getAll.mockResolvedValue(axiosResponse([{ id: 4, firstName: 'Sofia' }]))

    const { result } = await renderApp()
    await waitFor(() => expect(result.current.users).toHaveLength(1))

    expect(result.current.getCar('1')?.brand).toBe('Renault')
    expect(result.current.getCar('999')).toBeUndefined()
    expect(result.current.getUser('4')?.firstName).toBe('Sofia')
    expect(result.current.getUser('999')).toBeUndefined()
  })

  it('getContractByReservation() et getPaymentByReservation() ciblent la bonne réservation', async () => {
    authenticate(makeUser({ id: 'u1' }))
    const { result } = await renderApp()

    let id = ''
    act(() => {
      id = result.current.createReservation({ userId: 'u1', carId: '1', total: 480 } as never).id
    })
    act(() => result.current.updateReservationStatus(id, 'CONFIRMED'))
    await waitFor(() => expect(result.current.contracts).toHaveLength(1))

    expect(result.current.getContractByReservation(id)).toBeDefined()
    expect(result.current.getPaymentByReservation(id)?.amount).toBe(480)
    expect(result.current.getContractByReservation('autre')).toBeUndefined()
  })

  it('getCarRating() calcule la moyenne et le nombre d’avis', async () => {
    authenticate(makeUser({ id: 'u1' }))
    reviewsAPI.getMyReviews.mockResolvedValue(
      axiosResponse([
        { id: 1, carId: 2, rating: 5 },
        { id: 2, carId: 2, rating: 4 },
        { id: 3, carId: 9, rating: 1 },
      ]),
    )

    const { result } = await renderApp()
    await waitFor(() => expect(result.current.reviews).toHaveLength(3))

    expect(result.current.getCarRating('2')).toEqual({ avg: 4.5, count: 2 })
    expect(result.current.getCarRating('inconnue')).toEqual({ avg: 0, count: 0 })
  })

  it('setContracts() remplace la liste des contrats', async () => {
    authenticate(makeAdmin())
    const { result } = await renderApp()

    act(() => result.current.setContracts([{ id: 'ct9', number: 'N', reservationId: 'r1', status: 'SIGNED' }]))

    expect(result.current.contracts).toHaveLength(1)
  })
})
