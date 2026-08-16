import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '../axios'
import { calendarAPI } from '../calendar.api'
import { carsAPI } from '../cars.api'
import { categoriesAPI } from '../categories.api'
import { contractsAPI } from '../contrat.api'
import { dashboardAPI } from '../dashboard.api'
import { notificationsAPI } from '../notifications.api'
import { paymentsAPI } from '../payments.api'
import { recommendationsAPI } from '../recommendations.api'
import { reservationsAPI } from '../reservations.api'
import { reviewsAPI } from '../reviews.api'
import { usersAPI } from '../users.api'

/**
 * Les services de ressources sont des adaptateurs fins : le contrat qu'ils
 * doivent respecter est « bon verbe HTTP + bonne URL + bon corps ».
 * On le vérifie de façon exhaustive et tabulaire.
 */

type HttpMethod = 'get' | 'post' | 'put' | 'delete'

interface Case {
  name: string
  run: () => Promise<unknown>
  method: HttpMethod
  url: string
  body?: unknown
}

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(api)
  mock.onAny().reply(200, { success: true, data: [] })
})

afterEach(() => {
  mock.restore()
})

const runCases = (title: string, cases: Case[]) => {
  describe(title, () => {
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      const res = (await c.run()) as { status: number }

      const entry = mock.history[c.method][0]
      expect(entry, `aucune requête ${c.method.toUpperCase()} enregistrée`).toBeDefined()
      expect(entry.url).toBe(c.url)
      if (c.body !== undefined) expect(JSON.parse(entry.data)).toEqual(c.body)
      // Les services renvoient la réponse axios brute (non déballée)
      expect(res.status).toBe(200)
    })
  })
}

runCases('api/cars', [
  { name: 'getAll → GET /cars', run: () => carsAPI.getAll(), method: 'get', url: '/cars' },
  { name: 'getAvailable → GET /cars/available', run: () => carsAPI.getAvailable(), method: 'get', url: '/cars/available' },
  { name: 'getById → GET /cars/:id', run: () => carsAPI.getById(7), method: 'get', url: '/cars/7' },
  { name: 'create → POST /admin/cars', run: () => carsAPI.create({ brand: 'Kia' }), method: 'post', url: '/admin/cars', body: { brand: 'Kia' } },
  { name: 'update → PUT /admin/cars/:id', run: () => carsAPI.update(7, { brand: 'Kia' }), method: 'put', url: '/admin/cars/7', body: { brand: 'Kia' } },
  { name: 'delete → DELETE /admin/cars/:id', run: () => carsAPI.delete(7), method: 'delete', url: '/admin/cars/7' },
  { name: 'getImages → GET /cars/:id/images', run: () => carsAPI.getImages(7), method: 'get', url: '/cars/7/images' },
  { name: 'getPrimaryImage → GET /cars/:id/primary-image', run: () => carsAPI.getPrimaryImage(7), method: 'get', url: '/cars/7/primary-image' },
  { name: 'addImage → POST /admin/cars/:id/images', run: () => carsAPI.addImage(7, { url: 'x' }), method: 'post', url: '/admin/cars/7/images', body: { url: 'x' } },
  { name: 'setPrimaryImage → PUT /admin/images/:id/set-primary', run: () => carsAPI.setPrimaryImage(3), method: 'put', url: '/admin/images/3/set-primary' },
  { name: 'deleteImage → DELETE /admin/images/:id', run: () => carsAPI.deleteImage(3), method: 'delete', url: '/admin/images/3' },
])

runCases('api/categories', [
  { name: 'getAll → GET /categories', run: () => categoriesAPI.getAll(), method: 'get', url: '/categories' },
  { name: 'getById → GET /categories/:id', run: () => categoriesAPI.getById(2), method: 'get', url: '/categories/2' },
  { name: 'create → POST /categories', run: () => categoriesAPI.create({ name: 'SUV' }), method: 'post', url: '/categories', body: { name: 'SUV' } },
  { name: 'update → PUT /categories/:id', run: () => categoriesAPI.update(2, { name: 'SUV' }), method: 'put', url: '/categories/2', body: { name: 'SUV' } },
  { name: 'delete → DELETE /categories/:id', run: () => categoriesAPI.delete(2), method: 'delete', url: '/categories/2' },
])

