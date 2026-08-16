import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { makeCar, makeCategory } from '../../../../test/factories'
import AdminCars from '../AdminCars'

const categories = [makeCategory({ id: '1', name: 'Citadine' }), makeCategory({ id: '2', name: 'SUV' })]

const fleet = [
  makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', plate: 'AB-123-CD', status: 'AVAILABLE', pricePerDay: 120, category: 'Citadine', categoryId: '1' }),
  makeCar({ id: 'c2', brand: 'Kia', model: 'Sportage', plate: 'EF-456-GH', status: 'RENTED', pricePerDay: 200, category: 'SUV', categoryId: '2' }),
]

const renderPage = (app = {}) =>
  renderWithProviders(<AdminCars />, { app: { cars: fleet, categories, ...app } })

const openCreateModal = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.click(screen.getByRole('button', { name: /Ajouter une voiture/ }))
  return screen.findByText('Ajouter une voiture', { selector: 'h3' })
}

/** Ajoute une image via l'input fichier caché (converti en data URL). */
const uploadImage = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  const file = new File(['contenu'], 'voiture.png', { type: 'image/png' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)
  await screen.findByAltText('image 1')
}

describe('pages/admin/AdminCars · liste', () => {
  it('affiche le parc avec ses informations', () => {
    renderPage()

    expect(screen.getByText('2 véhicule(s)')).toBeInTheDocument()
    expect(screen.getByText(/Renault Clio/)).toBeInTheDocument()
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument()
    expect(screen.getByText('120 DT')).toBeInTheDocument()
    // "Disponible" apparaît aussi dans le filtre de statut
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Louée').length).toBeGreaterThan(0)
  })

  it('affiche un état vide sans voiture', () => {
    renderPage({ cars: [] })

    expect(screen.getByRole('heading', { name: 'Aucune voiture' })).toBeInTheDocument()
  })

  it('recherche par marque, modèle ou immatriculation', async () => {
    const { user } = renderPage()

    await user.type(screen.getByPlaceholderText('Rechercher...'), 'sportage')

    await waitFor(() => expect(screen.queryByText(/Renault Clio/)).not.toBeInTheDocument())
    expect(screen.getByText(/Kia Sportage/)).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText('Rechercher...'))
    await user.type(screen.getByPlaceholderText('Rechercher...'), 'ab-123')

    await waitFor(() => expect(screen.getByText(/Renault Clio/)).toBeInTheDocument())
  })

  it('filtre par statut', async () => {
    const { user } = renderPage()

    await user.selectOptions(screen.getByRole('combobox'), 'RENTED')

    await waitFor(() => expect(screen.queryByText(/Renault Clio/)).not.toBeInTheDocument())
    expect(screen.getByText(/Kia Sportage/)).toBeInTheDocument()
  })

  it('affiche un état vide quand la recherche ne donne rien', async () => {
    const { user } = renderPage()

    await user.type(screen.getByPlaceholderText('Rechercher...'), 'introuvable')

    expect(await screen.findByRole('heading', { name: 'Aucune voiture' })).toBeInTheDocument()
  })
})

describe('pages/admin/AdminCars · création', () => {
  it('ouvre un formulaire vierge', async () => {
    const { user } = renderPage()

    await openCreateModal(user)

    expect(screen.getByLabelText(/Marque/)).toHaveValue('')
    expect(screen.getByLabelText(/Places/)).toHaveValue(5)
  })

  it('exige les champs obligatoires', async () => {
    const { user, app } = renderPage()
    await openCreateModal(user)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('La marque est obligatoire')).toBeInTheDocument()
    expect(screen.getByText('Le modèle est obligatoire')).toBeInTheDocument()
    expect(screen.getByText("Le numéro d'immatriculation est obligatoire")).toBeInTheDocument()
    expect(screen.getByText('La catégorie est obligatoire')).toBeInTheDocument()
    expect(app.saveCar).not.toHaveBeenCalled()
  })

  it('exige au moins une image', async () => {
    const { user, app } = renderPage()
    await openCreateModal(user)

    await user.type(screen.getByLabelText(/Marque/), 'Peugeot')
    await user.type(screen.getByLabelText(/Modèle/), '208')
    await user.type(screen.getByLabelText(/Immatriculation/), 'ZZ-999-ZZ')
    await user.type(screen.getByLabelText(/Prix \/ jour/), '90')
    await user.selectOptions(screen.getByLabelText(/Catégorie/), '1')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Une image principale est obligatoire.')).toBeInTheDocument()
    expect(app.saveCar).not.toHaveBeenCalled()
  })

  it('refuse un tarif journalier nul', async () => {
    const { user } = renderPage()
    await openCreateModal(user)

    await user.type(screen.getByLabelText(/Prix \/ jour/), '0')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Doit être positif')).toBeInTheDocument()
  })

  it('enregistre la voiture en traduisant les valeurs backend', async () => {
    const { user, app } = renderPage()
    await openCreateModal(user)

    await user.type(screen.getByLabelText(/Marque/), 'Peugeot')
    await user.type(screen.getByLabelText(/Modèle/), '208')
    await user.type(screen.getByLabelText(/Immatriculation/), 'ZZ-999-ZZ')
    await user.type(screen.getByLabelText(/Prix \/ jour/), '90')
    await user.selectOptions(screen.getByLabelText(/Carburant/), 'DIESEL')
    await user.selectOptions(screen.getByLabelText(/Transmission/), 'MANUAL')
    await user.selectOptions(screen.getByLabelText(/Catégorie/), '2')
    await uploadImage(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(app.saveCar).toHaveBeenCalledWith(
        expect.objectContaining({
          brand: 'Peugeot',
          model: '208',
          plate: 'ZZ-999-ZZ',
          fuel: 'Diesel',
          transmission: 'Manuelle',
          categoryId: '2',
          category: 'SUV',
          images: [expect.stringContaining('data:image/png')],
        }),
      ),
    )
    await waitFor(() => expect(screen.queryByText('Ajouter une voiture', { selector: 'h3' })).not.toBeInTheDocument())
  })

  it('garde la fenêtre ouverte si l’enregistrement échoue', async () => {
    const saveCar = vi.fn().mockRejectedValue(new Error('500'))
    const { user } = renderPage({ saveCar })
    await openCreateModal(user)

    await user.type(screen.getByLabelText(/Marque/), 'Peugeot')
    await user.type(screen.getByLabelText(/Modèle/), '208')
    await user.type(screen.getByLabelText(/Immatriculation/), 'ZZ-999-ZZ')
    await user.type(screen.getByLabelText(/Prix \/ jour/), '90')
    await user.selectOptions(screen.getByLabelText(/Catégorie/), '1')
    await uploadImage(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(saveCar).toHaveBeenCalled())
    expect(screen.getByText('Ajouter une voiture', { selector: 'h3' })).toBeInTheDocument()
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    const { user, app } = renderPage()
    await openCreateModal(user)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByText('Ajouter une voiture', { selector: 'h3' })).not.toBeInTheDocument())
    expect(app.saveCar).not.toHaveBeenCalled()
  })
})

