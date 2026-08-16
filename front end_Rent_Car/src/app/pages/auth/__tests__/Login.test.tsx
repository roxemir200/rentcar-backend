import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeAdmin, makeUser } from '../../../../test/factories'
import Login from '../Login'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

const fill = async (user: ReturnType<typeof renderWithProviders>['user'], email: string, password: string) => {
  await user.type(screen.getByLabelText(/Email/), email)
  await user.type(screen.getByLabelText(/Mot de passe/), password)
}

describe('pages/auth/Login', () => {
  it('affiche le formulaire et les liens de navigation', () => {
    renderWithProviders(<Login />)

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mot de passe/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mot de passe oublié/ })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: /S'inscrire/ })).toHaveAttribute('href', '/register')
  })

  it('désactive la soumission tant que le formulaire est incomplet', () => {
    renderWithProviders(<Login />)

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled()
  })

  it('signale un format d’email invalide', async () => {
    const { user } = renderWithProviders(<Login />)

    await fill(user, 'pas-un-email', 'Secret123!')

    expect(await screen.findByText("Format d'email invalide")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled()
  })

  it('signale un mot de passe manquant', async () => {
    const { user } = renderWithProviders(<Login />)

    await user.type(screen.getByLabelText(/Mot de passe/), 'x')
    await user.clear(screen.getByLabelText(/Mot de passe/))

    expect(await screen.findByText('Le mot de passe est obligatoire')).toBeInTheDocument()
  })

  it('connecte un client et le redirige vers le catalogue', async () => {
    const login = vi.fn().mockResolvedValue(makeUser({ role: 'CLIENT' }))
    const { user } = renderWithProviders(<Login />, { app: { login } })

    await fill(user, 'amine@example.com', 'Secret123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('amine@example.com', 'Secret123!'))
    expect(navigate).toHaveBeenCalledWith('/cars')
  })

  it('redirige un administrateur vers son tableau de bord', async () => {
    const login = vi.fn().mockResolvedValue(makeAdmin())
    const { user } = renderWithProviders(<Login />, { app: { login } })

    await fill(user, 'admin@example.com', 'Secret123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin/dashboard'))
  })

  it('ne redirige pas quand aucun utilisateur n’est retourné', async () => {
    const login = vi.fn().mockResolvedValue(null)
    const { user } = renderWithProviders(<Login />, { app: { login } })

    await fill(user, 'amine@example.com', 'Secret123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(navigate).not.toHaveBeenCalled()
  })

  it('affiche le message d’erreur renvoyé par le contexte', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Compte non vérifié'))
    const { user } = renderWithProviders(<Login />, { app: { login } })

    await fill(user, 'amine@example.com', 'Secret123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Compte non vérifié'))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('affiche un message générique si l’erreur n’en porte pas', async () => {
    const login = vi.fn().mockRejectedValue({})
    const { user } = renderWithProviders(<Login />, { app: { login } })

    await fill(user, 'amine@example.com', 'Secret123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email ou mot de passe incorrect'))
  })

  it('permet de décocher "Se souvenir de moi" (coché par défaut)', async () => {
    const { user } = renderWithProviders(<Login />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()

    await user.click(checkbox)

    expect(checkbox).not.toBeChecked()
  })

  it('affiche puis masque le mot de passe', async () => {
    const { user } = renderWithProviders(<Login />)

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))

    expect(screen.getByLabelText(/Mot de passe/)).toHaveAttribute('type', 'text')
  })
})
