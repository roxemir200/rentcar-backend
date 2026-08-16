import { describe, expect, it } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { makeAdmin, makeUser } from '../../../../test/factories'
import AdminUsers from '../AdminUsers'
import AdminNotifications from '../AdminNotifications'

const admin = makeAdmin({ id: 'a1' })
const users = [
  admin,
  makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah', email: 'amine@example.com', phone: '20123456', role: 'CLIENT', active: true }),
  makeUser({ id: 'u2', firstName: 'Sonia', lastName: 'Trabelsi', email: 'sonia@example.com', phone: undefined, role: 'CLIENT', active: false }),
]

const renderPage = (app = {}) =>
  renderWithProviders(<AdminUsers />, { app: { currentUser: admin, users, ...app } })

describe('pages/admin/AdminUsers', () => {
  it('affiche un état vide sans utilisateur', () => {
    renderPage({ users: [] })

    expect(screen.getByRole('heading', { name: 'Aucun utilisateur' })).toBeInTheDocument()
    expect(screen.getByText('0 utilisateurs')).toBeInTheDocument()
  })

  it('liste les utilisateurs avec leurs informations', () => {
    renderPage()

    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('20123456').length).toBeGreaterThan(0)
    expect(screen.getByText('3 utilisateurs')).toBeInTheDocument()
  })

  it('affiche un tiret quand le téléphone est absent', () => {
    renderPage()

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it.each([
    ['Admin', 1],
    ['Client', 2],
    ['Actifs', 2],
    ['Inactifs', 1],
  ])('filtre les utilisateurs par l’onglet %s', async (tab, expected) => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: tab }))

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(expected + 1)) // + en-tête
  })

  it('revient à la liste complète avec l’onglet Tous', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Admin' }))
    await user.click(screen.getByRole('button', { name: 'Tous' }))

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4))
  })

  it('active ou désactive un utilisateur', async () => {
    const { user, app } = renderPage()

    const row = screen.getByText('Amine Ben Salah').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /Désactiver/ }))

    expect(app.toggleUserActive).toHaveBeenCalledWith('u1')
    expect(toast.success).toHaveBeenCalledWith('Utilisateur désactivé.')
  })

  it('réactive un utilisateur inactif', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getByRole('button', { name: /Activer/ }))

    expect(app.toggleUserActive).toHaveBeenCalledWith('u2')
    expect(toast.success).toHaveBeenCalledWith('Utilisateur activé.')
  })

  it('change le rôle d’un utilisateur', async () => {
    const { user, app } = renderPage()

    const roleRow = screen.getByText('Amine Ben Salah').closest('tr')!
    await user.selectOptions(within(roleRow).getByRole('combobox'), 'ADMIN')

    expect(app.changeUserRole).toHaveBeenCalledWith('u1', 'ADMIN')
    expect(toast.success).toHaveBeenCalledWith('Rôle mis à jour.')
  })

  it('empêche l’administrateur connecté de se modifier lui-même', () => {
    renderPage()

    const selfRow = screen.getByText('Sofia Admin').closest('tr')!
    expect(selfRow.querySelector('button')).toBeDisabled()
    expect(selfRow.querySelector('select')).toBeDisabled()
  })
})

describe('pages/admin/AdminNotifications', () => {
  it('rend la vue des notifications en présentation admin', () => {
    renderWithProviders(<AdminNotifications />, {
      app: { currentUser: admin, notifications: [] },
    })

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aucune notification' })).toBeInTheDocument()
  })
})
