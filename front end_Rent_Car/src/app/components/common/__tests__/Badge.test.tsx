import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, ContractBadge, PaymentBadge, ReservationBadge } from '../Badge'
import type { ContractStatus, PaymentStatus, ReservationStatus } from '../../../data/types'

describe('components/Badge', () => {
  it('rend son libellé', () => {
    render(<Badge>Nouveau</Badge>)
    expect(screen.getByText('Nouveau')).toBeInTheDocument()
  })

  it('utilise la variante neutral et la taille md par défaut', () => {
    render(<Badge>Neutre</Badge>)
    const badge = screen.getByText('Neutre')
    expect(badge).toHaveClass('bg-slate-100')
    expect(badge).toHaveClass('text-sm')
  })

  it.each(['success', 'warning', 'error', 'info', 'neutral', 'gold'] as const)(
    'applique les couleurs de la variante %s',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>)
      expect(screen.getByText(variant).className).toContain('border-')
    },
  )

  it('réduit le padding en taille sm', () => {
    render(<Badge size="sm">Petit</Badge>)
    expect(screen.getByText('Petit')).toHaveClass('text-xs')
  })

  it('affiche une pastille colorée quand dot est actif', () => {
    const { container } = render(<Badge variant="success" dot>Actif</Badge>)
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })

  it('n’affiche aucune pastille par défaut', () => {
    const { container } = render(<Badge variant="success">Actif</Badge>)
    expect(container.querySelector('.rounded-full.size-1\\.5')).not.toBeInTheDocument()
  })

  it('fusionne la className personnalisée', () => {
    render(<Badge className="ml-2">X</Badge>)
    expect(screen.getByText('X')).toHaveClass('ml-2')
  })
})

describe('components/Badge · mappings métier', () => {
  const reservationLabels: [ReservationStatus, string][] = [
    ['PENDING', 'En attente'],
    ['CONFIRMED', 'Confirmée'],
    ['IN_PROGRESS', 'En cours'],
    ['COMPLETED', 'Terminée'],
    ['CANCELLED', 'Annulée'],
  ]

  it.each(reservationLabels)('ReservationBadge %s → "%s"', (status, label) => {
    render(<ReservationBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  const contractLabels: [ContractStatus, string][] = [
    ['DRAFT', 'Brouillon'],
    ['SIGNED', 'Signé'],
    ['CANCELLED', 'Annulé'],
  ]

  it.each(contractLabels)('ContractBadge %s → "%s"', (status, label) => {
    render(<ContractBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  const paymentLabels: [PaymentStatus, string][] = [
    ['PENDING', 'En attente'],
    ['COMPLETED', 'Payé'],
    ['FAILED', 'Échoué'],
    ['REFUNDED', 'Remboursé'],
  ]

  it.each(paymentLabels)('PaymentBadge %s → "%s"', (status, label) => {
    render(<PaymentBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
