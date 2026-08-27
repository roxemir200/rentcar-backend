import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { carsAPI, paymentsAPI, resetApiMocks } from '../../../test/mocks/api'
import { axiosResponse, makeUser } from '../../../test/factories'
import { MockEventSource } from '../../../test/mocks/event-source'

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

const authenticate = (user = makeUser({ id: 'u1' })) => {
  localStorage.setItem('token', 'jwt-sse')
  localStorage.setItem('user', JSON.stringify(user))
}

const renderApp = async () => {
  const utils = renderHook(() => useApp(), { wrapper })
  await waitFor(() => expect(utils.result.current.carsLoading).toBe(false))
  return utils
}

const stream = () => MockEventSource.last!

beforeEach(() => {
  resetApiMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AppContext · connexion SSE', () => {
  it('n’ouvre aucun flux tant que personne n’est connecté', async () => {
    await renderApp()

    expect(MockEventSource.instances).toHaveLength(0)
  })

  it('n’ouvre aucun flux si le token a disparu', async () => {
    authenticate()
    localStorage.removeItem('token')

    await renderApp()

    expect(MockEventSource.instances).toHaveLength(0)
  })

  it('ouvre le flux de notifications avec le token en paramètre', async () => {
    authenticate()

    await renderApp()

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    expect(stream().url).toBe('http://localhost:8089/api/notifications/stream?token=jwt-sse')
  })

  /**
   * `localStorage` est réinscriptible par n'importe quel script du domaine :
   * un jeton porteur d'un `&` ne serait plus une valeur mais un second
   * paramètre, et l'URL du flux cesserait d'être celle qu'on croit. Mieux
   * vaut aucune connexion qu'une connexion vers autre chose.
   */
  it('n’ouvre aucun flux si le token stocké a été altéré', async () => {
    authenticate()
    localStorage.setItem('token', 'jwt&url=https://ailleurs.invalid')

    await renderApp()

    expect(MockEventSource.instances).toHaveLength(0)
  })

  it('ferme le flux au démontage', async () => {
    authenticate()

    const { unmount } = await renderApp()
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const es = stream()

    unmount()

    expect(es.closed).toBe(true)
  })

  it('ferme le flux à la déconnexion', async () => {
    authenticate()

    const { result } = await renderApp()
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const es = stream()

    act(() => result.current.logout())

    await waitFor(() => expect(es.closed).toBe(true))
  })
})

