import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import ResetPassword from '../ResetPassword'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/auth.api', () => ({
  authAPI: { verifyResetToken: vi.fn(), resetPassword: vi.fn() },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const renderPage = (route = '/reset-password?token=tok-1') =>
  renderWithProviders(<ResetPassword />, { route })

const fillPasswords = async (
  user: ReturnType<typeof renderWithProviders>['user'],
  pwd: string,
  confirm = pwd,
) => {
  await user.type(screen.getByPlaceholderText('Minimum 6 caractères'), pwd)
  await user.type(screen.getByPlaceholderText('Répétez votre mot de passe'), confirm)
  await user.click(screen.getByRole('button', { name: /Réinitialiser le mot de passe/ }))
}

beforeEach(() => {
  vi.mocked(authAPI.verifyResetToken).mockResolvedValue({ success: true })
  vi.mocked(authAPI.resetPassword).mockResolvedValue({ success: true })
})

describe('pages/auth/ResetPassword · validation du lien', () => {
  it('affiche un écran de vérification pendant le contrôle du token', () => {
    vi.mocked(authAPI.verifyResetToken).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Vérification du lien...')).toBeInTheDocument()
  })

  it('rejette l’accès quand le token est absent de l’URL', async () => {
    renderPage('/reset-password')

    expect(await screen.findByText('Lien expiré ou invalide')).toBeInTheDocument()
    expect(authAPI.verifyResetToken).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Renvoyer un lien/ })).toHaveAttribute('href', '/forgot-password')
  })

  it('rejette l’accès quand le backend invalide le token', async () => {
    vi.mocked(authAPI.verifyResetToken).mockResolvedValue({ success: false })

    renderPage()

    expect(await screen.findByText('Lien expiré ou invalide')).toBeInTheDocument()
  })

  it('rejette l’accès quand la vérification échoue', async () => {
    vi.mocked(authAPI.verifyResetToken).mockRejectedValue(new Error('500'))

    renderPage()

    expect(await screen.findByText('Lien expiré ou invalide')).toBeInTheDocument()
  })

  it('affiche le formulaire quand le token est valide', async () => {
    renderPage()

    expect(await screen.findByPlaceholderText('Minimum 6 caractères')).toBeInTheDocument()
    expect(authAPI.verifyResetToken).toHaveBeenCalledWith('tok-1')
  })
})

describe('pages/auth/ResetPassword · soumission', () => {
  const readyForm = async () => {
    const utils = renderPage()
    await screen.findByPlaceholderText('Minimum 6 caractères')
    return utils
  }

  it('refuse un mot de passe trop court sans appeler le backend', async () => {
    const { user } = await readyForm()

    await fillPasswords(user, '123')

    expect(await screen.findAllByText('Le mot de passe doit avoir au moins 6 caractères')).not.toHaveLength(0)
    expect(authAPI.resetPassword).not.toHaveBeenCalled()
  })

  it('refuse deux mots de passe différents', async () => {
    const { user } = await readyForm()

    await fillPasswords(user, 'Secret123', 'Autre123')

    expect(await screen.findAllByText('Les mots de passe ne correspondent pas')).not.toHaveLength(0)
    expect(authAPI.resetPassword).not.toHaveBeenCalled()
  })

  it('réinitialise le mot de passe puis redirige vers la connexion', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await readyForm()

    await fillPasswords(user, 'Secret123')

    await waitFor(() => expect(authAPI.resetPassword).toHaveBeenCalledWith('tok-1', 'Secret123'))
    expect(toast.success).toHaveBeenCalledWith('Mot de passe réinitialisé avec succès !')

    await vi.advanceTimersByTimeAsync(1500)
    expect(navigate).toHaveBeenCalledWith('/login')
    vi.useRealTimers()
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(authAPI.resetPassword).mockResolvedValue({ success: false, message: 'Lien déjà utilisé' })
    const { user } = await readyForm()

    await fillPasswords(user, 'Secret123')

    expect(await screen.findAllByText('Lien déjà utilisé')).not.toHaveLength(0)
    expect(toast.error).toHaveBeenCalledWith('Lien déjà utilisé')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('gère une erreur réseau', async () => {
    vi.mocked(authAPI.resetPassword).mockRejectedValue({ response: { data: { message: 'Serveur injoignable' } } })
    const { user } = await readyForm()

    await fillPasswords(user, 'Secret123')

    expect(await screen.findAllByText('Serveur injoignable')).not.toHaveLength(0)
  })

  it('affiche un message générique pour une erreur sans détail', async () => {
    vi.mocked(authAPI.resetPassword).mockRejectedValue(new Error('boom'))
    const { user } = await readyForm()

    await fillPasswords(user, 'Secret123')

    expect(await screen.findAllByText('Erreur de connexion')).not.toHaveLength(0)
  })
})
