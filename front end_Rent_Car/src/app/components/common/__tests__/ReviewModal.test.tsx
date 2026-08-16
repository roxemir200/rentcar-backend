import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeCar, makeReservation, makeReview, makeUser } from '../../../../test/factories'
import { ReviewModal } from '../ReviewModal'

const currentUser = makeUser({ id: 'u1' })
const car = makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })
const reservation = makeReservation({ id: 'r1', carId: 'c1', status: 'COMPLETED' })

const setup = (appOverrides = {}, props = {}) =>
  renderWithProviders(<ReviewModal isOpen onClose={vi.fn()} reservation={reservation} {...props} />, {
    app: { currentUser, cars: [car], reviews: [], ...appOverrides },
  })

describe('components/ReviewModal', () => {
  it('ne rend rien sans réservation', () => {
    renderWithProviders(<ReviewModal isOpen onClose={vi.fn()} reservation={null} />, {
      app: { currentUser },
    })

    expect(screen.queryByText('Donner mon avis')).not.toBeInTheDocument()
  })

  it('affiche le véhicule concerné et le formulaire de notation', () => {
    setup()

    expect(screen.getByText('Donner mon avis')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText(/Commentaire \(optionnel\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publier mon avis' })).toBeInTheDocument()
  })

  it('refuse la publication sans note et affiche une erreur', async () => {
    const { user, app } = setup()

    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))

    expect(toast.error).toHaveBeenCalledWith('Merci de sélectionner une note.')
    expect(app.addReview).not.toHaveBeenCalled()
  })

  it('publie l’avis avec la note et le commentaire saisis', async () => {
    const onClose = vi.fn()
    const { user, app } = setup({}, { onClose })

    // Les 5 premiers boutons sont les étoiles de notation
    await user.click(screen.getAllByRole('button')[5])
    await user.type(screen.getByRole('textbox'), 'Excellente voiture')
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))

    await waitFor(() =>
      expect(app.addReview).toHaveBeenCalledWith({
        userId: 'u1',
        carId: 'c1',
        reservationId: 'r1',
        rating: 5,
        comment: 'Excellente voiture',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith('Avis publié ! Merci ⭐')
    expect(onClose).toHaveBeenCalled()
  })

  it('publie un avis sans commentaire (champ optionnel)', async () => {
    const { user, app } = setup()

    await user.click(screen.getAllByRole('button')[3])
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))

    await waitFor(() => expect(app.addReview).toHaveBeenCalledWith(expect.objectContaining({ rating: 3, comment: '' })))
  })

  it('ne ferme pas la fenêtre si la publication échoue', async () => {
    const onClose = vi.fn()
    const addReview = vi.fn().mockRejectedValue(new Error('500'))
    const { user } = setup({ addReview }, { onClose })

    await user.click(screen.getAllByRole('button')[5])
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))

    await waitFor(() => expect(addReview).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('signale qu’un avis a déjà été déposé pour cette réservation', () => {
    setup({ reviews: [makeReview({ reservationId: 'r1' })] })

    expect(screen.getByText('Vous avez déjà donné votre avis pour cette réservation.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publier mon avis' })).not.toBeInTheDocument()
  })

  it('compare les identifiants de réservation en ignorant le type (number vs string)', () => {
    setup({ reviews: [makeReview({ reservationId: 1 as unknown as string })] })

    // La réservation "r1" ne correspond pas à l'identifiant 1 → formulaire affiché
    expect(screen.getByRole('button', { name: 'Publier mon avis' })).toBeInTheDocument()
  })

  it('ferme la fenêtre au clic sur Annuler', async () => {
    const onClose = vi.fn()
    const { user } = setup({}, { onClose })

    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
