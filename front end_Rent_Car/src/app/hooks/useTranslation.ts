import { useCallback } from 'react';
import { useTranslation as useReactI18n } from 'react-i18next';
import type { TOptions } from 'i18next';
import { applyDocumentLang, I18N_LANGS, type I18nLang } from '../locales';
import type { TranslationKey } from '../i18n/translations';

/**
 * Wrapper professionnel autour de react-i18next useTranslation.
 *
 * - Retourne `t()` TYPE-SAFE (contraint sur `TranslationKey`)
 * - `changeLanguage(lang)` : synchrone i18n + localStorage + document.dir/lang
 * - Expose `langs`, `currentLang`, `isRTL` et `dir` pour les UI layouts
 */
export function useTranslation() {
  const { t: i18nT, i18n } = useReactI18n();

  const currentLang = (
    ['fr', 'en', 'ar'].includes(i18n.resolvedLanguage ?? '')
      ? i18n.resolvedLanguage
      : 'fr'
  ) as I18nLang;

  const currentLangMeta = I18N_LANGS.find(l => l.code === currentLang) ?? I18N_LANGS[0];
  const dir = currentLangMeta.dir;
  const isRTL = dir === 'rtl';

  const t = useCallback(
    (key: TranslationKey, options?: TOptions): string => {
      const v = i18nT(key as string, options as TOptions<Record<string, unknown>>);
      return typeof v === 'string' ? v : key;
    },
    [i18nT],
  );

  const changeLanguage = useCallback(
    async (lang: I18nLang): Promise<void> => {
      try {
        localStorage.setItem('rentcar-lang', lang);
        await i18n.changeLanguage(lang);
        applyDocumentLang(lang);
      } catch {
        applyDocumentLang(lang);
      }
    },
    [i18n],
  );

  return {
    t,
    i18n,
    currentLang,
    dir,
    isRTL,
    langs: I18N_LANGS,
    changeLanguage,
  };
}
