import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import ForgotPassword from '../ForgotPassword'

vi.mock('../../../api/auth.api', () => ({
  authAPI: { forgotPassword: vi.fn() },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const submit = async (user: ReturnType<typeof renderWithProviders>['user'], email = 'amine@example.com') => {
  await user.type(screen.getByPlaceholderText('vous@exemple.com'), email)
  await user.click(screen.getByRole('button', { name: /Envoyer le lien/ }))
}

beforeEach(() => {
  vi.mocked(authAPI.forgotPassword).mockResolvedValue({ success: true })
})

describe('pages/auth/ForgotPassword', () => {
  it('affiche le formulaire de demande', () => {
    renderWithProviders(<ForgotPassword />)

    expect(screen.getByRole('heading', { name: 'Mot de passe oublié' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('vous@exemple.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour à la connexion/ })).toHaveAttribute('href', '/login')
  })

  it('envoie la demande et affiche l’écran de confirmation', async () => {
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)

    await waitFor(() => expect(authAPI.forgotPassword).toHaveBeenCalledWith('amine@example.com'))
    expect(await screen.findByText('Email envoyé ! 🎉')).toBeInTheDocument()
    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Un lien de réinitialisation a été envoyé')
  })

  it('affiche le message d’erreur métier renvoyé par le backend', async () => {
    vi.mocked(authAPI.forgotPassword).mockResolvedValue({ success: false, message: 'Compte introuvable' })
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)

    expect(await screen.findByText('Compte introuvable')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Compte introuvable')
    expect(screen.queryByText('Email envoyé ! 🎉')).not.toBeInTheDocument()
  })

  it('affiche un message par défaut quand le backend n’en fournit pas', async () => {
    vi.mocked(authAPI.forgotPassword).mockResolvedValue({ success: false })
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)

    expect(await screen.findByText('Une erreur est survenue')).toBeInTheDocument()
  })

  it('gère une erreur réseau', async () => {
    vi.mocked(authAPI.forgotPassword).mockRejectedValue({ response: { data: { message: 'Service indisponible' } } })
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)

    expect(await screen.findByText('Service indisponible')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Service indisponible')
  })

  it('affiche un message générique pour une erreur sans détail', async () => {
    vi.mocked(authAPI.forgotPassword).mockRejectedValue(new Error('boom'))
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)

    expect(await screen.findByText('Erreur de connexion')).toBeInTheDocument()
  })

  it('propose de revenir à la connexion depuis l’écran de confirmation', async () => {
    const { user } = renderWithProviders(<ForgotPassword />)

    await submit(user)
    await screen.findByText('Email envoyé ! 🎉')

    expect(screen.getByRole('link', { name: /Retour à la connexion/ })).toHaveAttribute('href', '/login')
  })
})