describe('AppContext · événements temps réel', () => {
  const setup = async () => {
    authenticate()
    const utils = await renderApp()
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    return utils
  }

  it('ajoute un paiement inconnu reçu par le flux', async () => {
    const { result } = await setup()

    act(() => stream().emit('payment.updated', { id: 77, reservationId: 5, amount: 480, status: 'COMPLETED' }))

    await waitFor(() => expect(result.current.payments).toHaveLength(1))
    expect(result.current.payments[0]).toMatchObject({ id: '77', status: 'COMPLETED' })
  })

  it('fusionne un paiement déjà connu', async () => {
    authenticate()
    paymentsAPI.getMyPayments.mockResolvedValue(
      axiosResponse([{ id: 77, reservationId: 5, amount: 480, status: 'PENDING' }]),
    )
    const { result } = await renderApp()
    await waitFor(() => expect(result.current.payments).toHaveLength(1))

    act(() => stream().emit('payment.updated', { id: 77, reservationId: 5, amount: 480, status: 'COMPLETED' }))

    await waitFor(() => expect(result.current.payments[0].status).toBe('COMPLETED'))
    expect(result.current.payments).toHaveLength(1)
  })

  it('prévient les pages autonomes via un événement navigateur', async () => {
    const { result } = await setup()
    const listener = vi.fn()
    window.addEventListener('rentcar:data-updated', listener)

    act(() => stream().emit('payment.updated', { id: 77, reservationId: 5, amount: 1, status: 'COMPLETED' }))

    await waitFor(() => expect(listener).toHaveBeenCalled())
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ kind: 'payment', id: '77' })
    window.removeEventListener('rentcar:data-updated', listener)
    expect(result.current.payments).toHaveLength(1)
  })

  it('ajoute puis fusionne une réservation reçue par le flux', async () => {
    const { result } = await setup()

    act(() => stream().emit('reservation.updated', { id: 5, userId: 1, carId: 2, status: 'CONFIRMED' }))
    await waitFor(() => expect(result.current.reservations).toHaveLength(1))

    act(() => stream().emit('reservation.updated', { id: 5, userId: 1, carId: 2, status: 'IN_PROGRESS' }))

    await waitFor(() => expect(result.current.reservations[0].status).toBe('IN_PROGRESS'))
    expect(result.current.reservations).toHaveLength(1)
  })

  it('ajoute puis fusionne une voiture reçue par le flux', async () => {
    authenticate()
    carsAPI.getAll.mockResolvedValue(axiosResponse([{ id: 2, brand: 'Kia', status: 'AVAILABLE' }]))
    const { result } = await renderApp()
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))

    act(() => stream().emit('car.updated', { id: 2, brand: 'Kia', status: 'RENTED' }))
    await waitFor(() => expect(result.current.cars[0].status).toBe('RENTED'))

    act(() => stream().emit('car.updated', { id: 9, brand: 'Peugeot', status: 'AVAILABLE' }))

    await waitFor(() => expect(result.current.cars).toHaveLength(2))
  })

  it('ajoute une notification poussée par le serveur', async () => {
    const { result } = await setup()

    act(() =>
      stream().emit('notification', {
        id: 55, type: 'SYSTEM', title: 'Maintenance', message: 'Prévue ce soir', isRead: false,
      }),
    )

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    expect(result.current.notifications[0]).toMatchObject({ id: 'server-55', userId: 'u1', read: false })
  })

  it('ignore les doublons de notification', async () => {
    const { result } = await setup()
    const payload = { id: 55, type: 'SYSTEM', title: 'Maintenance', message: 'M' }

    act(() => stream().emit('notification', payload))
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    act(() => stream().emit('notification', payload))

    expect(result.current.notifications).toHaveLength(1)
  })

  it.each([
    ['CONTRACT', 'Contrat signé', 'success'],
    ['PAYMENT', 'Paiement accepté', 'success'],
    ['PAYMENT', 'Remboursement effectué', 'success'],
    ['RESERVATION', 'Réservation confirmée', 'success'],
    ['RESERVATION', 'Location démarrée', 'success'],
    ['RESERVATION', 'Réservation annulée', 'error'],
    ['PAYMENT', 'Paiement échoué', 'error'],
    ['SYSTEM', 'Information', 'info'],
  ] as const)('affiche un toast %s "%s" en %s', async (type, title, level) => {
    await setup()

    act(() => stream().emit('notification', { id: Math.floor(Math.random() * 1e6), type, title, message: 'Détail' }))

    await waitFor(() => expect(toast[level]).toHaveBeenCalledWith(title, expect.objectContaining({ description: 'Détail' })))
  })

  it('n’affiche pas de toast pour sa propre demande de réservation', async () => {
    await setup()

    act(() =>
      stream().emit('notification', { id: 60, type: 'RESERVATION', title: 'Réservation en attente', message: 'M' }),
    )

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('génère un identifiant local si le serveur n’en fournit pas', async () => {
    const { result } = await setup()

    act(() => stream().emit('notification', { type: 'SYSTEM', title: 'Sans id', message: 'M' }))

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    expect(result.current.notifications[0].id).toMatch(/^n\d+$/)
  })
})

describe('AppContext · résilience du flux', () => {
  it('reconnecte avec un délai exponentiel après une erreur', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    authenticate()

    renderHook(() => useApp(), { wrapper })
    await vi.waitFor(() => expect(MockEventSource.instances).toHaveLength(1))

    act(() => stream().fail())
    expect(MockEventSource.instances[0].closed).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(MockEventSource.instances).toHaveLength(2)

    act(() => stream().fail())
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(MockEventSource.instances).toHaveLength(3)
  })

  it('espace les tentatives à 10 minutes après 5 échecs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    authenticate()

    renderHook(() => useApp(), { wrapper })
    await vi.waitFor(() => expect(MockEventSource.instances).toHaveLength(1))

    // 5 tentatives courtes (2s, 4s, 8s, 16s, 32s)
    for (const delay of [2000, 4000, 8000, 16000, 32000]) {
      act(() => stream().fail())
      await act(async () => {
        vi.advanceTimersByTime(delay)
      })
    }
    expect(MockEventSource.instances).toHaveLength(6)

    act(() => stream().fail())
    await act(async () => {
      vi.advanceTimersByTime(60000)
    })
    expect(MockEventSource.instances).toHaveLength(6) // pas de reconnexion rapide

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })
    expect(MockEventSource.instances).toHaveLength(7)
  })

  it('réinitialise le compteur de tentatives quand la connexion s’ouvre', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    authenticate()

    renderHook(() => useApp(), { wrapper })
    await vi.waitFor(() => expect(MockEventSource.instances).toHaveLength(1))

    act(() => stream().fail())
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    act(() => stream().open())

    act(() => stream().fail())
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(MockEventSource.instances).toHaveLength(3)
  })
})
