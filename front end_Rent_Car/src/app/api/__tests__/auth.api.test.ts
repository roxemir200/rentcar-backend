import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '../axios'
import { authAPI, toFrontendUser } from '../auth.api'

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(api)
})

afterEach(() => {
  mock.restore()
})

/** Enveloppe standard renvoyée par le backend Spring. */
const envelope = <T,>(data: T, success = true, message = 'ok') => ({ success, message, data })

describe('api/auth · toFrontendUser()', () => {
  it('retourne null pour une charge utile vide', () => {
    expect(toFrontendUser(null)).toBeNull()
    expect(toFrontendUser(undefined)).toBeNull()
  })

  it('mappe les noms de champs backend vers le modèle front', () => {
    const user = toFrontendUser({
      id: 7,
      firstName: 'Amine',
      lastName: 'Ben Salah',
      email: 'amine@example.com',
      phoneNumber: '20123456',
      address: 'Tunis',
      drivingLicenseNumber: 'LIC-1',
      role: 'ADMIN',
      isActive: false,
      createdAt: '2026-01-01T00:00:00Z',
    })

    expect(user).toMatchObject({
      id: '7',
      firstName: 'Amine',
      phone: '20123456',
      licenseNumber: 'LIC-1',
      role: 'ADMIN',
      active: false,
      createdAt: '2026-01-01T00:00:00Z',
    })
  })

  it('accepte les noms de champs alternatifs (phone / licenseNumber / active)', () => {
    const user = toFrontendUser({ id: 1, phone: '111', licenseNumber: 'L2', active: false })

    expect(user).toMatchObject({ phone: '111', licenseNumber: 'L2', active: false })
  })

  it('applique les valeurs par défaut sur une charge utile minimale', () => {
    const user = toFrontendUser({})

    expect(user).toMatchObject({ id: '', firstName: '', email: '', role: 'CLIENT', active: true })
    expect(user?.createdAt).toEqual(expect.any(String))
  })
})

describe('api/auth · register()', () => {
  it('poste uniquement les champs attendus par le backend', async () => {
    mock.onPost('/auth/register').reply(201, { success: true, message: 'Compte créé' })

    const res = await authAPI.register({
      firstName: 'Amine',
      lastName: 'B',
      email: 'a@b.tn',
      password: 'Secret1!',
      role: 'ADMIN', // champ non transmis : l'élévation de privilège est impossible côté client
    })

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      firstName: 'Amine',
      lastName: 'B',
      email: 'a@b.tn',
      password: 'Secret1!',
    })
    expect(res).toEqual({ success: true, message: 'Compte créé' })
  })

  it('propage l’erreur backend (email déjà utilisé)', async () => {
    mock.onPost('/auth/register').reply(409, { success: false, message: 'Email déjà utilisé' })

    await expect(authAPI.register({ email: 'a@b.tn' })).rejects.toMatchObject({
      response: { status: 409 },
    })
  })
})

describe('api/auth · login()', () => {
  it('déballe l’enveloppe { success, data } et retourne le token', async () => {
    mock.onPost('/auth/login').reply(200, envelope({ token: 'jwt-1', id: 3, email: 'a@b.tn' }))

    const res = await authAPI.login({ email: 'a@b.tn', password: 'x' })

    expect(res).toMatchObject({ token: 'jwt-1', id: 3 })
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ email: 'a@b.tn', password: 'x' })
  })

  it('retourne la charge utile telle quelle si elle n’est pas enveloppée', async () => {
    mock.onPost('/auth/login').reply(200, { token: 'jwt-2' })

    await expect(authAPI.login({ email: 'a', password: 'b' })).resolves.toEqual({ token: 'jwt-2' })
  })

  it('rejette sur identifiants invalides', async () => {
    mock.onPost('/auth/login').reply(401, { success: false, message: 'Identifiants invalides' })

    await expect(authAPI.login({ email: 'a', password: 'b' })).rejects.toBeTruthy()
  })
})

