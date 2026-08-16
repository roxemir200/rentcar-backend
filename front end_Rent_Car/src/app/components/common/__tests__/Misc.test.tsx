import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CarCardSkeleton, EmptyState, PageTransition, Skeleton, StatCard } from '../Misc'
import { PageHeader, Table, Td } from '../AdminTable'

describe('components/Misc · Card', () => {
  it('rend ses enfants', () => {
    render(<Card>Contenu</Card>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  it('ajoute les classes de survol quand hover est actif', () => {
    const { container } = render(<Card hover>C</Card>)
    expect(container.firstChild).toHaveClass('hover:shadow-lg')
  })

  it('n’ajoute pas les classes de survol par défaut', () => {
    const { container } = render(<Card>C</Card>)
    expect(container.firstChild).not.toHaveClass('hover:shadow-lg')
  })

  it('fusionne la className fournie', () => {
    const { container } = render(<Card className="p-5">C</Card>)
    expect(container.firstChild).toHaveClass('p-5')
  })
})

describe('components/Misc · EmptyState', () => {
  it('affiche l’icône et le titre', () => {
    render(<EmptyState icon={<span data-testid="icon" />} title="Aucun résultat" />)

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aucun résultat' })).toBeInTheDocument()
  })

  it('affiche description et action quand elles sont fournies', () => {
    render(
      <EmptyState
        icon={<span />}
        title="Vide"
        description="Essayez d’élargir vos critères."
        action={<button>Réinitialiser</button>}
      />,
    )

    expect(screen.getByText('Essayez d’élargir vos critères.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })

  it('omet description et action quand elles sont absentes', () => {
    render(<EmptyState icon={<span />} title="Vide" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('components/Misc · Skeletons', () => {
  it('Skeleton applique l’animation de chargement', () => {
    const { container } = render(<Skeleton className="h-4" />)

    expect(container.firstChild).toHaveClass('animate-pulse')
    expect(container.firstChild).toHaveClass('h-4')
  })

  it('CarCardSkeleton compose plusieurs blocs animés', () => {
    const { container } = render(<CarCardSkeleton />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(3)
  })
})

describe('components/Misc · PageTransition', () => {
  it('rend ses enfants', () => {
    render(<PageTransition><p>Ma page</p></PageTransition>)
    expect(screen.getByText('Ma page')).toBeInTheDocument()
  })
})

describe('components/Misc · StatCard', () => {
  it('affiche le libellé, la valeur et l’icône', () => {
    render(<StatCard icon={<span data-testid="icon" />} label="Revenus" value="12 000 DT" />)

    expect(screen.getByText('Revenus')).toBeInTheDocument()
    expect(screen.getByText('12 000 DT')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('accepte une valeur numérique', () => {
    render(<StatCard icon={<span />} label="Voitures" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it.each(['default', 'success', 'danger', 'warning', 'info', 'gold'] as const)(
    'applique la tonalité %s',
    (tone) => {
      const { container } = render(<StatCard icon={<span />} label="L" value={1} tone={tone} />)
      expect(container.querySelector('.size-11')).toBeInTheDocument()
    },
  )
})

describe('components/AdminTable', () => {
  it('PageHeader affiche titre, sous-titre et action', () => {
    render(<PageHeader title="Voitures" subtitle="12 véhicules" action={<button>Ajouter</button>} />)

    expect(screen.getByRole('heading', { name: 'Voitures' })).toBeInTheDocument()
    expect(screen.getByText('12 véhicules')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('PageHeader fonctionne sans sous-titre ni action', () => {
    render(<PageHeader title="Voitures" />)

    expect(screen.getByRole('heading', { name: 'Voitures' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('Table rend les en-têtes et les lignes', () => {
    render(
      <Table head={['Nom', 'Email']}>
        <tr>
          <Td>Amine</Td>
          <Td className="text-muted-foreground">amine@example.com</Td>
        </tr>
      </Table>,
    )

    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Nom', 'Email'])
    expect(screen.getByRole('cell', { name: 'Amine' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'amine@example.com' })).toHaveClass('text-muted-foreground')
  })
})
