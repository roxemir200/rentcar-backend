import { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Card, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { usePrefs } from "../../context/PrefsContext";
import { cn } from "../../components/ui/utils";

// Calcule un score de force 0..4
function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "Très faible", color: "bg-red-500", text: "text-red-500", width: "20%" },
  { label: "Faible", color: "bg-orange-500", text: "text-orange-500", width: "40%" },
  { label: "Moyen", color: "bg-amber-500", text: "text-amber-500", width: "60%" },
  { label: "Bon", color: "bg-lime-500", text: "text-lime-600", width: "80%" },
  { label: "Excellent", color: "bg-emerald-500", text: "text-emerald-600", width: "100%" },
];

export default function ChangePassword() {
  const { changePassword } = useApp();
  const { t } = usePrefs();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const score = scorePassword(next);
  const level = LEVELS[Math.max(0, score - 1)] ?? LEVELS[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "Requis.";
    if (next.length < 6) errs.next = "Minimum 6 caractères.";
    if (confirm !== next) errs.confirm = "Les mots de passe ne correspondent pas.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setTimeout(() => {
      const res = changePassword(current, next);
      setSaving(false);
      if (!res.ok) {
        setErrors({ current: res.error ?? "Erreur." });
        toast.error(res.error ?? "Erreur.");
        return;
      }
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
      toast.success(t("pwd.success"));
    }, 700);
  };

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>{t("pwd.title")}</h1>
          <p className="text-muted-foreground">{t("pwd.subtitle")}</p>
        </div>

        {done && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="size-5 shrink-0" /> {t("pwd.success")}
          </motion.div>
        )}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label={t("pwd.current")} name="current" type="password" required
              leftIcon={<Lock className="size-4" />}
              value={current} onChange={(e) => { setCurrent(e.target.value); setErrors((p) => ({ ...p, current: "" })); }}
              error={errors.current}
            />

            <div>
              <Input
                label={t("pwd.new")} name="new" type="password" required
                leftIcon={<Lock className="size-4" />}
                value={next} onChange={(e) => { setNext(e.target.value); setDone(false); setErrors((p) => ({ ...p, next: "" })); }}
                error={errors.next} hint="Au moins 6 caractères."
              />
              {next && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{t("pwd.strength")}</span>
                    <span className={cn("text-xs font-medium", level.text)}>{level.label}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", level.color)}
                      initial={false} animate={{ width: level.width }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}
            </div>

            <Input
              label={t("pwd.confirm")} name="confirm" type="password" required
              leftIcon={<Lock className="size-4" />}
              value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
              error={errors.confirm}
            />

            <div className="flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              <ShieldCheck className="size-4 shrink-0 mt-0.5" />
              <span>Choisissez un mot de passe unique combinant lettres, chiffres et symboles.</span>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={saving}>
              <Lock className="size-4" /> {t("pwd.update")}
            </Button>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}
