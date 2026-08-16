import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import VerifyEmail from '../VerifyEmail'
import { AuthShell } from '../AuthShell'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/auth.api', () => ({
  authAPI: { verifyEmail: vi.fn() },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const renderPage = (route = '/verify-email?token=tok-1') =>
  renderWithProviders(<VerifyEmail />, { route })

beforeEach(() => {
  vi.mocked(authAPI.verifyEmail).mockResolvedValue({ success: true, message: 'Email vérifié avec succès !' })
})

describe('pages/auth/VerifyEmail', () => {
  it('affiche un écran de chargement pendant la vérification', () => {
    vi.mocked(authAPI.verifyEmail).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Vérification de votre email...')).toBeInTheDocument()
  })

  it('confirme la vérification et propose de se connecter', async () => {
    const { user } = renderPage()

    expect(await screen.findByRole('heading', { name: 'Email vérifié avec succès !' })).toBeInTheDocument()
    expect(authAPI.verifyEmail).toHaveBeenCalledWith('tok-1')
    expect(toast.success).toHaveBeenCalledWith('Email vérifié ! Vous pouvez maintenant vous connecter.')

    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(navigate).toHaveBeenCalledWith('/login')
  })

  it('signale un token manquant sans appeler le backend', async () => {
    renderPage('/verify-email')

    expect(await screen.findByRole('heading', { name: 'Token de vérification manquant' })).toBeInTheDocument()
    expect(authAPI.verifyEmail).not.toHaveBeenCalled()
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(authAPI.verifyEmail).mockResolvedValue({ success: false, message: 'Token expiré' })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Token expiré' })).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Token expiré')
  })

  it('affiche un message par défaut quand le backend n’en fournit pas', async () => {
    vi.mocked(authAPI.verifyEmail).mockResolvedValue({ success: false })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Token invalide ou expiré' })).toBeInTheDocument()
  })

  it('gère une erreur réseau et renvoie vers l’inscription', async () => {
    vi.mocked(authAPI.verifyEmail).mockRejectedValue({ response: { data: { message: 'Service indisponible' } } })

    const { user } = renderPage()

    expect(await screen.findByRole('heading', { name: 'Service indisponible' })).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Erreur de vérification')

    await user.click(screen.getByRole('button', { name: 'Créer un nouveau compte' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/register'))
    expect(screen.getByRole('link', { name: /Retour à la connexion/ })).toHaveAttribute('href', '/login')
  })

  it('affiche un message générique pour une erreur sans détail', async () => {
    vi.mocked(authAPI.verifyEmail).mockRejectedValue(new Error('boom'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Une erreur est survenue lors de la vérification' })).toBeInTheDocument()
  })
})

describe('pages/auth/AuthShell', () => {
  it('affiche le titre, le sous-titre et le contenu', () => {
    renderWithProviders(
      <AuthShell title="Connexion" subtitle="Content de vous revoir">
        <p>Formulaire</p>
      </AuthShell>,
    )

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(screen.getByText('Content de vous revoir')).toBeInTheDocument()
    expect(screen.getByText('Formulaire')).toBeInTheDocument()
  })

  it('affiche les arguments de réassurance et le lien vers l’accueil', () => {
    renderWithProviders(<AuthShell title="T" subtitle="S"><span /></AuthShell>)

    expect(screen.getByText('Assurance tous risques incluse')).toBeInTheDocument()
    expect(screen.getByText('Réservation instantanée 24h/24')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /RentCar/ })[0]).toHaveAttribute('href', '/')
  })
})
