/* eslint-disable react-refresh/only-export-components */
import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import { vi } from 'vitest'
import i18n from '../app/locales'
import { AppContext, type AppContextValue } from '../app/context/AppContext'
import { PrefsProvider } from '../app/context/PrefsContext'

/**
 * Valeur par défaut du AppContext : toutes les commandes sont des spies,
 * toutes les collections sont vides. Les tests surchargent uniquement ce
 * dont ils ont besoin, ce qui garde les cas de test lisibles.
 */
export function createAppContextValue(overrides: Partial<AppContextValue> = {}): AppContextValue {
  const value: AppContextValue = {
    currentUser: null,
    users: [],
    cars: [],
    categories: [],
    reservations: [],
    contracts: [],
    payments: [],
    reviews: [],
    notifications: [],
    dashboardStats: null,
    dashboardRevenue: [],
    dashboardTopCars: [],
    calendarReservations: [],

    login: vi.fn().mockResolvedValue(null),
    register: vi.fn().mockResolvedValue({ ok: true }),
    logout: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn().mockResolvedValue({ ok: true }),
    changePassword: vi.fn().mockReturnValue({ ok: true }),
    showWelcomeToast: vi.fn(),

    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),

    signContract: vi.fn(),
    cancelContract: vi.fn(),
    payReservation: vi.fn(),
    refundPayment: vi.fn().mockResolvedValue({ ok: true }),
    addOrUpdatePayment: vi.fn(),
    addReview: vi.fn().mockResolvedValue(undefined),

    markNotificationRead: vi.fn(),
    markAllRead: vi.fn(),
    deleteNotification: vi.fn(),
    toggleUserActive: vi.fn(),
    changeUserRole: vi.fn(),

    saveCar: vi.fn(),
    deleteCar: vi.fn(),
    saveCategory: vi.fn(),
    deleteCategory: vi.fn(),

    carsLoading: false,
    carsError: null,
    loadCars: vi.fn().mockResolvedValue(undefined),
    loadCategories: vi.fn().mockResolvedValue(undefined),
    loadReservations: vi.fn().mockResolvedValue(undefined),
    loadPayments: vi.fn().mockResolvedValue(undefined),
    loadDashboardStats: vi.fn().mockResolvedValue(null),
    loadUsers: vi.fn().mockResolvedValue(undefined),
    loadReviews: vi.fn().mockResolvedValue(undefined),
    loadContracts: vi.fn().mockResolvedValue(undefined),
    setContracts: vi.fn(),
    loadNotifications: vi.fn().mockResolvedValue(undefined),
    loadDashboardRevenue: vi.fn().mockResolvedValue([]),
    loadDashboardTopCars: vi.fn().mockResolvedValue([]),
    loadCalendarReservations: vi.fn().mockResolvedValue([]),

    getCar: vi.fn(),
    getUser: vi.fn(),
    getContractByReservation: vi.fn(),
    getPaymentByReservation: vi.fn(),
    getCarRating: vi.fn().mockReturnValue({ avg: 0, count: 0 }),
    ...overrides,
  }

  // Les helpers dérivent naturellement des collections fournies : on ne les
  // remplace que si le test ne les a pas explicitement surchargés.
  if (!overrides.getCar) value.getCar = vi.fn((id: string) => value.cars.find((c) => c.id === id))
  if (!overrides.getUser) value.getUser = vi.fn((id: string) => value.users.find((u) => u.id === id))
  if (!overrides.getContractByReservation)
    value.getContractByReservation = vi.fn((rid: string) => value.contracts.find((c) => c.reservationId === rid))
  if (!overrides.getPaymentByReservation)
    value.getPaymentByReservation = vi.fn((rid: string) => value.payments.find((p) => p.reservationId === rid))
  if (!overrides.getCarRating) {
    value.getCarRating = vi.fn((carId: string) => {
      const rs = value.reviews.filter((r) => r.carId === carId)
      if (rs.length === 0) return { avg: 0, count: 0 }
      return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length }
    })
  }

  return value
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Surcharges du AppContext injecté. */
  app?: Partial<AppContextValue>
  /** Valeur complète du AppContext (prioritaire sur `app`). */
  appValue?: AppContextValue
  /** URL initiale du routeur mémoire. */
  route?: string
  /** Pattern de route (ex. "/cars/:id") pour exposer des params à l'UI testée. */
  path?: string
  /** State de navigation (équivalent de navigate(url, { state })). */
  state?: unknown
  /** Langue de rendu. */
  lang?: 'fr' | 'en' | 'ar'
  /** Désactive PrefsProvider (utile pour tester les erreurs de contexte). */
  withPrefs?: boolean
}

export interface RenderWithProvidersResult extends RenderResult {
  /** Valeur du AppContext réellement injectée (spies inclus). */
  app: AppContextValue
  user: ReturnType<typeof userEvent.setup>
}

/**
 * Rendu d'un composant dans l'environnement applicatif complet :
 * i18n réel (FR par défaut), PrefsProvider réel, AppContext mocké, routeur mémoire.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    app: appOverrides = {},
    appValue,
    route = '/',
    path,
    state,
    lang = 'fr',
    withPrefs = true,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const value = appValue ?? createAppContextValue(appOverrides)
  if (i18n.language !== lang) void i18n.changeLanguage(lang)

  const user = userEvent.setup()

  const [pathname, search] = route.split('?')
  const entry = state === undefined
    ? route
    : { pathname, search: search ? `?${search}` : '', state }

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const routed = path ? <Routes><Route path={path} element={children} /></Routes> : children
    const inner = (
      <AppContext.Provider value={value}>
        <MemoryRouter initialEntries={[entry]}>{routed}</MemoryRouter>
      </AppContext.Provider>
    )
    return (
      <I18nextProvider i18n={i18n}>
        {withPrefs ? <PrefsProvider>{inner}</PrefsProvider> : inner}
      </I18nextProvider>
    )
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions })
  return { ...result, app: value, user }
}

export * from '@testing-library/react'
export { userEvent }
