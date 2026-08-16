import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../../../test/test-utils'
import AdminCalendar from '../AdminCalendar'

/** Réservation telle qu'exposée par le calendrier (champs dénormalisés). */
const calendarReservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  carId: 'c1',
  userId: 'u1',
  startDate: '2026-03-10',
  endDate: '2026-03-12',
  status: 'CONFIRMED',
  carBrand: 'Renault',
  carModel: 'Clio',
  clientFirstName: 'Amine',
  clientLastName: 'Ben Salah',
  ...overrides,
})

const renderPage = (app = {}) => renderWithProviders(<AdminCalendar />, { app })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-03-15T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('pages/admin/AdminCalendar · navigation', () => {
  it('affiche le mois courant et charge ses réservations', async () => {
    const { app } = renderPage()

    expect(screen.getByText('Mars 2026')).toBeInTheDocument()
    await waitFor(() => expect(app.loadCalendarReservations).toHaveBeenCalledWith(2026, 3))
  })

  it('affiche les sept jours de la semaine et la légende des statuts', () => {
    renderPage()

    expect(screen.getByText('Lun')).toBeInTheDocument()
    expect(screen.getByText('Dim')).toBeInTheDocument()
    expect(screen.getByText('En attente')).toBeInTheDocument()
    expect(screen.getByText('Annulée')).toBeInTheDocument()
  })

  it('navigue vers le mois précédent et suivant', async () => {
    const { user, app } = renderPage()

    await user.click(screen.getAllByRole('button')[1]) // chevron gauche
    expect(screen.getByText('Février 2026')).toBeInTheDocument()
    await waitFor(() => expect(app.loadCalendarReservations).toHaveBeenCalledWith(2026, 2))

    await user.click(screen.getAllByRole('button')[2]) // chevron droit
    await user.click(screen.getAllByRole('button')[2])
    expect(screen.getByText('Avril 2026')).toBeInTheDocument()
    await waitFor(() => expect(app.loadCalendarReservations).toHaveBeenCalledWith(2026, 4))
  })

  it('revient au mois courant', async () => {
    const { user } = renderPage()

    await user.click(screen.getAllByRole('button')[1])
    expect(screen.getByText('Février 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: "Aujourd'hui" }))

    expect(screen.getByText('Mars 2026')).toBeInTheDocument()
  })

  it('met en évidence la date du jour', () => {
    const { container } = renderPage()

    const todayCell = container.querySelector('.border-primary')
    expect(todayCell).toBeInTheDocument()
    expect(todayCell).toHaveTextContent('15')
  })
})

describe('pages/admin/AdminCalendar · réservations', () => {
  it('positionne une réservation sur chaque jour couvert', () => {
    renderPage({ calendarReservations: [calendarReservation()] })

    // 10, 11 et 12 mars → trois occurrences
    expect(screen.getAllByText('Renault Clio')).toHaveLength(3)
  })

  it('affiche un libellé générique sans informations dénormalisées', () => {
    renderPage({
      calendarReservations: [calendarReservation({ carBrand: null, carModel: null, startDate: '2026-03-10', endDate: '2026-03-10' })],
    })

    expect(screen.getByText('Voiture')).toBeInTheDocument()
  })

  it('résume les réservations excédentaires au-delà de trois', () => {
    renderPage({
      calendarReservations: [1, 2, 3, 4, 5].map((n) =>
        calendarReservation({ id: `r${n}`, startDate: '2026-03-10', endDate: '2026-03-10' }),
      ),
    })

    expect(screen.getByText('+2 de plus')).toBeInTheDocument()
  })

  it('ouvre le détail du jour au clic sur une case', async () => {
    const { user } = renderPage({ calendarReservations: [calendarReservation()] })

    const cell = screen.getAllByText('Renault Clio')[0].closest('button')!
    await user.click(cell)

    const dialog = await screen.findByText(/Réservations du/)
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Détails' })).toHaveAttribute('href', '/admin/reservation/r1')
    expect(screen.getByText(/Amine Ben Salah/)).toBeInTheDocument()
  })

  it('indique un jour sans réservation', async () => {
    const { user } = renderPage()

    const emptyDay = screen.getByText('20').closest('button')!
    await user.click(emptyDay)

    expect(await screen.findByText('Aucune réservation ce jour.')).toBeInTheDocument()
  })

  it('affiche une fiche au survol d’une réservation', async () => {
    const { user } = renderPage({ calendarReservations: [calendarReservation()] })

    await user.hover(screen.getAllByText('Renault Clio')[0])

    const card = await screen.findByText('#R1')
    expect(card).toBeInTheDocument()
    expect(within(card.parentElement!).getByRole('link', { name: /Voir détails/ })).toHaveAttribute(
      'href',
      '/admin/reservation/r1',
    )
  })

  it('masque la fiche quand le survol s’arrête', async () => {
    const { user } = renderPage({ calendarReservations: [calendarReservation()] })

    const item = screen.getAllByText('Renault Clio')[0]
    await user.hover(item)
    expect(await screen.findByText('#R1')).toBeInTheDocument()

    await user.unhover(item)
    await waitFor(() => expect(screen.queryByText('#R1')).not.toBeInTheDocument())
  })
})
