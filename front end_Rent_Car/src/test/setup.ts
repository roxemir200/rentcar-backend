import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { MockEventSource } from './mocks/event-source'

// La détection de langue i18next lit localStorage AVANT tout render : on fige
// le français pour que les assertions sur les libellés soient déterministes.
localStorage.setItem('rentcar-lang', 'fr')

// ─────────────────────────────────────────────────────────────
// Mocks globaux de librairies purement visuelles / d'effet de bord.
// Ils sont hoistés par Vitest et s'appliquent à TOUS les tests.
// ─────────────────────────────────────────────────────────────

// motion/react : on remplace les composants animés par leurs balises DOM
// natives — les animations n'apportent rien en test et rendent le DOM instable.
vi.mock('motion/react', async () => {
  const React = await import('react')

  const clean = (props: Record<string, unknown>) => {
    const forbidden = new Set([
      'initial', 'animate', 'exit', 'transition', 'layout', 'layoutId',
      'variants', 'whileHover', 'whileTap', 'whileInView', 'whileFocus',
      'whileDrag', 'viewport', 'drag', 'dragConstraints', 'onAnimationComplete',
      'custom', 'transformTemplate', 'style',
    ])
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props)) {
      if (!forbidden.has(k)) out[k] = v
      if (k === 'style') out[k] = v
    }
    return out
  }

  // ⚠️ Le cache est indispensable : sans lui, chaque accès à `motion.div`
  // créerait un nouveau type de composant et React remonterait tout le
  // sous-arbre à chaque rendu (perte du focus, état des champs réinitialisé).
  const cache = new Map<string, unknown>()
  const motion: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        if (!cache.has(tag)) {
          const Component = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) =>
            React.createElement(tag, { ...clean(props), ref }),
          )
          Component.displayName = `motion.${tag}`
          cache.set(tag, Component)
        }
        return cache.get(tag)
      },
    },
  )

  return {
    motion,
    AnimatePresence: ({ children }: { children?: unknown }) =>
      React.createElement(React.Fragment, null, children as never),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useInView: () => true,
    useReducedMotion: () => true,
    useMotionValue: (v: unknown) => ({ get: () => v, set: vi.fn(), on: vi.fn() }),
    useSpring: (v: unknown) => ({ get: () => v, set: vi.fn(), on: vi.fn() }),
    useTransform: () => ({ get: () => 0, set: vi.fn(), on: vi.fn() }),
  }
})

// sonner : les toasts sont des effets de bord observables → on les espionne.
vi.mock('sonner', async () => {
  const React = await import('react')
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
    custom: vi.fn(),
  })
  return {
    toast,
    Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
  }
})

// canvas-confetti : effet purement visuel s'appuyant sur <canvas>.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// ─────────────────────────────────────────────────────────────
// Polyfills navigateur manquants dans jsdom
// ─────────────────────────────────────────────────────────────
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  root = null
  rootMargin = ''
  thresholds: number[] = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
vi.stubGlobal('EventSource', MockEventSource)

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: { length: number; [i: number]: number }) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
        return arr
      },
      randomUUID: () => '00000000-0000-4000-8000-000000000000',
    },
    configurable: true,
  })
}

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
Element.prototype.scrollIntoView = vi.fn()
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
}
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn() as never
}

// ─────────────────────────────────────────────────────────────
// Isolation entre tests
// ─────────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  MockEventSource.reset()
  document.documentElement.className = ''

  // jsdom lève « Not implemented: navigation » dès qu'un code applicatif
  // appelle location.assign (cf. intercepteur 401) → on installe un double.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      href: 'http://localhost/',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      toString: () => 'http://localhost/',
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
})
