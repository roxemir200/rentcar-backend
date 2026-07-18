import { useState } from "react";
import { Sun, Moon, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePrefs } from "../../context/PrefsContext";
import { LANGS } from "../../i18n/translations";
import { cn } from "../ui/utils";

// Toggle Mode clair / sombre avec rotation animée de l'icône
export function ThemeToggle({ onDark }: { onDark?: boolean }) {
  const { theme, toggleTheme, t } = usePrefs();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
      className={cn(
        "size-10 rounded-lg flex items-center justify-center transition-colors",
        onDark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}>
            <Sun className="size-5" />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.25 }}>
            <Moon className="size-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// Sélecteur de langue FR / EN / AR
export function LanguageSwitcher({ onDark }: { onDark?: boolean }) {
  const { lang, setLang } = usePrefs();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-10 px-2.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors",
          onDark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase">{current.code}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute end-0 mt-2 w-44 bg-card rounded-xl shadow-xl border border-border py-1.5 z-20"
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="text-base">{l.flag}</span>
                  <span className="flex-1 text-start">{l.label}</span>
                  {l.code === lang && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