describe('api/auth · getProfile()', () => {
  it('interroge /auth/me avec l’email en query et mappe la réponse', async () => {
    mock.onGet('/auth/me').reply(200, envelope({ id: 5, firstName: 'Sofia', phoneNumber: '99' }))

    const user = await authAPI.getProfile('sofia@example.com')

    expect(mock.history.get[0].params).toEqual({ email: 'sofia@example.com' })
    expect(user).toMatchObject({ id: '5', firstName: 'Sofia', phone: '99' })
  })

  it('retourne un profil neutre (et non null) quand l’enveloppe ne contient pas de données', async () => {
    // unwrapData retombe sur l'enveloppe complète lorsque `data` est null :
    // toFrontendUser produit alors un utilisateur aux valeurs par défaut.
    mock.onGet('/auth/me').reply(200, envelope(null))

    await expect(authAPI.getProfile('x@y.tn')).resolves.toMatchObject({ id: '', email: '', role: 'CLIENT' })
  })

  it('retourne null quand le backend ne renvoie aucun corps', async () => {
    mock.onGet('/auth/me').reply(200, null)

    await expect(authAPI.getProfile('x@y.tn')).resolves.toBeNull()
  })
})

describe('api/auth · updateProfile()', () => {
  it('traduit les champs front vers les noms backend', async () => {
    mock.onPut('/auth/profile').reply(200, { success: true })

    await authAPI.updateProfile({
      firstName: 'Amine',
      lastName: 'B',
      phone: '20123456',
      licenseNumber: 'LIC-9',
      address: 'Tunis',
    })

    expect(JSON.parse(mock.history.put[0].data)).toEqual({
      firstName: 'Amine',
      lastName: 'B',
      phoneNumber: '20123456',
      address: 'Tunis',
      drivingLicenseNumber: 'LIC-9',
    })
  })

  it('privilégie les noms backend quand les deux sont fournis', async () => {
    mock.onPut('/auth/profile').reply(200, { success: true })

    await authAPI.updateProfile({ phoneNumber: '111', phone: '222', drivingLicenseNumber: 'A', licenseNumber: 'B' })

    const body = JSON.parse(mock.history.put[0].data)
    expect(body.phoneNumber).toBe('111')
    expect(body.drivingLicenseNumber).toBe('A')
  })
})

describe('api/auth · mot de passe et vérifications', () => {
  it('changePassword() envoie l’ancien et le nouveau mot de passe', async () => {
    mock.onPut('/auth/change-password').reply(200, { success: true, message: 'Mot de passe modifié' })

    const res = await authAPI.changePassword({ currentPassword: 'old', newPassword: 'new' })

    expect(JSON.parse(mock.history.put[0].data)).toEqual({ currentPassword: 'old', newPassword: 'new' })
    expect(res).toMatchObject({ success: true })
  })

  it('forgotPassword() poste l’email', async () => {
    mock.onPost('/auth/forgot-password').reply(200, { success: true })

    await authAPI.forgotPassword('a@b.tn')

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ email: 'a@b.tn' })
  })

  it('verifyResetToken() passe le token en query', async () => {
    mock.onGet('/auth/verify-token').reply(200, { success: true })

    await authAPI.verifyResetToken('tok-1')

    expect(mock.history.get[0].params).toEqual({ token: 'tok-1' })
  })

  it('resetPassword() poste le token et le nouveau mot de passe', async () => {
    mock.onPost('/auth/reset-password').reply(200, { success: true })

    await authAPI.resetPassword('tok-1', 'NewPass1!')

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ token: 'tok-1', newPassword: 'NewPass1!' })
  })

  it('verifyEmail() passe le token en query', async () => {
    mock.onGet('/auth/verify-email').reply(200, { success: true, message: 'Email vérifié' })

    const res = await authAPI.verifyEmail('tok-2')

    expect(mock.history.get[0].params).toEqual({ token: 'tok-2' })
    expect(res).toMatchObject({ message: 'Email vérifié' })
  })

  it('resendVerification() envoie l’email en query et un corps vide', async () => {
    mock.onPost('/auth/resend-verification').reply(200, { success: true })

    await authAPI.resendVerification('a@b.tn')

    expect(mock.history.post[0].params).toEqual({ email: 'a@b.tn' })
    expect(JSON.parse(mock.history.post[0].data ?? 'null')).toBeNull()
  })

  it('checkEmail() déballe l’enveloppe et retourne le booléen', async () => {
    mock.onGet('/auth/check-email').reply(200, envelope(true))

    await expect(authAPI.checkEmail('a@b.tn')).resolves.toBe(true)
  })

  it('checkPhone() déballe l’enveloppe et retourne le booléen', async () => {
    mock.onGet('/auth/check-phone').reply(200, envelope(false))

    await expect(authAPI.checkPhone('20123456')).resolves.toBe(false)
  })
})
