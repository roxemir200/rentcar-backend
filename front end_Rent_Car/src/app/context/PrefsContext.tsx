import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { LANGS, translate, type Lang, type TranslationKey } from "../i18n/translations";

type Theme = "light" | "dark";

interface PrefsValue {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "ltr" | "rtl";
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
  const [theme, setTheme] = useState<Theme>(() => readStored<Theme>("rentcar-theme", "light"));
  const [lang, setLangState] = useState<Lang>(() => readStored<Lang>("rentcar-lang", "fr"));

  const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";

  // Applique le thème sur <html> et persiste
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("rentcar-theme", theme); } catch { /* ignore */ }
  }, [theme]);

  // Applique la langue + direction sur <html> et persiste
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", dir);
    try { localStorage.setItem("rentcar-lang", lang); } catch { /* ignore */ }
  }, [lang, dir]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);

  return (
    <PrefsContext.Provider value={{ theme, toggleTheme, lang, setLang, dir, t }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