runCases('api/reservations', [
  { name: 'create → POST /reservations', run: () => reservationsAPI.create({ carId: 1 }), method: 'post', url: '/reservations', body: { carId: 1 } },
  { name: 'getMyReservations → GET /reservations/my-reservations', run: () => reservationsAPI.getMyReservations(), method: 'get', url: '/reservations/my-reservations' },
  { name: 'getById → GET /reservations/:id', run: () => reservationsAPI.getById(4), method: 'get', url: '/reservations/4' },
  { name: 'cancel → PUT /reservations/:id/cancel', run: () => reservationsAPI.cancel(4), method: 'put', url: '/reservations/4/cancel' },
  { name: 'getAll (admin) → GET /admin/reservations', run: () => reservationsAPI.getAll(), method: 'get', url: '/admin/reservations' },
  { name: 'confirm (admin) → PUT /admin/reservations/:id/confirm', run: () => reservationsAPI.confirm(4), method: 'put', url: '/admin/reservations/4/confirm' },
  { name: 'start (admin) → PUT /admin/reservations/:id/start', run: () => reservationsAPI.start(4, { mileage: 100 }), method: 'put', url: '/admin/reservations/4/start', body: { mileage: 100 } },
  { name: 'complete (admin) → PUT /admin/reservations/:id/complete', run: () => reservationsAPI.complete(4, { mileage: 900 }), method: 'put', url: '/admin/reservations/4/complete', body: { mileage: 900 } },
])

runCases('api/payments', [
  { name: 'create → POST /payments/create-intent', run: () => paymentsAPI.create({ reservationId: 1 }), method: 'post', url: '/payments/create-intent', body: { reservationId: 1 } },
  { name: 'getByReservation → GET /payments/reservation/:id', run: () => paymentsAPI.getByReservation(1), method: 'get', url: '/payments/reservation/1' },
  { name: 'getMyPayments → GET /payments/my-payments', run: () => paymentsAPI.getMyPayments(), method: 'get', url: '/payments/my-payments' },
  { name: 'getAll (admin) → GET /admin/payments', run: () => paymentsAPI.getAll(), method: 'get', url: '/admin/payments' },
  { name: 'refund (admin) → POST /admin/payments/:id/refund', run: () => paymentsAPI.refund(1), method: 'post', url: '/admin/payments/1/refund' },
])

runCases('api/contracts', [
  { name: 'sign → PUT /contracts/:id/sign', run: () => contractsAPI.sign(2), method: 'put', url: '/contracts/2/sign' },
  { name: 'getMy → GET /contracts/my', run: () => contractsAPI.getMy(), method: 'get', url: '/contracts/my' },
  { name: 'getByReservation → GET /contracts/reservation/:id', run: () => contractsAPI.getByReservation(2), method: 'get', url: '/contracts/reservation/2' },
  { name: 'getById → GET /contracts/:id', run: () => contractsAPI.getById(2), method: 'get', url: '/contracts/2' },
  { name: 'getAll (admin) → GET /admin/contracts', run: () => contractsAPI.getAll(), method: 'get', url: '/admin/contracts' },
  { name: 'cancel (admin) → PUT /admin/contracts/:id/cancel', run: () => contractsAPI.cancel(2), method: 'put', url: '/admin/contracts/2/cancel' },
])

runCases('api/reviews', [
  { name: 'create → POST /reviews', run: () => reviewsAPI.create({ rating: 5 }), method: 'post', url: '/reviews', body: { rating: 5 } },
  { name: 'getByCar → GET /reviews/car/:id', run: () => reviewsAPI.getByCar(1), method: 'get', url: '/reviews/car/1' },
  { name: 'getMyReviews → GET /reviews/my-reviews', run: () => reviewsAPI.getMyReviews(), method: 'get', url: '/reviews/my-reviews' },
  { name: 'getAverageRating → GET /reviews/car/:id/average', run: () => reviewsAPI.getAverageRating(1), method: 'get', url: '/reviews/car/1/average' },
])

