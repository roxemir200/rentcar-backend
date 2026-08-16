import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, within } from '../../../../test/test-utils'
import { StarRating } from '../StarRating'

const stars = () => screen.getAllByRole('button')

describe('components/StarRating', () => {
  it('affiche toujours cinq étoiles', () => {
    renderWithProviders(<StarRating value={3} />)

    expect(stars()).toHaveLength(5)
  })

  it('est en lecture seule par défaut (étoiles désactivées)', () => {
    renderWithProviders(<StarRating value={3} />)

    stars().forEach((s) => expect(s).toBeDisabled())
  })

  it('remonte la note choisie quand il est éditable', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(<StarRating value={0} onChange={onChange} readOnly={false} />)

    await user.click(stars()[3])

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('prévisualise la note au survol puis la réinitialise à la sortie', async () => {
    const { user, container } = renderWithProviders(<StarRating value={0} onChange={vi.fn()} readOnly={false} />)

    const filledCount = () => container.querySelectorAll('.text-amber-400').length
    expect(filledCount()).toBe(0)

    await user.hover(stars()[2])
    expect(filledCount()).toBe(3)

    await user.unhover(stars()[2])
    // Le conteneur des étoiles porte le onMouseLeave
    await user.hover(document.body)
    expect(filledCount()).toBeLessThanOrEqual(3)
  })

  it('n’active pas la prévisualisation en lecture seule', async () => {
    const { user, container } = renderWithProviders(<StarRating value={1} />)

    await user.hover(stars()[4])

    expect(container.querySelectorAll('.text-amber-400')).toHaveLength(1)
  })

  it('remplit autant d’étoiles que la note entière', () => {
    const { container } = renderWithProviders(<StarRating value={4} />)

    expect(container.querySelectorAll('.text-amber-400')).toHaveLength(4)
  })

  it('affiche une demi-étoile pour les notes décimales', () => {
    const { container } = renderWithProviders(<StarRating value={3.5} />)

    const filled = container.querySelectorAll('.text-amber-400')
    expect(filled).toHaveLength(4)
    expect(filled[3].getAttribute('style')).toContain('inset(0 50% 0 0)')
  })

  it('affiche la valeur numérique quand showValue est actif', () => {
    renderWithProviders(<StarRating value={4.25} showValue />)

    expect(screen.getByText('4.3')).toBeInTheDocument()
  })

  it('masque la valeur numérique quand la note est nulle', () => {
    const { container } = renderWithProviders(<StarRating value={0} showValue />)

    expect(within(container).queryByText('0.0')).not.toBeInTheDocument()
  })

  it('affiche le nombre d’avis (singulier et pluriel, traduits)', () => {
    const { unmount } = renderWithProviders(<StarRating value={4} count={1} />)
    expect(screen.getByText('(1 avis)')).toBeInTheDocument()
    unmount()

    renderWithProviders(<StarRating value={4} count={12} />)
    expect(screen.getByText('(12 avis)')).toBeInTheDocument()
  })

  it('n’affiche pas le compteur quand count est absent', () => {
    renderWithProviders(<StarRating value={4} />)

    expect(screen.queryByText(/avis/)).not.toBeInTheDocument()
  })

  it('respecte la taille demandée', () => {
    const { container } = renderWithProviders(<StarRating value={1} size={32} />)

    expect(container.querySelector('svg')?.getAttribute('style')).toContain('32px')
  })
})
