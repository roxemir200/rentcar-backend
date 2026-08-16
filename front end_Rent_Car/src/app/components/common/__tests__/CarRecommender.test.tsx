import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { axiosResponse, makeCar } from '../../../../test/factories'
import { CarRecommender } from '../CarRecommender'

vi.mock('../../../api/recommendations.api', () => ({
  recommendationsAPI: { getCarRecommendations: vi.fn() },
}))

import { recommendationsAPI } from '../../../api/recommendations.api'

const cars = [
  makeCar({ id: '1', brand: 'Renault', model: 'Clio', pricePerDay: 120, seats: 5, status: 'AVAILABLE' }),
  makeCar({ id: '2', brand: 'Kia', model: 'Sportage', pricePerDay: 200, seats: 7, status: 'RENTED' }),
]

const apiItem = (overrides: Record<string, unknown> = {}) => ({
  carId: 1,
  brand: 'Renault',
  model: 'Clio',
  dailyRate: 120,
  matchScore: 92,
  ratingAvg: 4.5,
  categoryName: 'Citadine',
  highlights: ['Idéale en ville', 'Faible consommation'],
  ...overrides,
})

const recommendationResponse = (items: unknown[] = [apiItem()], meta = {}) =>
  axiosResponse({
    data: items,
    preferences: { objective: 'FAMILLE', budget: 100, passengers: 4, duration: 3, transmission: 'ANY' },
    meta: { fallbackUsed: false, carsScored: 12, mlServiceStatus: 'OK', ...meta },
  })

const renderRecommender = (props = {}) => renderWithProviders(<CarRecommender cars={cars} {...props} />)

/** Parcourt le wizard jusqu'à l'étape demandée. */
const goToStep = async (user: ReturnType<typeof renderWithProviders>['user'], target: number) => {
  for (let i = 1; i < target; i++) {
    await user.click(screen.getByRole('button', { name: /Suivant/ }))
  }
}

const runWizard = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await goToStep(user, 5)
  await user.click(screen.getByRole('button', { name: /Trouver mes voitures/ }))
}

beforeEach(() => {
  vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(recommendationResponse())
})

describe('components/CarRecommender · assistant', () => {
  it('démarre sur l’étape objectif', () => {
    renderRecommender()

    expect(screen.getByRole('heading', { name: 'Conseils personnalisés' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quotidien/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Précédent/ })).toBeDisabled()
  })

  it('propose les six objectifs de voyage', () => {
    renderRecommender()

    ;['Quotidien', 'Famille', 'Professionnel', 'Aventure', 'Confort', 'Écologique'].forEach((label) => {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    })
  })

  it('avance et recule entre les étapes', async () => {
    const { user } = renderRecommender()

    await user.click(screen.getByRole('button', { name: /Suivant/ }))
    expect(screen.getByText('Budget par jour', { selector: 'label' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Précédent/ }))
    expect(screen.getByRole('button', { name: /Quotidien/ })).toBeInTheDocument()
  })

  it('ajuste le budget par le curseur et les raccourcis', async () => {
    const { user } = renderRecommender()
    await goToStep(user, 2)

    await user.click(screen.getByRole('button', { name: '100 DT' }))

    // Montant affiché en gros + valeur du curseur
    expect(screen.getAllByText('100 DT').length).toBeGreaterThan(1)
    expect(screen.getByRole('slider')).toHaveValue('100')
  })

  it('estime le coût total à partir du budget et de la durée', async () => {
    const { user } = renderRecommender()
    await goToStep(user, 2)

    await user.click(screen.getByRole('button', { name: '60 DT' }))

    // 60 DT × 3 jours (durée par défaut)
    const estimation = screen.getByText('Estimation totale').closest('div')!
    expect(within(estimation).getByText('180 DT')).toBeInTheDocument()
    expect(within(estimation).getByText('Pour 3 jours')).toBeInTheDocument()
  })

  it('sélectionne le nombre de passagers et adapte les conseils', async () => {
    const { user } = renderRecommender()
    await goToStep(user, 3)

    await user.click(screen.getByRole('button', { name: '6' }))

    expect(screen.getByText('✅ SUV / Monospace')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByText('✅ Parfait')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getByText('✅ Adapté')).toBeInTheDocument()
  })

  it('accorde la durée au singulier et au pluriel', async () => {
    const { user } = renderRecommender()
    await goToStep(user, 4)

    await user.click(screen.getByRole('button', { name: '1 jour' }))
    expect(screen.getByRole('slider')).toHaveValue('1')

    await user.click(screen.getByRole('button', { name: '14 jours' }))
    expect(screen.getByRole('slider')).toHaveValue('14')
  })

  it('propose les trois préférences de transmission', async () => {
    const { user } = renderRecommender()
    await goToStep(user, 5)

    expect(screen.getByRole('button', { name: /Automatique/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Manuelle/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Indifférent/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Trouver mes voitures/ })).toBeInTheDocument()
  })
})

