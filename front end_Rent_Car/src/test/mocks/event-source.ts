import { vi } from 'vitest'

type Listener = (event: MessageEvent) => void

/**
 * Implémentation minimale et pilotable de EventSource (absent de jsdom).
 * Permet de simuler le flux SSE utilisé par AppContext.
 */
export class MockEventSource {
  static instances: MockEventSource[] = []

  url: string
  closed = false
  onopen: (() => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onmessage: Listener | null = null
  private listeners = new Map<string, Set<Listener>>()

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, cb: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(cb)
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners.get(type)?.delete(cb)
  }

  close() {
    this.closed = true
  }

  /** Simule la réception d'un événement SSE nommé. */
  emit(type: string, data: unknown) {
    const event = { data: typeof data === 'string' ? data : JSON.stringify(data) } as MessageEvent
    this.listeners.get(type)?.forEach((cb) => cb(event))
  }

  /** Simule l'ouverture de la connexion. */
  open() {
    this.onopen?.()
  }

  /** Simule une erreur réseau (déclenche la logique de reconnexion). */
  fail(error: unknown = new Error('sse error')) {
    this.onerror?.(error)
  }

  static get last(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1]
  }

  static reset() {
    MockEventSource.instances = []
  }
}

export function installEventSourceMock() {
  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
}
