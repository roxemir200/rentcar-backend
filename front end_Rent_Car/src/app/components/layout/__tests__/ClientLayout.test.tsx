import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeAdmin, makeNotification, makeUser } from '../../../../test/factories'
import { ClientLayout } from '../ClientLayout'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

// Le chat de support ouvre un WebSocket : hors périmètre de ce test de layout.
vi.mock('../../common/SupportChat', () => ({ SupportChat: () => <div data-testid="support-chat" /> }))

const renderLayout = (app = {}, route = '/') =>
  renderWithProviders(
    <Routes>
      <Route element={<ClientLayout />}>
        <Route path="/" element={<p>Page d’accueil</p>} />
        <Route path="/cars" element={<p>Catalogue</p>} />
      </Route>
    </Routes>,
    { app, route },
  )

describe('components/ClientLayout · navigation', () => {
  it('rend la page enfant, l’en-tête et le pied de page', () => {
    renderLayout()

    expect(screen.getByText('Page d’accueil')).toBeInTheDocument()
    expect(screen.getAllByText('RentCar').length).toBeGreaterThan(0)
    expect(screen.getByText(/Tous droits réservés/)).toBeInTheDocument()
    expect(screen.getByTestId('support-chat')).toBeInTheDocument()
  })

  it('n’affiche que les entrées publiques pour un visiteur', () => {
    renderLayout()

    expect(screen.getByRole('button', { name: 'Accueil' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voitures' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mes réservations' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: "S'inscrire" })).toHaveAttribute('href', '/register')
  })

  it('ajoute les entrées authentifiées pour un client connecté', () => {
    renderLayout({ currentUser: makeUser() })

    expect(screen.getByRole('button', { name: 'Mes réservations' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paiements' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Connexion' })).not.toBeInTheDocument()
  })

  it('navigue au clic sur une entrée du menu', async () => {
    const { user } = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Voitures' }))

    expect(navigate).toHaveBeenCalledWith('/cars')
  })

  it('expose un accès à l’espace admin pour un administrateur', () => {
    renderLayout({ currentUser: makeAdmin() })

    expect(screen.getByRole('link', { name: /Admin/ })).toHaveAttribute('href', '/admin/dashboard')
  })
})

describe('components/ClientLayout · notifications et compte', () => {
  const currentUser = makeUser({ id: 'u1', firstName: 'Amine', lastName: 'Ben Salah' })

  it('affiche le nombre de notifications non lues de l’utilisateur', () => {
    renderLayout({
      currentUser,
      notifications: [
        makeNotification({ id: 'n1', userId: 'u1', read: false }),
        makeNotification({ id: 'n2', userId: 'u1', read: true }),
        makeNotification({ id: 'n3', userId: 'autre', read: false }),
      ],
    })

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('ouvre la page des notifications', async () => {
    const { user } = renderLayout({ currentUser })

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(navigate).toHaveBeenCalledWith('/notifications')
  })

  it('affiche les initiales et le menu du compte', async () => {
    const { user } = renderLayout({ currentUser })

    await user.click(screen.getByRole('button', { name: 'AB' }))

    expect(await screen.findByText('amine@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mon profil/ })).toBeInTheDocument()
  })

  it('navigue depuis le menu du compte', async () => {
    const { user } = renderLayout({ currentUser })

    await user.click(screen.getByRole('button', { name: 'AB' }))
    await user.click(await screen.findByRole('button', { name: /Mon profil/ }))

    expect(navigate).toHaveBeenCalledWith('/profile')
    await waitFor(() => expect(screen.queryByText('amine@example.com')).not.toBeInTheDocument())
  })

  it('déconnecte l’utilisateur et le renvoie vers la connexion', async () => {
    const { user, app } = renderLayout({ currentUser })

    await user.click(screen.getByRole('button', { name: 'AB' }))
    await user.click(await screen.findByRole('button', { name: /Se déconnecter/ }))

    expect(app.logout).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/login')
  })
})

describe('components/ClientLayout · menu mobile', () => {
  it('ouvre et referme le menu mobile', async () => {
    const { user } = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await screen.findByText('Menu', { selector: 'span' })).toBeInTheDocument()

    // Les liens publics sont présents dans le tiroir
    expect(screen.getAllByRole('link', { name: 'Connexion' }).length).toBeGreaterThan(0)
  })

  it('propose les raccourcis authentifiés dans le tiroir', async () => {
    const { user } = renderLayout({ currentUser: makeUser() })

    await user.click(screen.getByRole('button', { name: 'Menu' }))

    expect(await screen.findByRole('link', { name: 'Factures & documents' })).toHaveAttribute('href', '/my-documents')
    expect(screen.getByRole('link', { name: 'Changer le mot de passe' })).toHaveAttribute('href', '/change-password')
  })

  it('navigue puis referme le tiroir', async () => {
    const { user } = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const entries = await screen.findAllByRole('button', { name: 'Voitures' })
    await user.click(entries.at(-1)!)

    expect(navigate).toHaveBeenCalledWith('/cars')
  })
})