describe('components/CarRecommender · appel du moteur', () => {
  it('transmet les critères choisis au service de recommandation', async () => {
    const { user } = renderRecommender()

    await user.click(screen.getByRole('button', { name: /Famille/ }))
    await goToStep(user, 2)
    await user.click(screen.getByRole('button', { name: '100 DT' }))
    await user.click(screen.getByRole('button', { name: /Suivant/ }))
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: /Suivant/ }))
    await user.click(screen.getByRole('button', { name: '7 jours' }))
    await user.click(screen.getByRole('button', { name: /Suivant/ }))
    await user.click(screen.getByRole('button', { name: /Automatique/ }))
    await user.click(screen.getByRole('button', { name: /Trouver mes voitures/ }))

    await waitFor(() =>
      expect(recommendationsAPI.getCarRecommendations).toHaveBeenCalledWith({
        objective: 'FAMILLE',
        budget: 100,
        passengers: 5,
        duration: 7,
        transmission: 'AUTOMATIC',
        topK: 3,
      }),
    )
  })

  it('affiche l’écran d’analyse pendant l’appel', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockReturnValue(new Promise(() => {}))
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('Analyse en cours…')).toBeInTheDocument()
  })

  it('affiche les recommandations et le rappel des critères', async () => {
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByRole('heading', { name: /Nos 1 recommandation sur mesure/ })).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('Excellent')).toBeInTheDocument()
    expect(screen.getByText('Famille')).toBeInTheDocument()
    expect(screen.getByText('100 DT/j')).toBeInTheDocument()
    expect(screen.getByText('Transmission libre')).toBeInTheDocument()
  })

  it('accorde le titre au pluriel', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      recommendationResponse([apiItem(), apiItem({ carId: 2, brand: 'Kia', model: 'Sportage', matchScore: 71 })]),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByRole('heading', { name: /Nos 2 recommandations sur mesure/ })).toBeInTheDocument()
  })

  it('accepte la nomenclature snake_case du service ML', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      axiosResponse({
        data: [{ car_id: 1, brand: 'Renault', model: 'Clio', daily_rate: 90, match_score: 65, rating_avg: 0, category_name: 'Citadine' }],
        meta: { fallbackUsed: true, cars_scored: 7, ml_service_status: 'FALLBACK' },
      }),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('65')).toBeInTheDocument()
    expect(screen.getByText('Bien')).toBeInTheDocument()
    expect(screen.getByText('🤖 Moteur hybride')).toBeInTheDocument()
    expect(screen.getByText('7 véhicules analysés')).toBeInTheDocument()
  })

  it('indique que le service ML est actif', async () => {
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('✨ Service ML actif')).toBeInTheDocument()
    expect(screen.getByText('12 véhicules analysés')).toBeInTheDocument()
  })

  it('avertit et propose d’ajuster les critères sans résultat', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(recommendationResponse([]))
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('Aucun véhicule ne correspond exactement')).toBeInTheDocument()
    expect(toast.warning).toHaveBeenCalledWith('Aucune recommandation trouvée pour ces critères.')

    await user.click(screen.getByRole('button', { name: 'Ajuster mes critères' }))
    expect(screen.getByRole('button', { name: /Quotidien/ })).toBeInTheDocument()
  })

  it('revient à l’assistant en cas d’erreur du service', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockRejectedValue({
      response: { data: { message: 'Service ML indisponible' } },
    })
    const { user } = renderRecommender()

    await runWizard(user)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Impossible de lancer la recommandation', {
        description: 'Service ML indisponible',
      }),
    )
    expect(screen.getByRole('button', { name: /Trouver mes voitures/ })).toBeInTheDocument()
  })

  it('affiche un message générique pour une erreur réseau', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockRejectedValue(new Error('Network Error'))
    const { user } = renderRecommender()

    await runWizard(user)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Impossible de lancer la recommandation', {
        description: 'Network Error',
      }),
    )
  })

  it('permet de recommencer une nouvelle recherche', async () => {
    const { user } = renderRecommender()
    await runWizard(user)
    await screen.findByText('Renault Clio')

    await user.click(screen.getByRole('button', { name: /Recommencer/ }))

    expect(screen.getByRole('button', { name: /Quotidien/ })).toBeInTheDocument()
    expect(screen.queryByText('Renault Clio')).not.toBeInTheDocument()
  })
})

