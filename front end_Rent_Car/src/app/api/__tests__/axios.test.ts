import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../axios'

/**
 * Le client axios porte deux règles transverses critiques :
 *  1. injection du JWT sur chaque requête ;
 *  2. déconnexion + redirection automatique sur 401.
 */

const setLocation = (pathname: string) => {
  const assign = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, pathname, assign, href: `http://localhost${pathname}` },
  })
  return assign
}

describe('api/axios · instance', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('cible le backend Spring et envoie du JSON par défaut', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:8089/api')
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  describe('intercepteur de requête', () => {
    it('ajoute le header Authorization quand un token est stocké', async () => {
      localStorage.setItem('token', 'jwt-abc')
      mock.onGet('/cars').reply(200, [])

      await api.get('/cars')

      expect(mock.history.get[0].headers?.Authorization).toBe('Bearer jwt-abc')
    })

    it('n’ajoute aucun header Authorization sans token (route publique)', async () => {
      mock.onGet('/cars').reply(200, [])

      await api.get('/cars')

      expect(mock.history.get[0].headers?.Authorization).toBeUndefined()
    })
  })

  describe('intercepteur de réponse', () => {
    it('laisse passer les réponses 2xx sans modification', async () => {
      mock.onGet('/cars').reply(200, [{ id: 1 }])

      const res = await api.get('/cars')

      expect(res.status).toBe(200)
      expect(res.data).toEqual([{ id: 1 }])
    })

    it('purge la session et redirige vers /login sur 401', async () => {
      const assign = setLocation('/admin/dashboard')
      localStorage.setItem('token', 'expired')
      localStorage.setItem('user', '{"id":"1"}')
      mock.onGet('/admin/users').reply(401, { message: 'Token expiré' })

      await expect(api.get('/admin/users')).rejects.toMatchObject({
        response: { status: 401 },
      })

      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(assign).toHaveBeenCalledWith('/login')
    })

    it('ne boucle pas sur la redirection si on est déjà sur /login', async () => {
      const assign = setLocation('/login')
      localStorage.setItem('token', 'expired')
      mock.onPost('/auth/login').reply(401, { message: 'Identifiants invalides' })

      await expect(api.post('/auth/login', {})).rejects.toBeTruthy()

      expect(localStorage.getItem('token')).toBeNull()
      expect(assign).not.toHaveBeenCalled()
    })

    it('propage les autres erreurs sans toucher à la session', async () => {
      const assign = setLocation('/cars')
      localStorage.setItem('token', 'valid')
      mock.onGet('/cars/999').reply(404, { message: 'Introuvable' })

      await expect(api.get('/cars/999')).rejects.toMatchObject({
        response: { status: 404 },
      })

      expect(localStorage.getItem('token')).toBe('valid')
      expect(assign).not.toHaveBeenCalled()
    })

    it('propage les erreurs réseau (pas de response)', async () => {
      mock.onGet('/cars').networkError()

      await expect(api.get('/cars')).rejects.toThrow()
    })
  })
})
