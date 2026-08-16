import { vi } from 'vitest'
import { axiosResponse } from '../factories'

/**
 * Doubles de tous les services API.
 * Utilisés par les tests d'AppContext (qui exécute le vrai provider) pour
 * couper l'accès réseau tout en gardant la logique de mapping sous test.
 */

const ok = <T,>(data: T) => vi.fn().mockResolvedValue(axiosResponse(data))

export const carsAPI = {
  getAll: ok([]),
  getAvailable: ok([]),
  getById: ok(null),
  create: ok({ success: true }),
  update: ok({ success: true }),
  delete: ok({ success: true }),
  getImages: ok([]),
  getPrimaryImage: ok(null),
  addImage: ok({ success: true }),
  setPrimaryImage: ok({ success: true }),
  deleteImage: ok({ success: true }),
}

export const categoriesAPI = {
  getAll: ok([]),
  getById: ok(null),
  create: ok({ success: true }),
  update: ok({ success: true }),
  delete: ok({ success: true }),
}

export const reservationsAPI = {
  create: ok({ success: true }),
  getMyReservations: ok([]),
  getById: ok(null),
  cancel: ok({ success: true }),
  getAll: ok([]),
  confirm: ok({ success: true }),
  start: ok({ success: true }),
  complete: ok({ success: true }),
}

export const paymentsAPI = {
  create: ok({ success: true }),
  getByReservation: ok(null),
  getMyPayments: ok([]),
  getAll: ok([]),
  refund: ok({ success: true }),
}

export const usersAPI = {
  getAll: ok([]),
  getById: ok(null),
  getMyProfile: ok(null),
  update: ok({ success: true }),
  delete: ok({ success: true }),
  getSupport: ok([]),
}

export const reviewsAPI = {
  create: ok({ success: true, data: {} }),
  getByCar: ok([]),
  getMyReviews: ok([]),
  getAverageRating: ok({ average: 0 }),
}

export const contractsAPI = {
  sign: ok({ success: true }),
  getMy: ok([]),
  getByReservation: ok(null),
  getById: ok(null),
  getAll: ok([]),
  cancel: ok({ success: true }),
}

export const dashboardAPI = {
  getStats: ok({}),
  getRevenue: ok([]),
  getTopCars: ok([]),
}

export const notificationsAPI = {
  getMyNotifications: ok([]),
  getUnreadNotifications: ok([]),
  getUnreadCount: ok({ count: 0 }),
  markAsRead: ok({ success: true }),
  markAllAsRead: ok({ success: true }),
  deleteNotification: ok({ success: true }),
}

export const calendarAPI = {
  getReservations: ok([]),
}

export const authAPI = {
  register: vi.fn().mockResolvedValue({ success: true, message: 'Compte créé' }),
  login: vi.fn().mockResolvedValue({ token: 'jwt-token' }),
  getProfile: vi.fn().mockResolvedValue(null),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  forgotPassword: vi.fn().mockResolvedValue({ success: true }),
  verifyResetToken: vi.fn().mockResolvedValue({ success: true }),
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  resendVerification: vi.fn().mockResolvedValue({ success: true }),
  checkEmail: vi.fn().mockResolvedValue(false),
  checkPhone: vi.fn().mockResolvedValue(false),
}

export const apiClient = {
  get: ok({}),
  post: ok({ data: 'https://cdn.example.com/uploaded.jpg' }),
  put: ok({}),
  delete: ok({}),
}

const groups = [
  carsAPI, categoriesAPI, reservationsAPI, paymentsAPI, usersAPI, reviewsAPI,
  contractsAPI, dashboardAPI, notificationsAPI, calendarAPI, authAPI, apiClient,
]

/** Remet chaque double dans son comportement nominal (succès, listes vides). */
export function resetApiMocks() {
  groups.forEach((group) => {
    Object.values(group).forEach((fn) => {
      const spy = fn as ReturnType<typeof vi.fn>
      spy.mockReset()
    })
  })

  Object.entries({
    carsAPI, categoriesAPI, reservationsAPI, paymentsAPI, usersAPI, reviewsAPI,
    contractsAPI, dashboardAPI, notificationsAPI, calendarAPI,
  }).forEach(([, group]) => {
    Object.entries(group).forEach(([name, fn]) => {
      const spy = fn as ReturnType<typeof vi.fn>
      const listReturning = /^(getAll|getMy|getMyReservations|getMyPayments|getMyReviews|getMyNotifications|getUnreadNotifications|getReservations|getRevenue|getTopCars|getImages|getAvailable|getSupport)$/
      spy.mockResolvedValue(axiosResponse(listReturning.test(name) ? [] : { success: true, data: {} }))
    })
  })

  authAPI.register.mockResolvedValue({ success: true, message: 'Compte créé' })
  authAPI.login.mockResolvedValue({ token: 'jwt-token' })
  authAPI.getProfile.mockResolvedValue(null)
  authAPI.updateProfile.mockResolvedValue({ success: true })
  authAPI.changePassword.mockResolvedValue({ success: true })
  authAPI.forgotPassword.mockResolvedValue({ success: true })
  authAPI.verifyResetToken.mockResolvedValue({ success: true })
  authAPI.resetPassword.mockResolvedValue({ success: true })
  authAPI.verifyEmail.mockResolvedValue({ success: true })
  authAPI.resendVerification.mockResolvedValue({ success: true })
  authAPI.checkEmail.mockResolvedValue(false)
  authAPI.checkPhone.mockResolvedValue(false)

  apiClient.get.mockResolvedValue(axiosResponse({}))
  apiClient.post.mockResolvedValue(axiosResponse({ data: 'https://cdn.example.com/uploaded.jpg' }))
  apiClient.put.mockResolvedValue(axiosResponse({}))
  apiClient.delete.mockResolvedValue(axiosResponse({}))
}
