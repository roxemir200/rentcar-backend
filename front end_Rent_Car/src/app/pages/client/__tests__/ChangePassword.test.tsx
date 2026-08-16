import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import ChangePassword from '../ChangePassword'

vi.mock('../../../api/auth.api', () => ({
  authAPI: { changePassword: vi.fn() },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const fields = () => ({
  current: screen.getByLabelText(/Mot de passe actuel/),
  next: screen.getByLabelText(/Nouveau mot de passe/),
  confirm: screen.getByLabelText(/Confirmer le nouveau mot de passe/),
  submit: screen.getByRole('button', { name: /Mettre à jour le mot de passe/ }),
})

const fill = async (
  user: ReturnType<typeof renderWithProviders>['user'],
  values: { current?: string; next?: string; confirm?: string },
) => {
  const f = fields()
  if (values.current) await user.type(f.current, values.current)
  if (values.next) await user.type(f.next, values.next)
  if (values.confirm) await user.type(f.confirm, values.confirm)
}

beforeEach(() => {
  vi.mocked(authAPI.changePassword).mockResolvedValue({ success: true })
})

describe('pages/client/ChangePassword', () => {
  it('affiche le formulaire traduit', () => {
    renderWithProviders(<ChangePassword />)

    expect(screen.getByRole('heading', { name: 'Changer le mot de passe' })).toBeInTheDocument()
    expect(fields().current).toBeInTheDocument()
    expect(fields().next).toBeInTheDocument()
    expect(fields().confirm).toBeInTheDocument()
  })

  it('bloque la soumission d’un formulaire vide (contrainte native required)', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await user.click(fields().submit)

    // Le formulaire n'a pas noValidate : le navigateur bloque l'envoi avant
    // que le gestionnaire JS ne s'exécute → aucun appel réseau.
    expect(authAPI.changePassword).not.toHaveBeenCalled()
    expect(fields().current).toBeRequired()
  })

  it('exige la confirmation quand les autres champs sont remplis', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'AncienPass1', next: 'NouveauPass1', confirm: 'NouveauPass1' })
    await user.clear(fields().confirm)
    await user.click(fields().submit)

    expect(await screen.findByText('Veuillez confirmer le mot de passe')).toBeInTheDocument()
    expect(authAPI.changePassword).not.toHaveBeenCalled()
  })

  it('refuse un nouveau mot de passe trop court', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'AncienPass1', next: '123', confirm: '123' })
    await user.click(fields().submit)

    expect(await screen.findByText('Le mot de passe doit avoir au moins 6 caractères')).toBeInTheDocument()
    expect(authAPI.changePassword).not.toHaveBeenCalled()
  })

  it('refuse une confirmation différente', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'AncienPass1', next: 'NouveauPass1', confirm: 'Different1' })
    await user.click(fields().submit)

    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    expect(authAPI.changePassword).not.toHaveBeenCalled()
  })

  it('valide un champ au floutage', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await user.click(fields().current)
    await user.tab()

    expect(await screen.findByText('Le mot de passe actuel est obligatoire')).toBeInTheDocument()
  })

  it('change le mot de passe et affiche la confirmation', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'AncienPass1', next: 'NouveauPass1!', confirm: 'NouveauPass1!' })
    await user.click(fields().submit)

    await waitFor(() =>
      expect(authAPI.changePassword).toHaveBeenCalledWith({
        currentPassword: 'AncienPass1',
        newPassword: 'NouveauPass1!',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié avec succès')
    await waitFor(() => expect(fields().current).toHaveValue(''))
    // ⚠ Le bandeau de succès est immédiatement masqué : l'effet qui surveille
    // les trois champs remet `done` à false dès que le formulaire est vidé.
    expect(screen.queryByText('Mot de passe mis à jour avec succès.')).not.toBeInTheDocument()
  })

  it('affiche le refus métier du backend sur le champ mot de passe actuel', async () => {
    vi.mocked(authAPI.changePassword).mockResolvedValue({ success: false, message: 'Mot de passe actuel incorrect' })
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'Mauvais1', next: 'NouveauPass1!', confirm: 'NouveauPass1!' })
    await user.click(fields().submit)

    expect(await screen.findByText('Mot de passe actuel incorrect')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Mot de passe actuel incorrect')
  })

  it('affiche un message par défaut quand le backend n’en fournit pas', async () => {
    vi.mocked(authAPI.changePassword).mockResolvedValue({ success: false })
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'Ancien1', next: 'NouveauPass1!', confirm: 'NouveauPass1!' })
    await user.click(fields().submit)

    expect(await screen.findByText('Erreur lors du changement')).toBeInTheDocument()
  })

  it('gère l’erreur réseau', async () => {
    vi.mocked(authAPI.changePassword).mockRejectedValue({ response: { data: { message: 'Serveur injoignable' } } })
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'Ancien1', next: 'NouveauPass1!', confirm: 'NouveauPass1!' })
    await user.click(fields().submit)

    expect(await screen.findByText('Serveur injoignable')).toBeInTheDocument()
  })

  it('affiche un message générique pour une erreur sans détail', async () => {
    vi.mocked(authAPI.changePassword).mockRejectedValue(new Error('boom'))
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { current: 'Ancien1', next: 'NouveauPass1!', confirm: 'NouveauPass1!' })
    await user.click(fields().submit)

    expect(await screen.findByText('Erreur de connexion au serveur')).toBeInTheDocument()
  })

  it('revalide la confirmation quand le nouveau mot de passe change', async () => {
    const { user } = renderWithProviders(<ChangePassword />)

    await fill(user, { next: 'NouveauPass1', confirm: 'NouveauPass1' })
    await user.type(fields().next, 'X')

    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
  })
})
