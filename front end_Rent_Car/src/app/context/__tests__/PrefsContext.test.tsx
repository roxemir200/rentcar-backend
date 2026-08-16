import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../locales'
import { PrefsProvider, usePrefs } from '../PrefsContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <PrefsProvider>{children}</PrefsProvider>
  </I18nextProvider>
)

const renderPrefs = () => renderHook(() => usePrefs(), { wrapper })

describe('PrefsContext · garde d’utilisation', () => {
  it('lève une erreur explicite hors PrefsProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => usePrefs())).toThrow('usePrefs must be used within PrefsProvider')

    spy.mockRestore()
  })
})

describe('PrefsContext · thème', () => {
  it('démarre en thème clair par défaut', () => {
    const { result } = renderPrefs()

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restaure le thème stocké', () => {
    localStorage.setItem('rentcar-theme', 'dark')

    const { result } = renderPrefs()

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('bascule le thème, applique la classe et persiste le choix', () => {
    const { result } = renderPrefs()

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('rentcar-theme')).toBe('dark')

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('rentcar-theme')).toBe('light')
  })
})

describe('PrefsContext · langue et traduction', () => {
  it('expose la langue courante, sa direction et la persiste', async () => {
    const { result } = renderPrefs()

    expect(result.current.lang).toBe('fr')
    expect(result.current.dir).toBe('ltr')
    await waitFor(() => expect(localStorage.getItem('rentcar-lang')).toBe('fr'))
  })

  it('traduit les clés dans la langue courante', async () => {
    const { result } = renderPrefs()

    expect(result.current.t('nav.cars')).toBe('Voitures')

    await act(async () => {
      result.current.setLang('en')
    })

    await waitFor(() => expect(result.current.t('nav.cars')).toBe('Cars'))
  })

  it('passe en direction RTL pour l’arabe', async () => {
    const { result } = renderPrefs()

    await act(async () => {
      result.current.setLang('ar')
    })

    await waitFor(() => expect(result.current.dir).toBe('rtl'))
    expect(document.documentElement.dir).toBe('rtl')
    expect(localStorage.getItem('rentcar-lang')).toBe('ar')

    await act(async () => {
      result.current.setLang('fr')
    })
  })

  it('fournit les préférences aux composants enfants', () => {
    const Child = () => {
      const { t, theme } = usePrefs()
      return <p>{t('nav.home')} · {theme}</p>
    }

    render(
      <I18nextProvider i18n={i18n}>
        <PrefsProvider><Child /></PrefsProvider>
      </I18nextProvider>,
    )

    expect(screen.getByText(/Accueil · light/)).toBeInTheDocument()
  })
})
