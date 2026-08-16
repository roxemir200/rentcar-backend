import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse, makeUser } from '../../../../test/factories'
import { SupportChat } from '../SupportChat'

const ws = {
  isConnected: true,
  messages: [] as any[],
  unreadCount: 0,
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  loadHistory: vi.fn(),
  historyLoaded: false,
}

vi.mock('../../../hooks/useWebSocket', () => ({ useWebSocket: () => ws }))
vi.mock('../../../api/users.api', () => ({ usersAPI: { getSupport: vi.fn() } }))

import { usersAPI } from '../../../api/users.api'

const currentUser = makeUser({ id: '7' })

const renderChat = (app = {}) => renderWithProviders(<SupportChat />, { app: { currentUser, ...app } })

const openChat = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.click(screen.getAllByRole('button')[0])
  return screen.findByText('Support RentCar')
}

beforeEach(() => {
  Object.assign(ws, {
    isConnected: true,
    messages: [],
    unreadCount: 0,
    historyLoaded: false,
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    loadHistory: vi.fn(),
  })
  vi.mocked(usersAPI.getSupport).mockResolvedValue(axiosResponse({ id: 99 }))
})

describe('components/SupportChat', () => {
  it('affiche le bouton flottant fermé par défaut', () => {
    renderChat()

    expect(screen.queryByText('Support RentCar')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('affiche le nombre de messages non lus', () => {
    ws.unreadCount = 4

    renderChat()

    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('masque le compteur une fois le chat ouvert', async () => {
    ws.unreadCount = 4
    const { user } = renderChat()

    await openChat(user)

    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })

  it('récupère le compte support de l’utilisateur connecté', async () => {
    renderChat()

    await waitFor(() => expect(usersAPI.getSupport).toHaveBeenCalled())
  })

  it('ne contacte pas le support pour un visiteur anonyme', async () => {
    renderChat({ currentUser: null })

    await new Promise((r) => setTimeout(r, 20))
    expect(usersAPI.getSupport).not.toHaveBeenCalled()
  })

  it('absorbe l’échec de récupération du support', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(usersAPI.getSupport).mockRejectedValue(new Error('500'))

    const { user } = renderChat()
    await openChat(user)

    expect(screen.getByText('Support RentCar')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('charge l’historique et marque la conversation lue à l’ouverture', async () => {
    const { user } = renderChat()

    await openChat(user)

    await waitFor(() => expect(ws.loadHistory).toHaveBeenCalledWith('user-7'))
    expect(ws.markAsRead).toHaveBeenCalledWith('user-7')
  })

  it('affiche l’état de connexion', async () => {
    const { user } = renderChat()

    await openChat(user)

    expect(screen.getByText('En ligne 🟢')).toBeInTheDocument()
  })

  it('signale une connexion interrompue et bloque la saisie', async () => {
    ws.isConnected = false
    const { user } = renderChat()

    await openChat(user)

    expect(screen.getByText('Hors ligne')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Connexion en cours...')).toBeDisabled()
  })

  it('affiche un message d’invitation sans conversation', async () => {
    const { user } = renderChat()

    await openChat(user)

    expect(screen.getByText('Aucun message. Posez votre question !')).toBeInTheDocument()
  })

  it('distingue les messages envoyés et reçus', async () => {
    ws.messages = [
      { id: 1, senderId: 7, message: 'Bonjour', timestamp: '2026-03-01T10:00:00Z' },
      { id: 2, senderId: 99, message: 'Comment puis-je aider ?', timestamp: '2026-03-01T10:01:00Z' },
    ]
    const { user } = renderChat()

    await openChat(user)

    expect(screen.getByText('Bonjour').closest('.flex')).toHaveClass('justify-end')
    expect(screen.getByText('Comment puis-je aider ?').closest('.flex')).toHaveClass('justify-start')
  })

  it('envoie un message et vide la zone de saisie', async () => {
    const { user } = renderChat()
    await openChat(user)
    await waitFor(() => expect(usersAPI.getSupport).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('Écrire un message...')
    await user.type(input, '  Bonjour  ')
    await user.click(screen.getAllByRole('button').at(-1)!)

    await waitFor(() => expect(ws.sendMessage).toHaveBeenCalledWith(99, 'Bonjour', 'user-7'))
    expect(input).toHaveValue('')
  })

  it('n’envoie pas un message vide', async () => {
    const { user } = renderChat()
    await openChat(user)

    const send = screen.getAllByRole('button').at(-1)!
    expect(send).toBeDisabled()

    await user.click(send)
    expect(ws.sendMessage).not.toHaveBeenCalled()
  })

  it('ferme la fenêtre depuis l’en-tête', async () => {
    const { user } = renderChat()
    await openChat(user)

    await user.click(screen.getAllByRole('button')[1])

    await waitFor(() => expect(screen.queryByText('Support RentCar')).not.toBeInTheDocument())
  })
})