runCases('api/users', [
  { name: 'getAll (admin) → GET /admin/users', run: () => usersAPI.getAll(), method: 'get', url: '/admin/users' },
  { name: 'getById → GET /users/:id', run: () => usersAPI.getById(1), method: 'get', url: '/users/1' },
  { name: 'getMyProfile → GET /users/me', run: () => usersAPI.getMyProfile(), method: 'get', url: '/users/me' },
  { name: 'update → PUT /users/:id', run: () => usersAPI.update(1, { firstName: 'A' }), method: 'put', url: '/users/1', body: { firstName: 'A' } },
  { name: 'delete (admin) → DELETE /admin/users/:id', run: () => usersAPI.delete(1), method: 'delete', url: '/admin/users/1' },
  { name: 'getSupport → GET /users/support', run: () => usersAPI.getSupport(), method: 'get', url: '/users/support' },
])

runCases('api/notifications', [
  { name: 'getMyNotifications → GET /notifications', run: () => notificationsAPI.getMyNotifications(), method: 'get', url: '/notifications' },
  { name: 'getUnreadNotifications → GET /notifications/unread', run: () => notificationsAPI.getUnreadNotifications(), method: 'get', url: '/notifications/unread' },
  { name: 'getUnreadCount → GET /notifications/unread-count', run: () => notificationsAPI.getUnreadCount(), method: 'get', url: '/notifications/unread-count' },
  { name: 'markAsRead → PUT /notifications/:id/read', run: () => notificationsAPI.markAsRead(5), method: 'put', url: '/notifications/5/read' },
  { name: 'markAllAsRead → PUT /notifications/read-all', run: () => notificationsAPI.markAllAsRead(), method: 'put', url: '/notifications/read-all' },
  { name: 'deleteNotification → DELETE /notifications/:id', run: () => notificationsAPI.deleteNotification(5), method: 'delete', url: '/notifications/5' },
])

runCases('api/dashboard', [
  { name: 'getStats → GET /admin/dashboard', run: () => dashboardAPI.getStats(), method: 'get', url: '/admin/dashboard' },
  { name: 'getRevenue(2025) → GET /admin/dashboard/revenue?year=2025', run: () => dashboardAPI.getRevenue(2025), method: 'get', url: '/admin/dashboard/revenue?year=2025' },
  { name: 'getTopCars(10) → GET /admin/dashboard/top-cars?limit=10', run: () => dashboardAPI.getTopCars(10), method: 'get', url: '/admin/dashboard/top-cars?limit=10' },
])

runCases('api/calendar', [
  {
    name: 'getReservations(2026, 3) → GET /admin/calendar/reservations?year=2026&month=3',
    run: () => calendarAPI.getReservations(2026, 3),
    method: 'get',
    url: '/admin/calendar/reservations?year=2026&month=3',
  },
])

describe('api/dashboard · valeurs par défaut', () => {
  it('getRevenue() cible l’année 2026 par défaut', async () => {
    await dashboardAPI.getRevenue()
    expect(mock.history.get[0].url).toBe('/admin/dashboard/revenue?year=2026')
  })

  it('getTopCars() limite à 5 par défaut', async () => {
    await dashboardAPI.getTopCars()
    expect(mock.history.get[0].url).toBe('/admin/dashboard/top-cars?limit=5')
  })
})

describe('api/recommendations', () => {
  it('normalise la charge utile envoyée au service ML', async () => {
    await recommendationsAPI.getCarRecommendations({
      objective: 'FAMILLE',
      budget: 200,
      passengers: 5,
      duration: 4,
    })

    expect(mock.history.post[0].url).toBe('/recommendations/cars')
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      objective: 'FAMILLE',
      budget: 200,
      passengers: 5,
      duration: 4,
      transmission: 'ANY',
      topK: 3,
    })
  })

  it('respecte les valeurs explicites de transmission et topK', async () => {
    await recommendationsAPI.getCarRecommendations({
      objective: 'VOYAGE',
      budget: 300,
      passengers: 2,
      duration: 7,
      transmission: 'AUTOMATIC',
      topK: 5,
    })

    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ transmission: 'AUTOMATIC', topK: 5 })
  })

  it('propage l’indisponibilité du service ML', async () => {
    mock.reset()
    mock.onPost('/recommendations/cars').reply(503, { message: 'ML indisponible' })

    await expect(
      recommendationsAPI.getCarRecommendations({ objective: 'X', budget: 1, passengers: 1, duration: 1 }),
    ).rejects.toMatchObject({ response: { status: 503 } })
  })
})
