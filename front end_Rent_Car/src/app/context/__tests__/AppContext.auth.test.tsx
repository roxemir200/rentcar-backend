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

import { AppProvider, useApp } from '../AppContext'
import { authAPI, resetApiMocks } from '../../../test/mocks/api'
import { makeUser } from '../../../test/factories'

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

const renderApp = async () => {
  const utils = renderHook(() => useApp(), { wrapper })
  await waitFor(() => expect(utils.result.current.carsLoading).toBe(false))
  return utils
}

/** Profil renvoyé par GET /auth/me (déjà mappé par authAPI.getProfile). */
const profile = makeUser({ id: 'u1', email: 'amine@example.com', password: '' })

beforeEach(() => {
  resetApiMocks()
})

describe('AppContext · garde d’utilisation', () => {
  it('lève une erreur explicite hors AppProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useApp())).toThrow('useApp must be used within AppProvider')

    spy.mockRestore()
  })
})

describe('AppContext · restauration de session', () => {
  it('démarre déconnecté sans token', async () => {
    localStorage.setItem('user', JSON.stringify(profile))

    const { result } = await renderApp()

    expect(result.current.currentUser).toBeNull()
  })

  it('restaure l’utilisateur stocké quand un token est présent', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify({ ...profile, phone: '20123456', licenseNumber: 'LIC-1', active: true }))

    const { result } = await renderApp()

    expect(result.current.currentUser).toMatchObject({
      id: 'u1',
      email: 'amine@example.com',
      phone: '20123456',
      licenseNumber: 'LIC-1',
    })
  })

  it('ignore un contenu localStorage corrompu', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', '{ pas du json')

    const { result } = await renderApp()

    expect(result.current.currentUser).toBeNull()
  })
})

