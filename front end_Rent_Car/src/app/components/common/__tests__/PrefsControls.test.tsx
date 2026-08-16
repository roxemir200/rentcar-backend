import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/test-utils'
import { LanguageSwitcher, ThemeToggle } from '../PrefsControls'

describe('components/PrefsControls · ThemeToggle', () => {
  it('propose de passer en thème sombre par défaut', () => {
    renderWithProviders(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Mode sombre' })).toBeInTheDocument()
  })

  it('bascule le thème et met à jour le libellé accessible', async () => {
    const { user } = renderWithProviders(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Mode sombre' }))

    expect(await screen.findByRole('button', { name: 'Mode clair' })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('rentcar-theme')).toBe('dark')
  })

  it('adapte ses couleurs sur fond sombre', () => {
    renderWithProviders(<ThemeToggle onDark />)

    expect(screen.getByRole('button')).toHaveClass('text-white/80')
  })
})

describe('components/PrefsControls · LanguageSwitcher', () => {
  it('affiche la langue courante', () => {
    renderWithProviders(<LanguageSwitcher />)

    expect(screen.getByText('fr')).toBeInTheDocument()
  })

  it('ouvre la liste des langues disponibles', async () => {
    const { user } = renderWithProviders(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Français')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('العربية')).toBeInTheDocument()
  })

  it('change la langue et referme la liste', async () => {
    const { user } = renderWithProviders(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByText('English'))

    await waitFor(() => expect(screen.getByText('en')).toBeInTheDocument())
    expect(screen.queryByText('Français')).not.toBeInTheDocument()
    expect(localStorage.getItem('rentcar-lang')).toBe('en')
  })

  it('referme la liste au clic à l’extérieur', async () => {
    const { user, container } = renderWithProviders(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))
    await screen.findByText('Français')

    await user.click(container.querySelector('.fixed.inset-0') as HTMLElement)

    await waitFor(() => expect(screen.queryByText('Français')).not.toBeInTheDocument())
  })

  it('adapte ses couleurs sur fond sombre', () => {
    renderWithProviders(<LanguageSwitcher onDark />)

    expect(screen.getByRole('button')).toHaveClass('text-white/80')
  })
})
