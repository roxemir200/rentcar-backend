import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse } from '../../../../test/factories'
import AdminContracts from '../AdminContracts'

vi.mock('../../../api/contrat.api', () => ({
  contractsAPI: { getAll: vi.fn(), cancel: vi.fn() },
}))

import { contractsAPI } from '../../../api/contrat.api'

const apiContract = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  contractNumber: 'CONT-1',
  reservationId: 'r1',
  status: 'DRAFT',
  clientFirstName: 'Amine',
  clientLastName: 'Ben Salah',
  carBrand: 'Renault',
  carModel: 'Clio',
  ...overrides,
})

beforeEach(() => {
  vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([]))
  vi.mocked(contractsAPI.cancel).mockResolvedValue(axiosResponse({ success: true }))
})

describe('pages/admin/AdminContracts', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(contractsAPI.getAll).mockReturnValue(new Promise(() => {}))

    const { container } = renderWithProviders(<AdminContracts />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('affiche l’erreur et permet de réessayer', async () => {
    vi.mocked(contractsAPI.getAll).mockRejectedValue(new Error('500'))

    const { user } = renderWithProviders(<AdminContracts />)

    expect(await screen.findByText('Erreur lors du chargement des contrats')).toBeInTheDocument()

    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([]))
    await user.click(screen.getByRole('button', { name: /Réessayer/ }))

    expect(await screen.findByRole('heading', { name: 'Aucun contrat' })).toBeInTheDocument()
  })

  it('affiche un état vide sans contrat', async () => {
    renderWithProviders(<AdminContracts />)

    expect(await screen.findByRole('heading', { name: 'Aucun contrat' })).toBeInTheDocument()
    expect(screen.getByText('0 contrats')).toBeInTheDocument()
  })

  it('accepte l’enveloppe { value }', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse({ value: [apiContract()] }))

    renderWithProviders(<AdminContracts />)

    expect(await screen.findByText('CONT-1')).toBeInTheDocument()
  })

  it('liste les contrats avec client, voiture et statut', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(
      axiosResponse([apiContract({ status: 'SIGNED', signedAt: '2026-03-01' })]),
    )

    renderWithProviders(<AdminContracts />)

    expect(await screen.findByText('CONT-1')).toBeInTheDocument()
    expect(screen.getByText('Amine Ben Salah')).toBeInTheDocument()
    expect(screen.getByText('Renault Clio')).toBeInTheDocument()
    expect(screen.getByText('Signé')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/contract/r1')
  })

  it('affiche des tirets quand les informations dénormalisées manquent', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(
      axiosResponse([apiContract({ clientFirstName: null, clientLastName: null, carBrand: null, carModel: null })]),
    )

    renderWithProviders(<AdminContracts />)

    await screen.findByText('CONT-1')
    expect(screen.getAllByText('—')).toHaveLength(3) // client, voiture, date de signature
  })

  it('n’autorise pas l’annulation d’un contrat déjà annulé', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([apiContract({ status: 'CANCELLED' })]))

    renderWithProviders(<AdminContracts />)

    await screen.findByText('CONT-1')
    expect(screen.getAllByRole('button')).toHaveLength(1) // uniquement le lien "voir"
  })

  it('annule un contrat après confirmation et recharge la liste', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([apiContract()]))
    const { user } = renderWithProviders(<AdminContracts />)
    await screen.findByText('CONT-1')

    await user.click(screen.getAllByRole('button')[1])
    await user.click(await screen.findByRole('button', { name: 'Annuler le contrat' }))

    await waitFor(() => expect(contractsAPI.cancel).toHaveBeenCalledWith(1))
    expect(toast.success).toHaveBeenCalledWith('Contrat annulé.')
    expect(contractsAPI.getAll).toHaveBeenCalledTimes(2)
  })

  it('affiche le refus métier du backend', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([apiContract()]))
    vi.mocked(contractsAPI.cancel).mockResolvedValue(axiosResponse({ success: false, message: 'Contrat déjà signé' }))
    const { user } = renderWithProviders(<AdminContracts />)
    await screen.findByText('CONT-1')

    await user.click(screen.getAllByRole('button')[1])
    await user.click(await screen.findByRole('button', { name: 'Annuler le contrat' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contrat déjà signé'))
  })

  it('affiche l’erreur réseau', async () => {
    vi.mocked(contractsAPI.getAll).mockResolvedValue(axiosResponse([apiContract()]))
    vi.mocked(contractsAPI.cancel).mockRejectedValue(new Error('500'))
    const { user } = renderWithProviders(<AdminContracts />)
    await screen.findByText('CONT-1')

    await user.click(screen.getAllByRole('button')[1])
    await user.click(await screen.findByRole('button', { name: 'Annuler le contrat' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'annulation"))
  })
})
