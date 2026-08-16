import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import Register from '../Register'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

vi.mock('../../../api/auth.api', () => ({
  authAPI: {
    checkEmail: vi.fn().mockResolvedValue({ exists: false }),
    resendVerification: vi.fn().mockResolvedValue({ success: true }),
  },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const validForm = {
  firstName: 'Amine',
  lastName: 'Ben Salah',
  email: 'amine@example.com',
  password: 'Secret123',
  confirmPassword: 'Secret123',
}

const fillForm = async (
  user: ReturnType<typeof renderWithProviders>['user'],
  values: Partial<typeof validForm> = {},
) => {
  const v = { ...validForm, ...values }
  await user.type(screen.getByLabelText(/Prénom/), v.firstName)
  await user.type(screen.getByLabelText(/^Nom/), v.lastName)
  await user.type(screen.getByLabelText(/Email/), v.email)
  await user.type(screen.getByLabelText(/^Mot de passe/), v.password)
  await user.type(screen.getByLabelText(/Confirmer le mot de passe/), v.confirmPassword)
}

beforeEach(() => {
  vi.mocked(authAPI.checkEmail).mockResolvedValue({ exists: false })
  vi.mocked(authAPI.resendVerification).mockResolvedValue({ success: true })
})

describe('pages/auth/Register', () => {
  it('affiche tous les champs du formulaire', () => {
    renderWithProviders(<Register />)

    expect(screen.getByRole('heading', { name: 'Créer un compte' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Prénom/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nom/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Mot de passe/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirmer le mot de passe/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Se connecter/ })).toHaveAttribute('href', '/login')
  })

  it('refuse un mot de passe de moins de 6 caractères', async () => {
    const { user } = renderWithProviders(<Register />)

    await user.type(screen.getByLabelText(/^Mot de passe/), '123')

    expect(await screen.findByText('Le mot de passe doit avoir au moins 6 caractères')).toBeInTheDocument()
  })

  it('refuse deux mots de passe différents', async () => {
    const { user } = renderWithProviders(<Register />)

    await fillForm(user, { confirmPassword: 'Autre123' })

    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Créer mon compte/ })).toBeDisabled()
  })

  it('signale un email déjà utilisé et bloque la soumission', async () => {
    vi.mocked(authAPI.checkEmail).mockResolvedValue({ exists: true })
    const { user } = renderWithProviders(<Register />)

    await fillForm(user)

    expect(await screen.findByText('Cet email est déjà utilisé', {}, { timeout: 3000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /Créer mon compte/ })).toBeDisabled())
  })

  it('ignore la vérification pour un email syntaxiquement invalide', async () => {
    const { user } = renderWithProviders(<Register />)

    await user.type(screen.getByLabelText(/Email/), 'pas-un-email')

    await new Promise((r) => setTimeout(r, 700))
    expect(authAPI.checkEmail).not.toHaveBeenCalled()
  })

  it('absorbe une erreur de vérification d’email', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(authAPI.checkEmail).mockRejectedValue(new Error('500'))
    const { user } = renderWithProviders(<Register />)

    await fillForm(user)

    await waitFor(() => expect(authAPI.checkEmail).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByText('Cet email est déjà utilisé')).not.toBeInTheDocument()
  })

  it('inscrit l’utilisateur et affiche l’écran de vérification', async () => {
    const register = vi.fn().mockResolvedValue({ ok: true })
    const { user } = renderWithProviders(<Register />, { app: { register } })

    await fillForm(user)
    await waitFor(() => expect(screen.getByRole('button', { name: /Créer mon compte/ })).toBeEnabled(), { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: /Créer mon compte/ }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        firstName: 'Amine',
        lastName: 'Ben Salah',
        email: 'amine@example.com',
        password: 'Secret123',
      }),
    )
    expect(await screen.findByText('📧 Vérifiez votre boîte mail')).toBeInTheDocument()
    expect(screen.getByText('amine@example.com')).toBeInTheDocument()
  })

  it('reste sur le formulaire si l’inscription échoue', async () => {
    const register = vi.fn().mockResolvedValue({ ok: false, error: 'Email déjà utilisé' })
    const { user } = renderWithProviders(<Register />, { app: { register } })

    await fillForm(user)
    await waitFor(() => expect(screen.getByRole('button', { name: /Créer mon compte/ })).toBeEnabled(), { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: /Créer mon compte/ }))

    await waitFor(() => expect(register).toHaveBeenCalled())
    expect(screen.queryByText('📧 Vérifiez votre boîte mail')).not.toBeInTheDocument()
  })

  describe('écran de confirmation', () => {
    const reachSuccessScreen = async () => {
      const register = vi.fn().mockResolvedValue({ ok: true })
      const utils = renderWithProviders(<Register />, { app: { register } })
      await fillForm(utils.user)
      await waitFor(() => expect(screen.getByRole('button', { name: /Créer mon compte/ })).toBeEnabled(), { timeout: 3000 })
      await utils.user.click(screen.getByRole('button', { name: /Créer mon compte/ }))
      await screen.findByText('📧 Vérifiez votre boîte mail')
      return utils
    }

    it('renvoie l’email de vérification', async () => {
      const { user } = await reachSuccessScreen()

      await user.click(screen.getByRole('button', { name: 'Renvoyer' }))

      await waitFor(() => expect(authAPI.resendVerification).toHaveBeenCalledWith('amine@example.com'))
      expect(toast.success).toHaveBeenCalledWith('Un nouvel email de vérification a été envoyé !')
    })

    it('signale un refus du serveur lors du renvoi', async () => {
      vi.mocked(authAPI.resendVerification).mockResolvedValue({ success: false, message: 'Trop de tentatives' })
      const { user } = await reachSuccessScreen()

      await user.click(screen.getByRole('button', { name: 'Renvoyer' }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trop de tentatives'))
    })

    it('signale une erreur réseau lors du renvoi', async () => {
      vi.mocked(authAPI.resendVerification).mockRejectedValue({ response: { data: { message: 'Service indisponible' } } })
      const { user } = await reachSuccessScreen()

      await user.click(screen.getByRole('button', { name: 'Renvoyer' }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Service indisponible'))
    })

    it('ramène vers la page de connexion', async () => {
      const { user } = await reachSuccessScreen()

      await user.click(screen.getByRole('button', { name: 'Retour à la connexion' }))

      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })
})
