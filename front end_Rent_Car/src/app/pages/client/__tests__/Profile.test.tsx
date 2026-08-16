import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeUser } from '../../../../test/factories'
import Profile from '../Profile'

vi.mock('../../../api/auth.api', () => ({
  authAPI: { checkPhone: vi.fn() },
  toFrontendUser: (p: unknown) => p,
}))

import { authAPI } from '../../../api/auth.api'

const currentUser = makeUser({
  id: 'u1',
  firstName: 'Amine',
  lastName: 'Ben Salah',
  email: 'amine@example.com',
  phone: '+216 20 123 456',
  address: '12 rue de Tunis',
  licenseNumber: 'LIC-4421',
})

const renderPage = (app = {}) => renderWithProviders(<Profile />, { app: { currentUser, ...app } })

beforeEach(() => {
  vi.mocked(authAPI.checkPhone).mockResolvedValue({ exists: false })
})

describe('pages/client/Profile', () => {
  it('n’affiche rien sans utilisateur connecté', () => {
    const { container } = renderWithProviders(<Profile />, { app: { currentUser: null } })

    expect(container).toBeEmptyDOMElement()
  })

  it('affiche l’identité, les initiales et la date d’inscription', () => {
    renderPage()

    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText(/Membre depuis le/)).toBeInTheDocument()
  })

  it('pré-remplit le formulaire avec les données du profil', () => {
    renderPage()

    expect(screen.getByLabelText(/Prénom/)).toHaveValue('Amine')
    expect(screen.getByLabelText(/^Nom/)).toHaveValue('Ben Salah')
    expect(screen.getByLabelText(/Téléphone/)).toHaveValue('+216 20 123 456')
    expect(screen.getByLabelText(/Adresse$/)).toHaveValue('12 rue de Tunis')
    expect(screen.getByLabelText(/Numéro de permis/)).toHaveValue('LIC-4421')
  })

  it('verrouille l’adresse e-mail', () => {
    renderPage()

    const email = screen.getByLabelText(/Adresse e-mail/)
    expect(email).toHaveValue('amine@example.com')
    expect(email).toBeDisabled()
    expect(screen.getByText('L\'adresse e-mail ne peut pas être modifiée.')).toBeInTheDocument()
  })

  it('indique un profil à jour tant qu’aucune modification n’est faite', () => {
    renderPage()

    expect(screen.getByText('Profil à jour')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réinitialiser/ })).toBeDisabled()
  })

  it('signale les modifications non enregistrées', async () => {
    const { user } = renderPage()

    await user.type(screen.getByLabelText(/Prénom/), 'e')

    expect(await screen.findByText('Modifications non enregistrées')).toBeInTheDocument()
  })

  it('annule les modifications au clic sur Réinitialiser', async () => {
    const { user } = renderPage()

    await user.clear(screen.getByLabelText(/Prénom/))
    await user.type(screen.getByLabelText(/Prénom/), 'Sofia')
    await user.click(screen.getByRole('button', { name: /Réinitialiser/ }))

    await waitFor(() => expect(screen.getByLabelText(/Prénom/)).toHaveValue('Amine'))
  })

  it('exige un prénom et n’enregistre pas un formulaire invalide', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ok: true })
    const { user } = renderPage({ updateProfile })

    await user.clear(screen.getByLabelText(/Prénom/))
    expect(await screen.findByText('Le prénom est obligatoire')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('exige un nom', async () => {
    const { user } = renderPage()

    await user.clear(screen.getByLabelText(/^Nom/))

    expect(await screen.findByText('Le nom est obligatoire')).toBeInTheDocument()
  })

  it('formate automatiquement le téléphone tunisien', async () => {
    const { user } = renderPage()

    const phone = screen.getByLabelText(/Téléphone/)
    await user.clear(phone)
    await user.type(phone, '98765432')

    await waitFor(() => expect(phone).toHaveValue('+216 98 765 432'))
  })

  it('refuse un numéro de téléphone incomplet', async () => {
    const { user } = renderPage()

    const phone = screen.getByLabelText(/Téléphone/)
    await user.clear(phone)
    await user.type(phone, '98')

    expect(await screen.findByText('Numéro invalide')).toBeInTheDocument()
  })

  it('signale un numéro déjà utilisé et bloque l’enregistrement', async () => {
    vi.mocked(authAPI.checkPhone).mockResolvedValue({ exists: true })
    const { user } = renderPage()

    const phone = screen.getByLabelText(/Téléphone/)
    await user.clear(phone)
    await user.type(phone, '98765432')

    expect(await screen.findByText('Ce numéro de téléphone est déjà utilisé', {}, { timeout: 3000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled())
  })

  it('ne vérifie pas le numéro déjà associé au compte', async () => {
    const { user } = renderPage()

    await user.type(screen.getByLabelText(/Adresse$/), ' bis')
    await new Promise((r) => setTimeout(r, 700))

    expect(authAPI.checkPhone).not.toHaveBeenCalled()
  })

  it('absorbe une erreur de vérification du numéro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(authAPI.checkPhone).mockRejectedValue(new Error('500'))
    const { user } = renderPage()

    const phone = screen.getByLabelText(/Téléphone/)
    await user.clear(phone)
    await user.type(phone, '98765432')

    await waitFor(() => expect(authAPI.checkPhone).toHaveBeenCalled(), { timeout: 3000 })
    expect(screen.queryByText('Ce numéro de téléphone est déjà utilisé')).not.toBeInTheDocument()
  })

  it('enregistre le profil nettoyé', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ok: true })
    const { user } = renderPage({ updateProfile })

    await user.clear(screen.getByLabelText(/Prénom/))
    await user.type(screen.getByLabelText(/Prénom/), '  Sofia  ')
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Sofia',
        lastName: 'Ben Salah',
        phone: '+216 20 123 456',
        address: '12 rue de Tunis',
        licenseNumber: 'LIC-4421',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Profil mis à jour avec succès.')
  })

  it('envoie undefined pour les champs optionnels vidés', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ok: true })
    const { user } = renderPage({ updateProfile })

    await user.clear(screen.getByLabelText(/Adresse$/))
    await user.clear(screen.getByLabelText(/Numéro de permis/))
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ address: undefined, licenseNumber: undefined }),
      ),
    )
  })

  it('affiche l’erreur retournée par le contexte', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ok: false, error: 'Téléphone déjà utilisé' })
    const { user } = renderPage({ updateProfile })

    await user.type(screen.getByLabelText(/Prénom/), 'e')
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Téléphone déjà utilisé'))
  })

  it('affiche un message générique si aucune raison n’est fournie', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ok: false })
    const { user } = renderPage({ updateProfile })

    await user.type(screen.getByLabelText(/Prénom/), 'e')
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La mise à jour du profil a échoué.'))
  })
})
