import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { makeCategory } from '../../../../test/factories'
import AdminCategories from '../AdminCategories'

const categories = [
  makeCategory({ id: '1', name: 'Économique', description: 'Petites voitures' }),
  makeCategory({ id: '2', name: 'SUV', description: 'Grands véhicules' }),
]

const renderPage = (app = {}) => renderWithProviders(<AdminCategories />, { app: { categories, ...app } })

describe('pages/admin/AdminCategories · liste', () => {
  it('affiche un état vide sans catégorie', () => {
    renderPage({ categories: [] })

    expect(screen.getByRole('heading', { name: 'Aucune catégorie' })).toBeInTheDocument()
    expect(screen.getByText('0 catégories')).toBeInTheDocument()
  })

  it('liste les catégories existantes', () => {
    renderPage()

    expect(screen.getByText('Économique')).toBeInTheDocument()
    expect(screen.getByText('Petites voitures')).toBeInTheDocument()
    expect(screen.getByText('2 catégories')).toBeInTheDocument()
  })
})

describe('pages/admin/AdminCategories · création et édition', () => {
  it('ouvre un formulaire vierge pour une nouvelle catégorie', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))

    expect(await screen.findByText('Ajouter une catégorie', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nom/)).toHaveValue('')
  })

  it('pré-remplit le formulaire lors d’une modification', async () => {
    const { user } = renderPage()

    await user.click(screen.getAllByRole('button')[1]) // crayon de la première ligne

    expect(await screen.findByText('Modifier la catégorie')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nom/)).toHaveValue('Économique')
    expect(screen.getByLabelText(/Description/)).toHaveValue('Petites voitures')
  })

  it('exige un nom de catégorie', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Le nom de la catégorie est obligatoire')).toBeInTheDocument()
    expect(app.saveCategory).not.toHaveBeenCalled()
  })

  it('refuse un nom composé uniquement d’espaces', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))
    await user.type(await screen.findByLabelText(/Nom/), '   ')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Le nom ne peut pas être vide')).toBeInTheDocument()
    expect(app.saveCategory).not.toHaveBeenCalled()
  })

  it('enregistre une nouvelle catégorie en supprimant les espaces superflus', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))
    await user.type(await screen.findByLabelText(/Nom/), '  Cabriolet  ')
    await user.type(screen.getByLabelText(/Description/), ' Décapotable ')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(app.saveCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: '', name: 'Cabriolet', description: 'Décapotable' }),
      ),
    )
    await waitFor(() => expect(screen.queryByText('Ajouter une catégorie', { selector: 'h3' })).not.toBeInTheDocument())
  })

  it('conserve l’identifiant lors d’une modification', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getAllByRole('button')[1])
    await user.clear(await screen.findByLabelText(/Nom/))
    await user.type(screen.getByLabelText(/Nom/), 'Éco+')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(app.saveCategory).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Éco+' })),
    )
  })

  it('garde la fenêtre ouverte si l’enregistrement échoue', async () => {
    const saveCategory = vi.fn().mockRejectedValue(new Error('500'))
    const { user } = renderPage({ saveCategory })

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))
    await user.type(await screen.findByLabelText(/Nom/), 'Cabriolet')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(saveCategory).toHaveBeenCalled())
    expect(screen.getByText('Ajouter une catégorie', { selector: 'h3' })).toBeInTheDocument()
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getByRole('button', { name: /Ajouter une catégorie/ }))
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByText('Ajouter une catégorie', { selector: 'h3' })).not.toBeInTheDocument())
    expect(app.saveCategory).not.toHaveBeenCalled()
  })
})

describe('pages/admin/AdminCategories · suppression', () => {
  it('demande confirmation avant de supprimer', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getAllByRole('button')[2]) // corbeille de la première ligne

    expect(await screen.findByText('Supprimer la catégorie')).toBeInTheDocument()
    expect(app.deleteCategory).not.toHaveBeenCalled()
  })

  it('supprime la catégorie confirmée', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getAllByRole('button')[2])
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(app.deleteCategory).toHaveBeenCalledWith('1'))
    await waitFor(() => expect(screen.queryByText('Supprimer la catégorie')).not.toBeInTheDocument())
  })

  it('referme la fenêtre même si la suppression échoue', async () => {
    const deleteCategory = vi.fn().mockRejectedValue(new Error('409'))
    const { user } = renderPage({ deleteCategory })

    await user.click(screen.getAllByRole('button')[2])
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(deleteCategory).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Supprimer la catégorie')).not.toBeInTheDocument())
  })

  it('annule la suppression', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getAllByRole('button')[2])
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByText('Supprimer la catégorie')).not.toBeInTheDocument())
    expect(app.deleteCategory).not.toHaveBeenCalled()
  })
})
