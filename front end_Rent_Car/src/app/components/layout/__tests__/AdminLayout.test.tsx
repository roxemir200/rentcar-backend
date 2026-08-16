import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeAdmin, makeNotification } from '../../../../test/factories'
import { AdminLayout } from '../AdminLayout'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

const admin = makeAdmin({ id: 'a1', firstName: 'Sofia', lastName: 'Admin' })

const renderLayout = (app = {}, route = '/admin/dashboard') =>
  renderWithProviders(
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<p>Tableau de bord</p>} />
      </Route>
    </Routes>,
    { app: { currentUser: admin, ...app }, route },
  )

describe('components/AdminLayout', () => {
  it('rend la page enfant et le pied de page', () => {
    renderLayout()

    // Le libellé existe aussi dans la barre latérale → on cible le contenu de la page
    expect(screen.getByText('Tableau de bord', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/Espace administrateur/)).toBeInTheDocument()
  })

  it('affiche toutes les entrées de navigation admin', () => {
    renderLayout()

    const labels = [
      'Tableau de bord', 'Réservations', 'Calendrier', 'Voitures', 'Catégories',
      'Contrats', 'Paiements', 'Utilisateurs', 'Chat', 'Export données', 'Notifications',
    ]
    labels.forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    })
  })

  it('affiche l’identité de l’administrateur connecté', () => {
    renderLayout()

    expect(screen.getByText('SA')).toBeInTheDocument()
    expect(screen.getByText('Sofia Admin')).toBeInTheDocument()
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('affiche le compteur de notifications non lues', () => {
    renderLayout({
      notifications: [
        makeNotification({ id: 'n1', userId: 'a1', read: false }),
        makeNotification({ id: 'n2', userId: 'a1', read: false }),
        makeNotification({ id: 'n3', userId: 'autre', read: false }),
      ],
    })

    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('ouvre la page des notifications depuis l’en-tête', async () => {
    const { user } = renderLayout()

    const bells = screen.getAllByRole('button').filter((b) => b.querySelector('.lucide-bell'))
    await user.click(bells.at(-1)!)

    expect(navigate).toHaveBeenCalledWith('/admin/notifications')
  })

  it('déconnecte l’administrateur', async () => {
    const { user, app } = renderLayout()

    await user.click(screen.getByRole('button', { name: /Se déconnecter/ }))

    expect(app.logout).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/login')
  })

  it('ouvre et referme le tiroir de navigation mobile', async () => {
    const { user, container } = renderLayout()

    const menuButton = screen.getAllByRole('button').find((b) => b.querySelector('.lucide-menu'))!
    await user.click(menuButton)

    // La barre latérale est dupliquée dans le tiroir
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Voitures' })).toHaveLength(2))

    await user.click(container.querySelector('.fixed.inset-0 .absolute.inset-0') as HTMLElement)

    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Voitures' })).toHaveLength(1))
  })
})