describe('pages/admin/AdminCars · édition', () => {
  const openEdit = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    const row = screen.getByText(/Renault Clio/).closest('tr')!
    await user.click(within(row).getAllByRole('button')[0])
    return screen.findByText('Modifier la voiture')
  }

  it('pré-remplit le formulaire avec la voiture sélectionnée', async () => {
    const { user } = renderPage()

    await openEdit(user)

    expect(screen.getByLabelText(/Marque/)).toHaveValue('Renault')
    expect(screen.getByLabelText(/Immatriculation/)).toHaveValue('AB-123-CD')
    expect(screen.getByLabelText(/Carburant/)).toHaveValue('GASOLINE')
    expect(screen.getByLabelText(/Transmission/)).toHaveValue('MANUAL')
    expect(screen.getByLabelText(/Catégorie/)).toHaveValue('1')
  })

  it('conserve l’identifiant lors de la mise à jour', async () => {
    const { user, app } = renderPage()
    await openEdit(user)

    await user.clear(screen.getByLabelText(/Modèle/))
    await user.type(screen.getByLabelText(/Modèle/), 'Clio V')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(app.saveCar).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', model: 'Clio V' })),
    )
  })

  it('traduit les valeurs des voitures électriques et hybrides', async () => {
    const { user, app } = renderPage({
      cars: [makeCar({ id: 'c1', brand: 'Tesla', model: '3', fuel: 'Électrique', transmission: 'Automatique', categoryId: '1' })],
    })

    const row = screen.getByText(/Tesla 3/).closest('tr')!
    await user.click(within(row).getAllByRole('button')[0])
    await screen.findByText('Modifier la voiture')
    expect(screen.getByLabelText(/Carburant/)).toHaveValue('ELECTRIC')

    await user.selectOptions(screen.getByLabelText(/Carburant/), 'HYBRID')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(app.saveCar).toHaveBeenCalledWith(expect.objectContaining({ fuel: 'Hybride' })))
  })
})

describe('pages/admin/AdminCars · galerie du formulaire', () => {
  const openWithImage = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await openCreateModal(user)
    await uploadImage(user)
  }

  it('marque la première image comme principale', async () => {
    const { user } = renderPage()
    await openWithImage(user)

    expect(screen.getByText('Principale')).toBeInTheDocument()
  })

  it('permet de promouvoir une image secondaire', async () => {
    const { user } = renderPage({
      cars: [makeCar({ id: 'c1', brand: 'Renault', model: 'Clio', images: ['https://cdn/1.jpg', 'https://cdn/2.jpg'], categoryId: '1' })],
    })

    const row = screen.getByText(/Renault Clio/).closest('tr')!
    await user.click(within(row).getAllByRole('button')[0])
    await screen.findByText('Modifier la voiture')

    await user.click(screen.getByRole('button', { name: 'Définir principale' }))

    await waitFor(() => expect(screen.getByAltText('image 1')).toHaveAttribute('src', 'https://cdn/2.jpg'))
  })

  it('permet de retirer une image', async () => {
    const { user } = renderPage()
    await openWithImage(user)

    const gallery = screen.getByAltText('image 1').closest('div')!
    await user.click(within(gallery).getAllByRole('button').at(-1)!)

    await waitFor(() => expect(screen.queryByAltText('image 1')).not.toBeInTheDocument())
  })
})

describe('pages/admin/AdminCars · suppression', () => {
  const openDelete = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    const row = screen.getByText(/Renault Clio/).closest('tr')!
    await user.click(within(row).getAllByRole('button')[1])
    return screen.findByText('Supprimer la voiture')
  }

  it('demande confirmation', async () => {
    const { user, app } = renderPage()

    await openDelete(user)

    expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    expect(app.deleteCar).not.toHaveBeenCalled()
  })

  it('supprime la voiture confirmée', async () => {
    const { user, app } = renderPage()
    await openDelete(user)

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(app.deleteCar).toHaveBeenCalledWith('c1'))
    await waitFor(() => expect(screen.queryByText('Supprimer la voiture')).not.toBeInTheDocument())
  })

  it('referme la fenêtre même si la suppression échoue', async () => {
    const deleteCar = vi.fn().mockRejectedValue(new Error('409'))
    const { user } = renderPage({ deleteCar })
    await openDelete(user)

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(deleteCar).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Supprimer la voiture')).not.toBeInTheDocument())
  })
})