describe('AppContext · login()', () => {
  it('stocke le token, charge le profil et persiste l’utilisateur sans mot de passe', async () => {
    authAPI.login.mockResolvedValue({ token: 'jwt-123' })
    authAPI.getProfile.mockResolvedValue({ ...profile, password: 'Secret123!' })

    const { result } = await renderApp()

    let user: unknown
    await act(async () => {
      user = await result.current.login('amine@example.com', 'Secret123!')
    })

    expect(authAPI.login).toHaveBeenCalledWith({ email: 'amine@example.com', password: 'Secret123!' })
    expect(localStorage.getItem('token')).toBe('jwt-123')
    expect(user).toMatchObject({ id: 'u1' })
    expect(result.current.currentUser).toMatchObject({ id: 'u1' })
    expect(JSON.parse(localStorage.getItem('user')!)).not.toHaveProperty('password')
  })

  it('retombe sur la réponse de login si /auth/me échoue', async () => {
    authAPI.login.mockResolvedValue({ token: 'jwt-123', id: 9, email: 'a@b.tn', role: 'CLIENT' })
    authAPI.getProfile.mockRejectedValue(new Error('403'))

    const { result } = await renderApp()

    await act(async () => {
      await result.current.login('a@b.tn', 'pwd')
    })

    expect(result.current.currentUser).toMatchObject({ id: '9', email: 'a@b.tn' })
  })

  it('échoue quand le backend ne renvoie pas de token', async () => {
    authAPI.login.mockResolvedValue({})

    const { result } = await renderApp()

    await expect(result.current.login('a@b.tn', 'x')).rejects.toThrow('Email ou mot de passe incorrect')
    expect(result.current.currentUser).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('remonte le message d’erreur du backend et purge la session', async () => {
    localStorage.setItem('token', 'ancien')
    authAPI.login.mockRejectedValue({ response: { data: { message: 'Compte non vérifié' } } })

    const { result } = await renderApp()

    await expect(result.current.login('a@b.tn', 'x')).rejects.toThrow('Compte non vérifié')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('retourne null si aucun utilisateur n’est exploitable', async () => {
    authAPI.login.mockResolvedValue({ token: 'jwt' })
    authAPI.getProfile.mockResolvedValue(null)

    const { result } = await renderApp()

    let user: unknown = 'sentinelle'
    await act(async () => {
      user = await result.current.login('a@b.tn', 'x')
    })

    expect(user).toBeNull()
  })
})

describe('AppContext · register()', () => {
  it('transmet les champs d’inscription et retourne le succès', async () => {
    authAPI.register.mockResolvedValue({ success: true, message: 'Compte créé' })

    const { result } = await renderApp()

    const res = await result.current.register({ firstName: 'A', lastName: 'B', email: 'a@b.tn', password: 'x' })

    expect(authAPI.register).toHaveBeenCalledWith({ firstName: 'A', lastName: 'B', email: 'a@b.tn', password: 'x' })
    expect(res).toEqual({ ok: true, error: 'Compte créé' })
  })

  it('considère l’inscription réussie quand le backend n’envoie pas de champ success', async () => {
    authAPI.register.mockResolvedValue({})

    const { result } = await renderApp()

    await expect(result.current.register({ email: 'a@b.tn' })).resolves.toMatchObject({ ok: true })
  })

  it('retourne l’erreur en cas d’échec', async () => {
    authAPI.register.mockRejectedValue(new Error('Email déjà utilisé'))

    const { result } = await renderApp()

    await expect(result.current.register({ email: 'a@b.tn' })).resolves.toEqual({
      ok: false,
      error: 'Email déjà utilisé',
    })
  })

  it('fournit un message générique pour une erreur non standard', async () => {
    authAPI.register.mockRejectedValue('boom')

    const { result } = await renderApp()

    await expect(result.current.register({})).resolves.toEqual({ ok: false, error: "L'inscription a échoué." })
  })
})

describe('AppContext · logout()', () => {
  it('efface l’utilisateur et la session', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify(profile))

    const { result } = await renderApp()
    expect(result.current.currentUser).not.toBeNull()

    act(() => result.current.logout())

    expect(result.current.currentUser).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('vide les collections liées à l’utilisateur', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify(profile))

    const { result } = await renderApp()

    act(() => result.current.logout())

    await waitFor(() => {
      expect(result.current.reservations).toEqual([])
      expect(result.current.payments).toEqual([])
      expect(result.current.notifications).toEqual([])
      expect(result.current.users).toEqual([])
    })
  })
})

describe('AppContext · profil', () => {
  const loggedIn = async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify(profile))
    return renderApp()
  }

  it('getProfile() recharge et persiste le profil', async () => {
    authAPI.getProfile.mockResolvedValue({ ...profile, firstName: 'Amina' })

    const { result } = await loggedIn()

    await act(async () => {
      await result.current.getProfile('amine@example.com')
    })

    expect(result.current.currentUser).toMatchObject({ firstName: 'Amina' })
    expect(JSON.parse(localStorage.getItem('user')!)).toMatchObject({ firstName: 'Amina' })
  })

  it('getProfile() retourne null si l’appel échoue', async () => {
    authAPI.getProfile.mockRejectedValue(new Error('500'))

    const { result } = await loggedIn()

    await expect(result.current.getProfile('a@b.tn')).resolves.toBeNull()
  })

  it('updateProfile() traduit les champs et rafraîchit le profil', async () => {
    authAPI.updateProfile.mockResolvedValue({ success: true })
    authAPI.getProfile.mockResolvedValue({ ...profile, firstName: 'Amina' })

    const { result } = await loggedIn()

    let res: { ok: boolean } = { ok: false }
    await act(async () => {
      res = await result.current.updateProfile({
        firstName: 'Amina', lastName: 'B', phone: '20123456', address: 'Tunis', licenseNumber: 'LIC-9',
      })
    })

    expect(authAPI.updateProfile).toHaveBeenCalledWith({
      firstName: 'Amina', lastName: 'B', phoneNumber: '20123456', address: 'Tunis', drivingLicenseNumber: 'LIC-9',
    })
    expect(res.ok).toBe(true)
  })

  it('updateProfile() applique les changements localement si le rechargement échoue', async () => {
    authAPI.updateProfile.mockResolvedValue({ success: true })
    authAPI.getProfile.mockResolvedValue(null)

    const { result } = await loggedIn()

    await act(async () => {
      await result.current.updateProfile({ firstName: 'Locale' } as never)
    })

    expect(result.current.currentUser).toMatchObject({ firstName: 'Locale' })
  })

  it('updateProfile() remonte le refus du backend', async () => {
    authAPI.updateProfile.mockResolvedValue({ success: false, message: 'Téléphone déjà utilisé' })

    const { result } = await loggedIn()

    await expect(result.current.updateProfile({} as never)).resolves.toEqual({
      ok: false,
      error: 'Téléphone déjà utilisé',
    })
  })

  it('updateProfile() gère les erreurs réseau', async () => {
    authAPI.updateProfile.mockRejectedValue(new Error('Réseau indisponible'))

    const { result } = await loggedIn()

    await expect(result.current.updateProfile({} as never)).resolves.toEqual({
      ok: false,
      error: 'Réseau indisponible',
    })
  })
})

describe('AppContext · changePassword()', () => {
  it('refuse si personne n’est connecté', async () => {
    const { result } = await renderApp()

    expect(result.current.changePassword('a', 'b')).toEqual({ ok: false, error: 'Non connecté.' })
  })

  it('refuse si le mot de passe actuel ne correspond pas', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify({ ...profile, password: 'bon' }))

    const { result } = await renderApp()

    expect(result.current.changePassword('mauvais', 'nouveau')).toEqual({
      ok: false,
      error: 'Mot de passe actuel incorrect.',
    })
  })

  it('met à jour le mot de passe en mémoire quand l’ancien est correct', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify({ ...profile, password: 'bon' }))

    const { result } = await renderApp()

    let res: { ok: boolean } = { ok: false }
    act(() => {
      res = result.current.changePassword('bon', 'nouveau')
    })

    expect(res).toEqual({ ok: true })
    await waitFor(() => expect(result.current.currentUser?.password).toBe('nouveau'))
  })
})

describe('AppContext · showWelcomeToast()', () => {
  it('n’affiche rien quand personne n’est connecté', async () => {
    const { toast } = await import('sonner')
    const { result } = await renderApp()

    act(() => result.current.showWelcomeToast())

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('n’affiche le message de bienvenue qu’une seule fois', async () => {
    const { toast } = await import('sonner')
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('user', JSON.stringify(profile))

    const { result } = await renderApp()

    act(() => result.current.showWelcomeToast())
    act(() => result.current.showWelcomeToast())

    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Bienvenue, Amine !')
  })
})
