import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Metric } from 'web-vitals'

// Les trois collecteurs de web-vitals sont remplacés par des doubles : on
// capture la fonction de rappel que le module leur passe, puis on la déclenche
// nous-mêmes. Impossible autrement — ces mesures ne se produisent que dans un
// vrai navigateur qui affiche une vraie page.
const rappels: Record<string, (m: Metric) => void> = {}
const optionsRecues: Record<string, unknown> = {}
vi.mock('web-vitals', () => ({
  onLCP: (cb: (m: Metric) => void, o?: unknown) => { rappels.LCP = cb; optionsRecues.LCP = o },
  onINP: (cb: (m: Metric) => void, o?: unknown) => { rappels.INP = cb; optionsRecues.INP = o },
  onCLS: (cb: (m: Metric) => void, o?: unknown) => { rappels.CLS = cb; optionsRecues.CLS = o },
}))

const mesure = (name: string, value: number, rating: string) =>
  ({ name, value, rating } as unknown as Metric)

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  for (const cle of Object.keys(rappels)) delete rappels[cle]
  for (const cle of Object.keys(optionsRecues)) delete optionsRecues[cle]
  fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  // setup.ts remplace window.location par un objet simple : on l'ecrit
  // directement plutot que de passer par history.pushState, sans effet ici.
  window.location.pathname = '/cars'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** Charge le module avec la variable DEV souhaitée. */
async function demarrer({ dev = false } = {}) {
  vi.stubEnv('DEV', dev)
  const { startWebVitals } = await import('../webVitals')
  startWebVitals()
}

describe('app/monitoring/webVitals', () => {
  it('envoie les mesures relevées au backend', async () => {
    vi.useFakeTimers()
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))
    await vi.runAllTimersAsync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/public/web-vitals')
    expect(options.method).toBe('POST')
    // text/plain et non application/json : ce dernier declencherait un
    // preflight CORS que sendBeacon ne sait pas mener. Le repli fetch garde
    // le meme type pour que les deux chemins soient interchangeables.
    expect(options.headers['Content-Type']).toContain('text/plain')
    expect(JSON.parse(options.body)).toEqual([
      { name: 'LCP', value: 2100, rating: 'good', path: '/cars' },
    ])
  })

  /**
   * Les trois mesures arrivent à quelques millisecondes d'intervalle. Les
   * envoyer séparément ferait trois requêtes réseau sur la page même dont on
   * mesure la rapidité.
   */
  it('regroupe les mesures en un seul envoi', async () => {
    vi.useFakeTimers()
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))
    rappels.INP(mesure('INP', 150, 'good'))
    rappels.CLS(mesure('CLS', 0.04, 'good'))
    await vi.runAllTimersAsync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toHaveLength(3)
  })

  /**
   * `keepalive` est indispensable : les Web Vitals se finalisent au moment où
   * la page disparaît, et une requête ordinaire serait annulée avant d'aboutir.
   */
  it('survit à la fermeture de la page', async () => {
    vi.useFakeTimers()
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))
    await vi.runAllTimersAsync()

    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true)
  })

  /**
   * Le module envoie `location.pathname`, et non `location.href` : ce dernier
   * emporterait la chaîne de requête, dont chaque combinaison créerait sa
   * propre série temporelle côté supervision.
   */
  it('ne transmet que le chemin, sans la chaîne de requête', async () => {
    vi.useFakeTimers()
    window.location.pathname = '/cars'
    window.location.search = '?tri=prix&page=3'
    window.location.href = 'http://localhost/cars?tri=prix&page=3'
    await demarrer()

    rappels.LCP(mesure('LCP', 1800, 'good'))
    await vi.runAllTimersAsync()

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)[0].path).toBe('/cars')
  })

  /**
   * Les temps d'un serveur Vite local, avec ses modules non regroupés, n'ont
   * aucun rapport avec ceux d'un visiteur réel : les mélanger fausserait la
   * seule chose que ces métriques servent à établir.
   */
  it('ne mesure rien en développement', async () => {
    await demarrer({ dev: true })

    expect(rappels.LCP).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * LA correction qui a debloque la remontee des donnees.
   *
   * Par defaut, ces trois fonctions ne rappellent qu'une fois, au moment ou la
   * page disparait. Dans une SPA, cet instant n'arrive qu'a la fermeture de
   * l'onglet — souvent jamais. Verifie en production : sur 43 requetes d'une
   * session reelle, pas une seule vers le point de collecte.
   */
  it('demande a etre rappele a chaque evolution, et non a la fermeture', async () => {
    await demarrer()

    expect(optionsRecues.LCP).toEqual({ reportAllChanges: true })
    expect(optionsRecues.INP).toEqual({ reportAllChanges: true })
    expect(optionsRecues.CLS).toEqual({ reportAllChanges: true })
  })

  /**
   * sendBeacon est l'API prevue pour cet instant : le navigateur prend l'envoi
   * a sa charge et le mene a terme meme si la page est detruite dans la
   * milliseconde qui suit. Un fetch, meme avec keepalive, reste soumis au
   * cycle de vie du document.
   */
  it('prefere sendBeacon quand le navigateur le propose', async () => {
    vi.useFakeTimers()
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { ...window.navigator, sendBeacon: beacon })
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))
    await vi.runAllTimersAsync()

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    const [url, charge] = beacon.mock.calls[0]
    expect(url).toContain('/public/web-vitals')
    expect(charge.type).toContain('text/plain')
  })

  /** Un lot refuse par sendBeacon ne doit pas etre perdu pour autant. */
  it('bascule sur fetch si sendBeacon refuse le lot', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { ...window.navigator, sendBeacon: vi.fn().mockReturnValue(false) })
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))
    await vi.runAllTimersAsync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  /**
   * Le backend s'endort après quinze minutes. Une mesure perdue doit le rester
   * silencieusement, sans jamais remonter d'erreur dans la console du visiteur.
   */
  it('ignore un échec réseau sans rien signaler', async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValue(new Error('backend endormi'))
    await demarrer()

    rappels.LCP(mesure('LCP', 2100, 'good'))

    await expect(vi.runAllTimersAsync()).resolves.not.toThrow()
  })
})
