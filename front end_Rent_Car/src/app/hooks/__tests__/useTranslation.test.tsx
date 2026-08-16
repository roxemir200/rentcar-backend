import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../locales'
import { useTranslation } from '../useTranslation'

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
)

const renderTr = () => renderHook(() => useTranslation(), { wrapper })

afterEach(async () => {
  await i18n.changeLanguage('fr')
})

describe('hooks/useTranslation', () => {
  it('expose la langue courante, sa direction et la liste des langues', () => {
    const { result } = renderTr()

    expect(result.current.currentLang).toBe('fr')
    expect(result.current.dir).toBe('ltr')
    expect(result.current.isRTL).toBe(false)
    expect(result.current.langs.map((l) => l.code)).toEqual(['fr', 'en', 'ar'])
  })

  it('traduit une clé connue', () => {
    const { result } = renderTr()

    expect(result.current.t('nav.cars')).toBe('Voitures')
  })

  it('retourne la clé telle quelle si elle est inconnue', () => {
    const { result } = renderTr()

    expect(result.current.t('cle.inexistante' as never)).toBe('cle.inexistante')
  })

  it('interpole les variables fournies', () => {
    const { result } = renderTr()

    expect(result.current.t('cars.foundCount_other', { count: 7 } as never)).toBe('7 véhicules trouvés')
  })

  it('change de langue, persiste le choix et met à jour le document', async () => {
    const { result } = renderTr()

    await act(async () => {
      await result.current.changeLanguage('en')
    })

    await waitFor(() => expect(result.current.currentLang).toBe('en'))
    expect(result.current.t('nav.cars')).toBe('Cars')
    expect(localStorage.getItem('rentcar-lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('bascule le document en RTL pour l’arabe', async () => {
    const { result } = renderTr()

    await act(async () => {
      await result.current.changeLanguage('ar')
    })

    await waitFor(() => expect(result.current.isRTL).toBe(true))
    expect(result.current.dir).toBe('rtl')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('applique tout de même la langue au document si le stockage échoue', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const { result } = renderTr()

    await act(async () => {
      await result.current.changeLanguage('ar')
    })

    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    setItem.mockRestore()
  })

  it('retombe sur le français si la langue résolue n’est pas supportée', async () => {
    const { result } = renderTr()

    await act(async () => {
      await i18n.changeLanguage('de')
    })

    expect(result.current.currentLang).toBe('fr')
  })
})
