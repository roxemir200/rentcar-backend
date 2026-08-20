import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { axiosResponse } from '../../../../test/factories'
import { AuthShell } from '../AuthShell'

vi.mock('../../../api/stats.api', () => ({
  statsAPI: { getPublic: vi.fn() },
}))

import { statsAPI } from '../../../api/stats.api'

const publicStats = (overrides = {}) =>
  axiosResponse({ vehicles: 8, clients: 12, reviews: 5, averageRating: 4.3, ...overrides })

const renderShell = () =>
  renderWithProviders(
    <AuthShell title="Connexion" subtitle="Ravi de vous revoir">
      <p>formulaire</p>
    </AuthShell>,
  )

beforeEach(() => {
  vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats())
})

describe('pages/auth/AuthShell', () => {
  /**
   * Le panneau promettait « Plus de 10 000 clients satisfaits » a une base qui
   * en comptait une poignee.
   */
  it('annonce le nombre réel de clients inscrits', async () => {
    renderShell()

    expect(await screen.findByText('12 clients nous font déjà confiance')).toBeInTheDocument()
    expect(screen.queryByText(/10 000/)).not.toBeInTheDocument()
  })

  it('accorde la phrase au singulier pour un seul client', async () => {
    vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats({ clients: 1 }))

    renderShell()

    expect(await screen.findByText('1 client nous fait déjà confiance')).toBeInTheDocument()
  })

  /**
   * Sans client inscrit -- ou sans reponse du serveur -- on promet le service
   * plutot qu'une audience, jamais un nombre invente.
   */
  it('promet le service plutôt qu’une audience quand aucun client n’est inscrit', async () => {
    vi.mocked(statsAPI.getPublic).mockResolvedValue(publicStats({ clients: 0 }))

    renderShell()

    expect(
      await screen.findByText('Un accompagnement personnalisé à chaque location'),
    ).toBeInTheDocument()
  })

  it('reste affichable quand l’API est injoignable', async () => {
    vi.mocked(statsAPI.getPublic).mockRejectedValue(new Error('réseau'))

    renderShell()

    await waitFor(() => expect(statsAPI.getPublic).toHaveBeenCalled())
    expect(screen.getByText('Un accompagnement personnalisé à chaque location')).toBeInTheDocument()
    expect(screen.getByText('formulaire')).toBeInTheDocument()
  })
})
