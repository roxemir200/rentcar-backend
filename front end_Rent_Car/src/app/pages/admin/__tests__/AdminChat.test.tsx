import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeAdmin } from '../../../../test/factories'
import AdminChat from '../AdminChat'

const ws = {
  isConnected: true,
  messages: [] as any[],
  conversations: [] as any[],
  isLoadingConversations: false,
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  loadHistory: vi.fn(),
  fetchConversations: vi.fn(),
}

vi.mock('../../../hooks/useWebSocket', () => ({ useWebSocket: () => ws }))

const admin = makeAdmin({ id: '1' })

const conversation = (overrides: Record<string, unknown> = {}) => ({
  userId: '9',
  userName: 'Amine Ben Salah',
  userEmail: 'amine@example.com',
  lastMessage: 'Bonjour, une question',
  lastMessageTime: '2026-03-01T10:00:00Z',
  unreadCount: 0,
  isActive: false,
  ...overrides,
})

const renderPage = () => renderWithProviders(<AdminChat />, { app: { currentUser: admin } })

beforeEach(() => {
  Object.assign(ws, {
    isConnected: true,
    messages: [],
    conversations: [],
    isLoadingConversations: false,
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    loadHistory: vi.fn().mockResolvedValue(undefined),
    fetchConversations: vi.fn(),
  })
})

describe('pages/admin/AdminChat · liste des conversations', () => {
  it('charge les conversations au montage', () => {
    renderPage()

    expect(ws.fetchConversations).toHaveBeenCalled()
  })

  it('affiche un état vide sans conversation', () => {
    renderPage()

    expect(screen.getByText('Aucune conversation')).toBeInTheDocument()
    expect(screen.getByText('Sélectionnez une conversation')).toBeInTheDocument()
  })

  it('liste les conversations avec leur compteur', () => {
    ws.conversations = [conversation({ unreadCount: 3 })]

    renderPage()

    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('Bonjour, une question')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument() // initiale
  })

  it('filtre les conversations par nom ou email', async () => {
    ws.conversations = [
      conversation({ userId: '9', userName: 'Amine Ben Salah', userEmail: 'amine@example.com' }),
      conversation({ userId: '10', userName: 'Sonia Trabelsi', userEmail: 'sonia@example.com' }),
    ]
    const { user } = renderPage()

    await user.type(screen.getByPlaceholderText('Rechercher un client...'), 'sonia@')

    await waitFor(() => expect(screen.queryByText('Amine Ben Salah')).not.toBeInTheDocument())
    expect(screen.getByText('Sonia Trabelsi')).toBeInTheDocument()
  })

  it('signale les clients en ligne', () => {
    ws.conversations = [conversation({ isActive: true })]

    const { container } = renderPage()

    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })
})

describe('pages/admin/AdminChat · conversation sélectionnée', () => {
  const selectFirst = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await user.click(screen.getByText('Amine Ben Salah'))
    return screen.findByPlaceholderText('Écrire un message...')
  }

  beforeEach(() => {
    ws.conversations = [conversation()]
  })

  it('charge l’historique et marque la conversation comme lue', async () => {
    const { user } = renderPage()

    await selectFirst(user)

    expect(ws.loadHistory).toHaveBeenCalledWith('user-9')
    await waitFor(() => expect(ws.markAsRead).toHaveBeenCalledWith('user-9'))
  })

  it('affiche l’en-tête du client sélectionné', async () => {
    const { user } = renderPage()

    await selectFirst(user)

    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
    expect(screen.getByText('Hors ligne')).toBeInTheDocument()
  })

  it('indique un client en ligne', async () => {
    ws.conversations = [conversation({ isActive: true })]
    const { user } = renderPage()

    await selectFirst(user)

    expect(screen.getByText('En ligne')).toBeInTheDocument()
  })

  it('invite à démarrer la conversation quand elle est vide', async () => {
    const { user } = renderPage()

    await selectFirst(user)

    expect(screen.getByText('Aucun message. Commencez la conversation !')).toBeInTheDocument()
  })

  it('distingue les messages de l’admin et du client', async () => {
    ws.messages = [
      { id: 1, senderId: 1, message: 'Bonjour, comment aider ?', timestamp: '2026-03-01T10:00:00Z' },
      { id: 2, senderId: 9, message: 'J’ai une question', timestamp: '2026-03-01T10:01:00Z' },
    ]
    const { user } = renderPage()

    await selectFirst(user)

    expect(screen.getByText('Bonjour, comment aider ?').closest('.flex')).toHaveClass('justify-end')
    expect(screen.getByText('J’ai une question').closest('.flex')).toHaveClass('justify-start')
  })

  it('envoie un message au client sélectionné', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderPage()
    const input = await selectFirst(user)

    await user.type(input, '  Bonjour  ')
    await user.click(screen.getAllByRole('button').at(-1)!)

    expect(ws.sendMessage).toHaveBeenCalledWith(9, 'Bonjour', 'user-9')
    expect(input).toHaveValue('')

    await vi.advanceTimersByTimeAsync(100)
    expect(ws.fetchConversations).toHaveBeenCalledTimes(3) // montage + sélection + après envoi
    vi.useRealTimers()
  })

  it('n’envoie pas un message vide', async () => {
    const { user } = renderPage()
    await selectFirst(user)

    expect(screen.getAllByRole('button').at(-1)!).toBeDisabled()
    expect(ws.sendMessage).not.toHaveBeenCalled()
  })

  it('bloque la saisie quand la connexion est perdue', async () => {
    ws.isConnected = false
    const { user } = renderPage()

    await user.click(screen.getByText('Amine Ben Salah'))

    expect(await screen.findByPlaceholderText('Connexion en cours...')).toBeDisabled()
  })
})
