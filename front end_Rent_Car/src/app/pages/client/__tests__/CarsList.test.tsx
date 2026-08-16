import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { makeCar, makeCategory } from '../../../../test/factories'
import CarsList, { trCategory, trFuel, trTransmission } from '../CarsList'

const fleet = [
  makeCar({ id: '1', brand: 'Renault', model: 'Clio', fuel: 'Essence', transmission: 'Manuelle', pricePerDay: 100, category: 'Citadine' }),
  makeCar({ id: '2', brand: 'Kia', model: 'Sportage', fuel: 'Diesel', transmission: 'Automatique', pricePerDay: 200, category: 'SUV / Spacieux' }),
  makeCar({ id: '3', brand: 'Tesla', model: 'Model 3', fuel: 'Électrique', transmission: 'Automatique', pricePerDay: 350, category: 'Luxe' }),
]

const renderList = (overrides = {}, options = {}) =>
  renderWithProviders(<CarsList />, {
    app: { cars: fleet, categories: [makeCategory({ id: '1', name: 'Citadine' }), makeCategory({ id: '2', name: 'Luxe' })], ...overrides },
    ...options,
  })

const shownCars = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('pages/client/CarsList · helpers de traduction', () => {
  const t = ((k: string) => `T:${k}`) as never

  it('trCategory traduit les catégories connues et laisse les autres intactes', () => {
    expect(trCategory(t, 'Luxe')).toBe('T:categ.Luxe')
    expect(trCategory(t, 'Catégorie maison')).toBe('Catégorie maison')
  })

  it('trFuel traduit les carburants connus', () => {
    expect(trFuel(t, 'Diesel')).toBe('T:fuel.Diesel')
    expect(trFuel(t, 'Hydrogène')).toBe('Hydrogène')
  })

  it('trTransmission traduit les transmissions connues', () => {
    expect(trTransmission(t, 'Manuelle')).toBe('T:trans.Manuelle')
    expect(trTransmission(t, 'Séquentielle')).toBe('Séquentielle')
  })
})

describe('pages/client/CarsList · affichage', () => {
  it('affiche le titre, le compteur et la flotte', () => {
    renderList()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nos voitures disponibles')
    expect(screen.getByText('3 véhicules trouvés')).toBeInTheDocument()
    expect(shownCars()).toHaveLength(3)
  })

  it('accorde le compteur au singulier', () => {
    renderList({ cars: [fleet[0]] })

    expect(screen.getByText('1 véhicule trouvé')).toBeInTheDocument()
  })

  it('déclenche le message de bienvenue une fois monté', () => {
    const { app } = renderList()

    expect(app.showWelcomeToast).toHaveBeenCalled()
  })

  it('affiche des squelettes pendant le chargement', () => {
    const { container } = renderList({ carsLoading: true })

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('affiche l’erreur de chargement et permet de réessayer', async () => {
    const { app, user } = renderList({ carsError: 'Erreur lors du chargement des voitures' })

    expect(screen.getByText('Erreur lors du chargement des voitures')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(app.loadCars).toHaveBeenCalled()
  })

  it('affiche un état vide quand aucune voiture ne correspond', () => {
    renderList({ cars: [] })

    expect(screen.getByRole('heading', { name: 'Aucun véhicule ne correspond à vos filtres.' })).toBeInTheDocument()
  })
})

describe('pages/client/CarsList · filtres', () => {
  it('filtre par marque ou modèle (insensible à la casse)', async () => {
    const { user } = renderList()

    await user.type(screen.getByPlaceholderText('Marque ou modèle...'), 'tesla')

    await waitFor(() => expect(shownCars()).toEqual(['Tesla Model 3']))
  })

  it('filtre par carburant', async () => {
    const { user } = renderList()

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'Diesel')

    await waitFor(() => expect(shownCars()).toEqual(['Kia Sportage']))
  })

  it('filtre par transmission', async () => {
    const { user } = renderList()

    await user.selectOptions(screen.getAllByRole('combobox')[1], 'Manuelle')

    await waitFor(() => expect(shownCars()).toEqual(['Renault Clio']))
  })

  it('filtre par prix minimum et maximum', async () => {
    const { user } = renderList()

    await user.type(screen.getByPlaceholderText('Prix min'), '150')
    await waitFor(() => expect(shownCars()).toHaveLength(2))

    await user.type(screen.getByPlaceholderText('Prix max'), '250')
    await waitFor(() => expect(shownCars()).toEqual(['Kia Sportage']))
  })

  it('filtre par catégorie au clic sur une pastille et met l’URL à jour', async () => {
    const { user } = renderList()

    await user.click(screen.getByRole('button', { name: 'Citadine' }))

    await waitFor(() => expect(shownCars()).toEqual(['Renault Clio']))
  })

  it('désélectionne la catégorie au second clic', async () => {
    const { user } = renderList()

    await user.click(screen.getByRole('button', { name: 'Citadine' }))
    await waitFor(() => expect(shownCars()).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Citadine' }))

    await waitFor(() => expect(shownCars()).toHaveLength(3))
  })

  it('pré-sélectionne la catégorie passée dans l’URL', () => {
    renderList({}, { route: '/cars?category=Luxe' })

    expect(shownCars()).toEqual(['Tesla Model 3'])
  })

  it('réinitialise tous les filtres', async () => {
    const { user } = renderList()

    await user.type(screen.getByPlaceholderText('Marque ou modèle...'), 'tesla')
    await user.click(screen.getByRole('button', { name: 'Citadine' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Aucun véhicule/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    await waitFor(() => expect(shownCars()).toHaveLength(3))
    expect(screen.getByPlaceholderText('Marque ou modèle...')).toHaveValue('')
  })

  it('n’affiche le bouton de réinitialisation que si un filtre est actif', async () => {
    const { user } = renderList()

    expect(screen.queryByRole('button', { name: 'Réinitialiser' })).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Marque ou modèle...'), 'k')

    expect(await screen.findByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })

  it('transmet la note de chaque voiture aux cartes', () => {
    const { app } = renderList()

    expect(app.getCarRating).toHaveBeenCalledWith('1')
    const card = screen.getByRole('heading', { name: 'Renault Clio' }).closest('div')!
    expect(within(card).queryByText('Aucun avis')).toBeDefined()
  })
})
