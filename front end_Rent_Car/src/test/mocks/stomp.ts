import { vi } from 'vitest'

/**
 * Double du client STOMP (@stomp/stompjs) : capture la configuration,
 * les abonnements et les messages publiés, et permet de simuler
 * la connexion et la réception de frames côté serveur.
 */
export class MockStompClient {
  static instances: MockStompClient[] = []

  config: Record<string, any>
  active = false
  published: { destination: string; body: string }[] = []
  subscriptions = new Map<string, (msg: { body: string }) => void>()

  constructor(config: Record<string, any>) {
    this.config = config
    MockStompClient.instances.push(this)
  }

  activate() {
    this.active = true
  }

  deactivate() {
    this.active = false
    return Promise.resolve()
  }

  subscribe(topic: string, cb: (msg: { body: string }) => void) {
    this.subscriptions.set(topic, cb)
    return { unsubscribe: vi.fn() }
  }

  publish(frame: { destination: string; body: string }) {
    this.published.push(frame)
  }

  /** Simule l'établissement de la connexion côté serveur. */
  connect() {
    this.config.onConnect?.()
  }

  /** Simule la réception d'une frame sur un topic abonné. */
  emit(topic: string, payload: unknown) {
    this.subscriptions.get(topic)?.({ body: JSON.stringify(payload) })
  }

  static get last(): MockStompClient {
    return MockStompClient.instances[MockStompClient.instances.length - 1]
  }

  static reset() {
    MockStompClient.instances = []
  }
}
