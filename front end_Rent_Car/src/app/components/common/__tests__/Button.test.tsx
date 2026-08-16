import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('components/Button', () => {
  it('rend son contenu et est cliquable', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Réserver</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Réserver' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const)(
    'applique la classe de la variante %s',
    (variant) => {
      render(<Button variant={variant}>X</Button>)
      expect(screen.getByRole('button').className).not.toBe('')
    },
  )

  it.each([
    ['sm', 'h-8'],
    ['md', 'h-10'],
    ['lg', 'h-12'],
  ] as const)('applique la hauteur de la taille %s', (size, expected) => {
    render(<Button size={size}>X</Button>)
    expect(screen.getByRole('button')).toHaveClass(expected)
  })

  it('utilise la variante primary et la taille md par défaut', () => {
    render(<Button>X</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-primary')
    expect(btn).toHaveClass('h-10')
  })

  it('affiche un spinner et se désactive pendant le chargement', async () => {
    const onClick = vi.fn()
    const { container } = render(<Button loading onClick={onClick}>Envoyer</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('respecte la prop disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>X</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('fusionne la className fournie et transmet les attributs natifs', () => {
    render(<Button className="w-full" type="submit" aria-label="valider">X</Button>)

    const btn = screen.getByRole('button', { name: 'valider' })
    expect(btn).toHaveClass('w-full')
    expect(btn).toHaveAttribute('type', 'submit')
  })

  it('expose la ref du bouton natif', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>X</Button>)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
