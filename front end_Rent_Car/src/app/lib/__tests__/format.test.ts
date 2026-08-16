import { describe, expect, it, vi, afterEach } from 'vitest'
import { daysBetween, euro, formatDate, relativeTime } from '../format'

describe('lib/format · euro()', () => {
  it('formate un entier avec le suffixe DT', () => {
    expect(euro(120)).toBe('120 DT')
  })

  it('arrondit à l’unité (aucune décimale affichée)', () => {
    expect(euro(120.4)).toBe('120 DT')
    expect(euro(120.6)).toBe('121 DT')
  })

  it('groupe les milliers selon la locale fr-FR', () => {
    // fr-FR utilise une espace insécable étroite comme séparateur de milliers
    expect(euro(12000).replace(/\s| | /g, '')).toBe('12000DT')
  })

  it('retourne "0 DT" pour undefined, null et 0', () => {
    expect(euro(undefined)).toBe('0 DT')
    expect(euro(null)).toBe('0 DT')
    expect(euro(0)).toBe('0 DT')
  })

  it('gère les montants négatifs', () => {
    expect(euro(-50)).toBe('-50 DT')
  })
})

describe('lib/format · daysBetween()', () => {
  it('compte les jours entre deux dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-05')).toBe(4)
  })

  it('retourne 0 quand les dates sont identiques', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
  })

  it('arrondit à l’entier supérieur les journées partielles', () => {
    expect(daysBetween('2026-03-01T10:00:00Z', '2026-03-02T12:00:00Z')).toBe(2)
  })

  it('ne retourne jamais de valeur négative (dates inversées)', () => {
    expect(daysBetween('2026-03-05', '2026-03-01')).toBe(0)
  })
})

describe('lib/format · formatDate()', () => {
  it('retourne une chaîne vide si la date est absente', () => {
    expect(formatDate()).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('formate une date ISO au format jour/mois/année', () => {
    const out = formatDate('2026-03-01T00:00:00.000Z')
    expect(out).toMatch(/1\D+03\D+2026/)
  })

  it('ajoute l’heure quand includeTime est vrai', () => {
    const out = formatDate('2026-03-01T14:30:00.000Z', true)
    expect(out).toMatch(/\d{2}:\d{2}/)
  })
})

describe('lib/format · relativeTime()', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (iso: string) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(iso))
  }

  it('affiche "quelques secondes" en dessous d’une minute', () => {
    at('2026-03-01T12:00:30.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a quelques secondes')
  })

  it('affiche les minutes au singulier puis au pluriel', () => {
    at('2026-03-01T12:01:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 1 minute')
    at('2026-03-01T12:05:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 5 minutes')
  })

  it('affiche les heures au singulier puis au pluriel', () => {
    at('2026-03-01T13:00:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 1 heure')
    at('2026-03-01T18:00:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 6 heures')
  })

  it('affiche les jours jusqu’à une semaine', () => {
    at('2026-03-02T12:00:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 1 jour')
    at('2026-03-04T12:00:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe('Il y a 3 jours')
  })

  it('bascule sur la date absolue au-delà de 7 jours', () => {
    at('2026-03-20T12:00:00.000Z')
    expect(relativeTime('2026-03-01T12:00:00.000Z')).toBe(formatDate('2026-03-01T12:00:00.000Z'))
  })
})
