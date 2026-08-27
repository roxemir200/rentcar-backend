import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  API_BASE_URL,
  API_ORIGIN,
  NOTIFICATIONS_STREAM_URL,
  WS_URL,
  notificationsStreamUrl,
  resolveImageUrl,
} from '../env'

/**
 * Ce module est le point de passage unique des URLs du backend. Une erreur
 * ici ne se voit pas au build : elle se manifeste en production par des
 * appels partis vers la mauvaise adresse — c'est exactement ce qui est
 * arrivé lorsque le navigateur des visiteurs appelait `localhost:8089`.
 */
/**
 * Recharge le module avec la variable d'environnement voulue.
 *
 * `VITE_API_URL` est lue une seule fois, au chargement : il faut donc
 * réinitialiser le registre de modules pour observer une autre valeur.
 */
const chargerAvec = async (apiUrl?: string) => {
  vi.resetModules()
  if (apiUrl !== undefined) vi.stubEnv('VITE_API_URL', apiUrl)
  return import('../env')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('config/env · lecture de la configuration', () => {
  it('prend l’origine fournie par la plateforme de déploiement', async () => {
    const env = await chargerAvec('https://rentcar-api.onrender.com')

    expect(env.API_ORIGIN).toBe('https://rentcar-api.onrender.com')
    expect(env.API_BASE_URL).toBe('https://rentcar-api.onrender.com/api')
    expect(env.WS_URL).toBe('https://rentcar-api.onrender.com/ws')
  })

  /** Une barre finale produirait `https://api//api/...`. */
  it('supprime les barres obliques finales', async () => {
    const env = await chargerAvec('https://rentcar-api.onrender.com///')

    expect(env.API_BASE_URL).toBe('https://rentcar-api.onrender.com/api')
  })

  /**
   * L'erreur que ce contrôle existe pour attraper : le *nom* de la variable
   * saisi dans le champ *valeur*. L'URL devient relative, l'hébergeur
   * statique répond 405 aux POST, et rien n'indique d'où vient le problème.
   */
  it('signale et écarte une valeur qui n’est pas une URL', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {})

    const env = await chargerAvec('VITE_API_URL')

    expect(env.API_ORIGIN).toBe('http://localhost:8089')
    expect(erreur).toHaveBeenCalledWith(expect.stringContaining('VITE_API_URL'))
  })

  /** Variable définie mais vide : cas fréquent, et silencieux, des hébergeurs. */
  it('retombe sur l’origine par défaut quand la variable est vide', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {})

    const env = await chargerAvec('   ')

    expect(env.API_ORIGIN).toBe('http://localhost:8089')
    // Une valeur vide est une absence de configuration, pas une faute de
    // saisie : elle ne doit pas encombrer la console.
    expect(erreur).not.toHaveBeenCalled()
  })
})

describe('config/env · construction des URLs', () => {
  it('retombe sur l’origine de développement quand aucune variable n’est définie', () => {
    expect(API_ORIGIN).toBe('http://localhost:8089')
    expect(API_BASE_URL).toBe('http://localhost:8089/api')
    expect(WS_URL).toBe('http://localhost:8089/ws')
    expect(NOTIFICATIONS_STREAM_URL).toBe('http://localhost:8089/api/notifications/stream')
  })

  describe('resolveImageUrl', () => {
    it('préfixe les chemins relatifs renvoyés par l’API', () => {
      expect(resolveImageUrl('/uploads/cars/a.png')).toBe('http://localhost:8089/uploads/cars/a.png')
      expect(resolveImageUrl('uploads/cars/a.png')).toBe('http://localhost:8089/uploads/cars/a.png')
    })

    it('laisse intactes les URLs absolues et les data-URI', () => {
      expect(resolveImageUrl('https://res.cloudinary.com/demo/a.png'))
        .toBe('https://res.cloudinary.com/demo/a.png')
      expect(resolveImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
    })

    it('renvoie une chaîne vide plutôt qu’une URL bancale', () => {
      expect(resolveImageUrl(undefined)).toBe('')
      expect(resolveImageUrl(null)).toBe('')
      expect(resolveImageUrl('')).toBe('')
    })
  })

  /**
   * Le jeton part dans l'URL faute d'alternative : `EventSource` n'accepte
   * aucun en-tête. Il vient de `localStorage`, que n'importe quel script du
   * domaine peut réécrire — il est donc traité comme une valeur non sûre.
   */
  describe('notificationsStreamUrl', () => {
    it('place le jeton en paramètre du flux', () => {
      expect(notificationsStreamUrl('jwt-sse'))
        .toBe('http://localhost:8089/api/notifications/stream?token=jwt-sse')
    })

    it('accepte les deux alphabets base64 d’un jeton réel', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl-_x'

      expect(notificationsStreamUrl(jwt))
        .toBe(`http://localhost:8089/api/notifications/stream?token=${jwt}`)
    })

    /**
     * Un `+` non encodé est lu comme une espace par le serveur : le jeton
     * arrive alors mutilé, et l'authentification échoue sans que rien ne dise
     * pourquoi. L'encodage n'est donc pas qu'une précaution de sécurité.
     */
    it('encode les caractères que le serveur interpréterait autrement', () => {
      expect(notificationsStreamUrl('a+b/c=')).toBe(
        'http://localhost:8089/api/notifications/stream?token=a%2Bb%2Fc%3D',
      )
    })

    /**
     * Le cœur du correctif : un jeton porteur d'un délimiteur d'URL cesserait
     * d'être une valeur pour devenir une suite de paramètres, et détournerait
     * la connexion. Aucune URL n'est produite dans ce cas.
     */
    it('refuse tout jeton porteur d’un délimiteur d’URL', () => {
      expect(notificationsStreamUrl('jwt&admin=1')).toBeNull()
      expect(notificationsStreamUrl('jwt?x=1')).toBeNull()
      expect(notificationsStreamUrl('jwt#fragment')).toBeNull()
      expect(notificationsStreamUrl('jwt avec espace')).toBeNull()
      expect(notificationsStreamUrl('jwt"onerror=')).toBeNull()
    })

    /**
     * Les barres obliques restent admises — le base64 standard en produit —
     * mais l'encodage les maintient dans la valeur du paramètre : le chemin
     * du flux ne peut pas être réécrit par le contenu du jeton.
     */
    it('ne laisse pas un jeton réécrire le chemin du flux', () => {
      const url = notificationsStreamUrl('../../autre/flux')

      expect(url).toBe(
        'http://localhost:8089/api/notifications/stream?token=..%2F..%2Fautre%2Fflux',
      )
      expect(new URL(url!).pathname).toBe('/api/notifications/stream')
    })

    it('refuse un jeton absent, vide ou démesuré', () => {
      expect(notificationsStreamUrl(null)).toBeNull()
      expect(notificationsStreamUrl(undefined)).toBeNull()
      expect(notificationsStreamUrl('')).toBeNull()
      expect(notificationsStreamUrl('a'.repeat(4097))).toBeNull()
    })
  })
})
