import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import { makeAdmin, makeCar, makeCategory, makePayment, makeReservation, makeReview, makeUser } from '../../../../test/factories'
import Dashboard from '../Dashboard'

// Recharts mesure le DOM : on neutralise le conteneur responsive en test.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  }
})

const admin = makeAdmin({ id: 'a1' })

const renderPage = (app = {}) =>
  renderWithProviders(<Dashboard />, { app: { currentUser: admin, ...app } })

const ready = () => screen.findByRole('heading', { name: 'Tableau de bord' })

describe('pages/admin/Dashboard · chargement', () => {
  it('affiche un indicateur de chargement puis le tableau de bord', async () => {
    renderPage()

    expect(await ready()).toBeInTheDocument()
  })

  it('charge les statistiques, les revenus et le top des voitures', async () => {
    const { app } = renderPage()
    await ready()

    expect(app.loadDashboardStats).toHaveBeenCalled()
    expect(app.loadDashboardRevenue).toHaveBeenCalledWith(2026)
    expect(app.loadDashboardTopCars).toHaveBeenCalledWith(5)
  })

  it('affiche le message de bienvenue une fois chargé', async () => {
    const { app } = renderPage()
    await ready()

    await waitFor(() => expect(app.showWelcomeToast).toHaveBeenCalled())
  })

  it('affiche l’erreur et permet de réessayer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const loadDashboardStats = vi.fn().mockRejectedValueOnce(new Error('500')).mockResolvedValue(null)
    const { user } = renderPage({ loadDashboardStats })

    expect(await screen.findByText(/Erreur lors du chargement des statistiques/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(await ready()).toBeInTheDocument()
  })

  it('recharge les données à la demande', async () => {
    const { user, app } = renderPage()
    await ready()

    await user.click(screen.getByRole('button', { name: /Actualiser/ }))

    await waitFor(() => expect(app.loadDashboardStats).toHaveBeenCalledTimes(2))
  })

  it('ne charge rien pour un utilisateur non administrateur', async () => {
    const { app } = renderPage({ currentUser: makeUser({ role: 'CLIENT' }) })

    await ready()
    expect(app.loadDashboardStats).not.toHaveBeenCalled()
  })
})

describe('pages/admin/Dashboard · indicateurs', () => {
  it('privilégie les statistiques renvoyées par le backend', async () => {
    renderPage({
      dashboardStats: {
        totalCars: 12, availableCars: 5, rentedCars: 4, reservedCars: 3,
        totalReservations: 40, inProgressReservations: 2, completedReservations: 30, cancelledReservations: 8,
        totalRevenue: 15000, revenueThisMonth: 2400, totalClients: 22, averageRating: 4.4,
      },
      cars: [makeCar()],
    })
    await ready()

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('15 000 DT'.replace(' ', ' '))).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('4.4/5')).toBeInTheDocument()
  })

  it('retombe sur un calcul local sans statistiques backend', async () => {
    renderPage({
      cars: [
        makeCar({ id: '1', status: 'AVAILABLE' }),
        makeCar({ id: '2', status: 'RENTED' }),
        makeCar({ id: '3', status: 'RESERVED' }),
      ],
      reservations: [
        makeReservation({ id: 'r1', status: 'IN_PROGRESS' }),
        makeReservation({ id: 'r2', status: 'COMPLETED' }),
        makeReservation({ id: 'r3', status: 'CANCELLED' }),
      ],
      payments: [makePayment({ status: 'COMPLETED', amount: 480, date: '2026-03-01T00:00:00Z' })],
      users: [makeUser({ role: 'CLIENT' }), admin],
      reviews: [makeReview({ rating: 5 }), makeReview({ id: 'rev2', rating: 3 })],
    })
    await ready()

    expect(screen.getByText('480 DT')).toBeInTheDocument()
    expect(screen.getByText('4.0/5')).toBeInTheDocument()
  })

  it('affiche 0.0/5 sans avis', async () => {
    renderPage({ reviews: [] })
    await ready()

    expect(screen.getByText('0.0/5')).toBeInTheDocument()
  })
})