describe('components/CarRecommender · carte de résultat', () => {
  it('enrichit la recommandation avec les données locales du véhicule', async () => {
    const { user } = renderRecommender()

    await runWizard(user)
    await screen.findByText('Renault Clio')

    expect(screen.getByText('5 places')).toBeInTheDocument()
    expect(screen.getByText('Essence')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Réserver/ })).toHaveAttribute('href', '/cars/1')
  })

  it('affiche les points forts renvoyés par le moteur', async () => {
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('Idéale en ville')).toBeInTheDocument()
    expect(screen.getByText('Faible consommation')).toBeInTheDocument()
  })

  it('signale un véhicule archivé absent du catalogue', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      recommendationResponse([apiItem({ carId: 999, brand: 'Fiat', model: 'Panda', dailyRate: 70 })]),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByRole('button', { name: /Véhicule archivé/ })).toBeDisabled()
    expect(screen.getByText('Fiat Panda')).toBeInTheDocument()
    expect(screen.getByText('70 DT')).toBeInTheDocument()
  })

  it('indique une voiture non encore notée', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      recommendationResponse([apiItem({ ratingAvg: 0 })]),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('Pas encore notée')).toBeInTheDocument()
  })

  it('affiche le statut de la voiture réservée ou louée', async () => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      recommendationResponse([apiItem({ carId: 2, brand: 'Kia', model: 'Sportage' })]),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText('Louée')).toBeInTheDocument()
  })

  it.each([
    [95, 'Excellent'],
    [78, 'Très bien'],
    [62, 'Bien'],
    [40, 'Correct'],
  ])('qualifie un score de %s en "%s"', async (matchScore, label) => {
    vi.mocked(recommendationsAPI.getCarRecommendations).mockResolvedValue(
      recommendationResponse([apiItem({ matchScore })]),
    )
    const { user } = renderRecommender()

    await runWizard(user)

    expect(await screen.findByText(label)).toBeInTheDocument()
  })

  it('fonctionne sans catalogue local', async () => {
    const { user } = renderWithProviders(<CarRecommender />)

    await runWizard(user)

    expect(await screen.findByText('Renault Clio')).toBeInTheDocument()
    const card = screen.getByText('Renault Clio').closest('article')!
    expect(within(card).getByRole('button', { name: /Véhicule archivé/ })).toBeInTheDocument()
  })
})
