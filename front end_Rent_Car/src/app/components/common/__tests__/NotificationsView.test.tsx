import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, within } from '../../../../test/test-utils'
import { makeNotification, makeUser } from '../../../../test/factories'
import { NotificationsView } from '../NotificationsView'
import type { NotificationType } from '../../../data/types'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

const currentUser = makeUser({ id: 'u1' })

describe('components/NotificationsView', () => {
  it('affiche un état vide quand l’utilisateur n’a aucune notification', () => {
    renderWithProviders(<NotificationsView />, { app: { currentUser, notifications: [] } })

    expect(screen.getByRole('heading', { name: 'Aucune notification' })).toBeInTheDocument()
  })

  it('n’affiche que les notifications de l’utilisateur courant', () => {
    renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [
          makeNotification({ id: 'n1', userId: 'u1', title: 'Pour moi' }),
          makeNotification({ id: 'n2', userId: 'u2', title: 'Pour un autre' }),
        ],
      },
    })

    expect(screen.getByText('Pour moi')).toBeInTheDocument()
    expect(screen.queryByText('Pour un autre')).not.toBeInTheDocument()
  })

  it('trie les notifications de la plus récente à la plus ancienne', () => {
    renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [
          makeNotification({ id: 'n1', title: 'Ancienne', date: '2026-01-01T00:00:00.000Z' }),
          makeNotification({ id: 'n2', title: 'Récente', date: '2026-06-01T00:00:00.000Z' }),
        ],
      },
    })

    const titles = screen.getAllByText(/Ancienne|Récente/).map((el) => el.textContent)
    expect(titles).toEqual(['Récente', 'Ancienne'])
  })

  it('affiche le compteur de non-lues et le bouton "tout marquer comme lu"', () => {
    renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [
          makeNotification({ id: 'n1', read: false }),
          makeNotification({ id: 'n2', read: false }),
          makeNotification({ id: 'n3', read: true }),
        ],
      },
    })

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tout marquer comme lu/ })).toBeInTheDocument()
  })

  it('masque le compteur et l’action groupée quand tout est lu', () => {
    renderWithProviders(<NotificationsView />, {
      app: { currentUser, notifications: [makeNotification({ read: true })] },
    })

    expect(screen.queryByRole('button', { name: /Tout marquer comme lu/ })).not.toBeInTheDocument()
  })

  it('déclenche markAllRead au clic sur l’action groupée', async () => {
    const { user, app } = renderWithProviders(<NotificationsView />, {
      app: { currentUser, notifications: [makeNotification({ read: false })] },
    })

    await user.click(screen.getByRole('button', { name: /Tout marquer comme lu/ }))

    expect(app.markAllRead).toHaveBeenCalledTimes(1)
  })

  it('marque une notification comme lue au clic', async () => {
    const { user, app } = renderWithProviders(<NotificationsView />, {
      app: { currentUser, notifications: [makeNotification({ id: 'n9', title: 'Contrat prêt' })] },
    })

    await user.click(screen.getByText('Contrat prêt'))

    expect(app.markNotificationRead).toHaveBeenCalledWith('n9')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigue vers le lien associé s’il existe', async () => {
    const { user, app } = renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [makeNotification({ id: 'n9', title: 'Contrat prêt', link: '/reservation/r1' })],
      },
    })

    await user.click(screen.getByText('Contrat prêt'))

    expect(app.markNotificationRead).toHaveBeenCalledWith('n9')
    expect(navigate).toHaveBeenCalledWith('/reservation/r1')
  })

  it('supprime une notification sans déclencher la navigation', async () => {
    const { user, app } = renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [makeNotification({ id: 'n9', link: '/reservation/r1' })],
      },
    })

    await user.click(screen.getByRole('button', { name: 'Supprimer la notification' }))

    expect(app.deleteNotification).toHaveBeenCalledWith('n9')
    expect(app.markNotificationRead).not.toHaveBeenCalled()
  })

  it('distingue visuellement les notifications non lues', () => {
    const { container } = renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [
          makeNotification({ id: 'n1', read: false, title: 'Non lue' }),
          makeNotification({ id: 'n2', read: true, title: 'Lue' }),
        ],
      },
    })

    expect(container.querySelectorAll('.bg-blue-50\\/50')).toHaveLength(1)
  })

  it.each(['RESERVATION', 'PAYMENT', 'CONTRACT', 'SYSTEM', 'CHAT'] as NotificationType[])(
    'affiche une icône dédiée pour le type %s',
    (type) => {
      const { container } = renderWithProviders(<NotificationsView />, {
        app: { currentUser, notifications: [makeNotification({ type })] },
      })

      expect(container.querySelector('.size-10 svg')).toBeInTheDocument()
    },
  )

  it('affiche le message et la date relative', () => {
    renderWithProviders(<NotificationsView />, {
      app: {
        currentUser,
        notifications: [makeNotification({ message: 'Votre contrat est prêt', date: new Date().toISOString() })],
      },
    })

    expect(screen.getByText('Votre contrat est prêt')).toBeInTheDocument()
    expect(screen.getByText(/Il y a/)).toBeInTheDocument()
  })

  it('supprime la marge de page en mode admin', () => {
    const { container } = renderWithProviders(<NotificationsView admin />, {
      app: { currentUser, notifications: [] },
    })

    expect(container.firstChild).not.toHaveClass('max-w-3xl')
    expect(within(container as HTMLElement).getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
  })
})
