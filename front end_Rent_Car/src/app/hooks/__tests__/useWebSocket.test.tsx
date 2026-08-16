import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { AppContext } from '../../context/AppContext'
import { createAppContextValue } from '../../../test/test-utils'
import { axiosResponse, makeUser } from '../../../test/factories'

vi.mock('@stomp/stompjs', async () => ({ Client: (await import('../../../test/mocks/stomp')).MockStompClient }))
vi.mock('sockjs-client', () => ({ default: vi.fn(() => ({ close: vi.fn() })) }))
vi.mock('../../api/axios', async () => ({ api: (await import('../../../test/mocks/api')).apiClient }))

import { MockStompClient } from '../../../test/mocks/stomp'
import { useWebSocket } from '../useWebSocket'
import { apiClient, resetApiMocks } from '../../../test/mocks/api'

const currentUser = makeUser({ id: '7' })

const wrapper = (user = currentUser) => {
  const value = createAppContextValue({ currentUser: user })
  return ({ children }: { children: ReactNode }) => (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  )
}

const renderWS = (user = currentUser) => renderHook(() => useWebSocket(), { wrapper: wrapper(user) })

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  senderId: 9,
  receiverId: 7,
  message: 'Bonjour',
  timestamp: '2026-03-01T10:00:00Z',
  isRead: false,
  conversationId: 'user-7',
  ...overrides,
})

beforeEach(() => {
  resetApiMocks()
  MockStompClient.reset()
  localStorage.setItem('token', 'jwt-chat')
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/chat/unread-count') return Promise.resolve(axiosResponse(3))
    if (url === '/chat/conversations') return Promise.resolve(axiosResponse([{ userId: 9, userName: 'Sofia' }]))
    if (url.startsWith('/chat/history')) return Promise.resolve(axiosResponse([message()]))
    return Promise.resolve(axiosResponse(null))
  })
})

describe('hooks/useWebSocket · connexion', () => {
  it('n’ouvre aucune connexion sans utilisateur', () => {
    renderWS(null as never)

    expect(MockStompClient.instances).toHaveLength(0)
  })

  it('active le client STOMP avec le jeton d’authentification', () => {
    renderWS()

    expect(MockStompClient.last.active).toBe(true)
    expect(MockStompClient.last.config.connectHeaders.Authorization).toBe('Bearer jwt-chat')
    expect(MockStompClient.last.config.reconnectDelay).toBe(5000)
  })

  it('signale la connexion et charge le compteur et les conversations', async () => {
    const { result } = renderWS()

    act(() => MockStompClient.last.connect())

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    await waitFor(() => expect(result.current.unreadCount).toBe(3))
    expect(result.current.conversations).toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith('/chat/unread-count')
    expect(apiClient.get).toHaveBeenCalledWith('/chat/conversations')
  })

  it('signale la déconnexion', async () => {
    const { result } = renderWS()
    act(() => MockStompClient.last.connect())
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => MockStompClient.last.config.onWebSocketClose())
    await waitFor(() => expect(result.current.isConnected).toBe(false))

    act(() => MockStompClient.last.config.onDisconnect())
    expect(result.current.isConnected).toBe(false)
  })

  it('désactive le client au démontage', () => {
    const { unmount } = renderWS()
    const client = MockStompClient.last

    unmount()

    expect(client.active).toBe(false)
  })
})

describe('hooks/useWebSocket · réception de messages', () => {
  const connected = async () => {
    const utils = renderWS()
    act(() => MockStompClient.last.connect())
    await waitFor(() => expect(utils.result.current.isConnected).toBe(true))
    return utils
  }

  it('ajoute un message reçu à la conversation ouverte', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.loadHistory('user-7')
    })
    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 2, message: 'Suite' })))

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
  })

  it('ignore les doublons', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.loadHistory('user-7')
    })
    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 1 })))

    expect(result.current.messages).toHaveLength(1)
  })

  it('n’ajoute pas les messages d’une autre conversation', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.loadHistory('user-7')
    })
    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 3, conversationId: 'user-99' })))

    expect(result.current.messages).toHaveLength(1)
  })

  it('incrémente le compteur de non-lus pour le destinataire', async () => {
    const { result } = await connected()
    await waitFor(() => expect(result.current.unreadCount).toBe(3))

    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 4, receiverId: 7, isRead: false })))

    await waitFor(() => expect(result.current.unreadCount).toBe(4))
  })

  it('n’incrémente pas le compteur pour un message déjà lu ou destiné à un autre', async () => {
    const { result } = await connected()
    await waitFor(() => expect(result.current.unreadCount).toBe(3))

    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 5, isRead: true })))
    act(() => MockStompClient.last.emit('/topic/messages/7', message({ id: 6, receiverId: 99 })))

    expect(result.current.unreadCount).toBe(3)
  })

  it('rafraîchit les conversations sur un événement de présence', async () => {
    const { result } = await connected()
    apiClient.get.mockClear()

    act(() => MockStompClient.last.emit('/topic/presence', {}))

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/chat/conversations'))
    expect(result.current.conversations).toHaveLength(1)
  })
})

describe('hooks/useWebSocket · historique et lecture', () => {
  const connected = async () => {
    const utils = renderWS()
    act(() => MockStompClient.last.connect())
    await waitFor(() => expect(utils.result.current.isConnected).toBe(true))
    return utils
  }

  it('charge l’historique d’une conversation', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.loadHistory('user-7')
    })

    expect(apiClient.get).toHaveBeenCalledWith('/chat/history/user-7')
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.historyLoaded).toBe(true)
  })

  it('réinitialise l’historique', async () => {
    const { result } = await connected()
    await act(async () => {
      await result.current.loadHistory('user-7')
    })

    act(() => result.current.resetHistory())

    expect(result.current.messages).toEqual([])
    expect(result.current.historyLoaded).toBe(false)
  })

  it('marque une conversation comme lue puis rafraîchit les compteurs', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.markAsRead('user-7')
    })

    expect(apiClient.put).toHaveBeenCalledWith('/chat/read/user-7')
    expect(apiClient.get).toHaveBeenCalledWith('/chat/unread-count')
  })

  it('absorbe une erreur de marquage comme lu', async () => {
    const { result } = await connected()
    apiClient.put.mockRejectedValue(new Error('500'))

    await expect(
      act(async () => {
        await result.current.markAsRead('user-7')
      }),
    ).resolves.not.toThrow()
  })

  it('expose l’état de chargement des conversations', async () => {
    const { result } = await connected()

    await act(async () => {
      await result.current.fetchConversations()
    })

    expect(result.current.isLoadingConversations).toBe(false)
    expect(result.current.conversations).toHaveLength(1)
  })
})

describe('hooks/useWebSocket · envoi de messages', () => {
  it('n’envoie rien tant que la connexion n’est pas établie', () => {
    const { result } = renderWS()

    act(() => result.current.sendMessage(9, 'Bonjour', 'user-7'))

    expect(MockStompClient.last.published).toHaveLength(0)
  })

  it('publie le message et l’ajoute immédiatement à la conversation', async () => {
    const { result } = renderWS()
    act(() => MockStompClient.last.connect())
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => result.current.sendMessage(9, 'Bonjour', 'user-7'))

    const published = MockStompClient.last.published[0]
    expect(published.destination).toBe('/app/chat.send')
    expect(JSON.parse(published.body)).toMatchObject({
      senderId: 7,
      receiverId: 9,
      message: 'Bonjour',
      conversationId: 'user-7',
      isRead: false,
    })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    expect(result.current.historyLoaded).toBe(true)
  })
})
