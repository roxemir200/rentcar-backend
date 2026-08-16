import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ImageWithFallback } from '../ImageWithFallback'

describe('components/ImageWithFallback', () => {
  it('rend l’image demandée avec ses attributs', () => {
    render(<ImageWithFallback src="https://cdn/x.jpg" alt="Clio" className="rounded" />)

    const img = screen.getByRole('img', { name: 'Clio' })
    expect(img).toHaveAttribute('src', 'https://cdn/x.jpg')
    expect(img).toHaveClass('rounded')
  })

  it('transmet les attributs natifs supplémentaires', () => {
    render(<ImageWithFallback src="x" alt="a" loading="lazy" data-testid="img" />)

    expect(screen.getByTestId('img')).toHaveAttribute('loading', 'lazy')
  })

  it('bascule sur le visuel de repli quand le chargement échoue', () => {
    render(<ImageWithFallback src="https://cdn/broken.jpg" alt="Clio" />)

    fireEvent.error(screen.getByRole('img', { name: 'Clio' }))

    const fallback = screen.getByRole('img', { name: 'Error loading image' })
    expect(fallback).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'))
    expect(screen.queryByRole('img', { name: 'Clio' })).not.toBeInTheDocument()
  })

  it('conserve l’URL d’origine sur le repli pour le diagnostic', () => {
    render(<ImageWithFallback src="https://cdn/broken.jpg" alt="Clio" />)

    fireEvent.error(screen.getByRole('img', { name: 'Clio' }))

    expect(screen.getByRole('img', { name: 'Error loading image' })).toHaveAttribute(
      'data-original-url',
      'https://cdn/broken.jpg',
    )
  })

  it('applique className et fallbackClassName au conteneur de repli', () => {
    const { container } = render(
      <ImageWithFallback src="x" alt="a" className="size-full" fallbackClassName="bg-slate-100" />,
    )

    fireEvent.error(screen.getByRole('img', { name: 'a' }))

    expect(container.firstChild).toHaveClass('size-full')
    expect(container.firstChild).toHaveClass('bg-slate-100')
  })

  it('conserve le style inline sur le repli', () => {
    const { container } = render(<ImageWithFallback src="x" alt="a" style={{ height: '48px' }} />)

    fireEvent.error(screen.getByRole('img', { name: 'a' }))

    expect(container.firstChild).toHaveStyle({ height: '48px' })
  })
})