describe('pages/admin/Dashboard · alertes de stock', () => {
  const carsFor = (categoryId: string, statuses: ('AVAILABLE' | 'RENTED')[]) =>
    statuses.map((status, i) => makeCar({ id: `${categoryId}-${i}`, categoryId, status }))

  it('félicite quand aucune catégorie n’est en tension', async () => {
    renderPage({
      categories: [makeCategory({ id: '1', name: 'Berline' })],
      cars: carsFor('1', ['AVAILABLE', 'AVAILABLE', 'AVAILABLE']),
    })
    await ready()

    expect(screen.getByRole('heading', { name: 'État du stock optimal' })).toBeInTheDocument()
  })

  it('classe les alertes critique, urgente puis attention', async () => {
    renderPage({
      categories: [
        makeCategory({ id: '1', name: 'Berline' }),
        makeCategory({ id: '2', name: 'Luxe' }),
        makeCategory({ id: '3', name: 'SUV' }),
      ],
      cars: [
        ...carsFor('1', ['AVAILABLE', 'AVAILABLE', 'RENTED']),
        ...carsFor('2', ['RENTED']),
        ...carsFor('3', ['AVAILABLE', 'RENTED']),
      ],
    })
    await ready()

    // Luxe (0 dispo) → critique, SUV (1) → urgent, Berline (2) → attention
    const names = screen.getAllByText(/^(Berline|Luxe|SUV)$/).map((el) => el.textContent)
    expect(names).toEqual(['Luxe', 'SUV', 'Berline'])
    expect(screen.getByText('1 critique')).toBeInTheDocument()
    expect(screen.getByText('1 urgent')).toBeInTheDocument()
    expect(screen.getByText('1 attention')).toBeInTheDocument()
  })

  it('signale une catégorie sans aucune voiture disponible', async () => {
    renderPage({
      categories: [makeCategory({ id: '1', name: 'Luxe' })],
      cars: carsFor('1', ['RENTED']),
    })
    await ready()

    expect(screen.getByText('Aucune voiture disponible')).toBeInTheDocument()
    expect(screen.getByText(/1 véhicule au total dans la catégorie/)).toBeInTheDocument()
  })

  it('accorde le message au pluriel', async () => {
    renderPage({
      categories: [makeCategory({ id: '1', name: 'SUV' })],
      cars: carsFor('1', ['AVAILABLE', 'AVAILABLE', 'RENTED']),
    })
    await ready()

    expect(screen.getByText(/Plus que 2 voitures disponibles/)).toBeInTheDocument()
    expect(screen.getByText(/3 véhicules au total/)).toBeInTheDocument()
  })

  it('rattache les voitures à leur catégorie par le nom quand l’identifiant manque', async () => {
    renderPage({
      categories: [makeCategory({ id: '1', name: 'Citadine' })],
      cars: [makeCar({ id: 'x', categoryId: undefined, category: 'Citadine', status: 'RENTED' })],
    })
    await ready()

    expect(screen.getByText('Citadine')).toBeInTheDocument()
    expect(screen.getByText('Aucune voiture disponible')).toBeInTheDocument()
  })
})

describe('pages/admin/Dashboard · revenus', () => {
  it('permet de changer d’année et recharge les revenus', async () => {
    const { user, app } = renderPage()
    await ready()

    await user.selectOptions(screen.getByRole('combobox'), '2025')

    await waitFor(() => expect(app.loadDashboardRevenue).toHaveBeenCalledWith(2025))
    expect(screen.getByRole('heading', { name: /Revenus par mois — 2025/ })).toBeInTheDocument()
  })

  it('affiche les douze mois de l’année', async () => {
    renderPage({ dashboardRevenue: [{ month: 3, amount: 1200, reservationCount: 4 }] })
    await ready()

    expect(screen.getByRole('heading', { name: /Revenus par mois — 2026/ })).toBeInTheDocument()
  })
})

describe('pages/admin/Dashboard · top des voitures', () => {
  it('signale l’absence de réservation', async () => {
    renderPage()
    await ready()

    expect(screen.getByText('Aucune réservation effectuée pour le moment.')).toBeInTheDocument()
  })

  it('affiche le classement renvoyé par le backend', async () => {
    renderPage({
      dashboardTopCars: [
        { carId: 1, reservationCount: 8, totalRevenue: 3600, brand: 'Renault', model: 'Clio', averageRating: 4.5, imageUrl: '/uploads/clio.jpg' },
        { carId: 2, reservationCount: 1, totalRevenue: 400, brand: 'Kia', model: 'Rio' },
      ],
    })
    await ready()

    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('8 locations')).toBeInTheDocument()
    expect(screen.getByText('1 location')).toBeInTheDocument()
    expect(screen.getByText('3 600 DT'.replace(' ', ' '))).toBeInTheDocument()
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', 'http://localhost:8089/uploads/clio.jpg')
  })

  it('calcule un classement local sans données backend', async () => {
    renderPage({
      cars: [makeCar({ id: 'c1', brand: 'Renault', model: 'Clio' })],
      reservations: [
        makeReservation({ id: 'r1', carId: 'c1', total: 480, status: 'COMPLETED' }),
        makeReservation({ id: 'r2', carId: 'c1', total: 480, status: 'COMPLETED' }),
        makeReservation({ id: 'r3', carId: 'c1', total: 480, status: 'CANCELLED' }),
      ],
    })
    await ready()

    const row = screen.getByText('Renault Clio').closest('div')!.parentElement!
    expect(within(row).getByText('2 locations')).toBeInTheDocument()
    expect(screen.getByText('960 DT')).toBeInTheDocument()
  })
})
