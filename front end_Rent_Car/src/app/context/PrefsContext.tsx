import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { Lang, TranslationKey } from '../i18n/translations';

type Theme = 'light' | 'dark';

interface PrefsValue {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: 'ltr' | 'rtl';
  t: (key: TranslationKey) => string;
}

const PrefsContext = createContext<PrefsValue | null>(null);

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (v as unknown as T) : fallback;
  } catch {
    return fallback;
  }
};

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStored<Theme>('rentcar-theme', 'light'));
  const { t, currentLang, dir, changeLanguage } = useTranslation();

  // Sync langue initiale i18n (langue détectée par i18next) vers l'ancienne clé
  useEffect(() => {
    try { localStorage.setItem('rentcar-lang', currentLang); } catch { /* ignore */ }
  }, [currentLang]);

  // Applique le thème sur <html> et persiste
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('rentcar-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  const setLang = useCallback(
    (l: Lang) => {
      void changeLanguage(l);
    },
    [changeLanguage],
  );

  return (
    <PrefsContext.Provider value={{ theme, toggleTheme, lang: currentLang, setLang, dir, t }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
