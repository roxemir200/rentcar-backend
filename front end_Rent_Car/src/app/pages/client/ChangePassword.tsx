// front end_Rent_Car\src\app\pages\client\ChangePassword.tsx

import { useState, useCallback, useEffect } from "react";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Card, PageTransition } from "../../components/common/Misc";
import { usePrefs } from "../../context/PrefsContext";
import { cn } from "../../components/ui/utils";
import { authAPI } from "../../api/auth.api";

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
  const { t } = usePrefs();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const score = scorePassword(next);
  const level = LEVELS[Math.max(0, score - 1)] ?? LEVELS[0];

  // ─── VALIDATION EN TEMPS RÉEL ───
  const validateField = useCallback((field: string, value: string) => {
    const newErrors: Record<string, string> = { ...errors };

    switch (field) {
      case "current":
        if (!value.trim()) {
          newErrors.current = "Le mot de passe actuel est obligatoire";
        } else {
          delete newErrors.current;
        }
        break;

      case "next":
        if (!value.trim()) {
          newErrors.next = "Le nouveau mot de passe est obligatoire";
        } else if (value.length < 6) {
          newErrors.next = "Le mot de passe doit avoir au moins 6 caractères";
        } else {
          delete newErrors.next;
        }
        // Revalider la confirmation si elle est remplie
        if (confirm && value !== confirm) {
          newErrors.confirm = "Les mots de passe ne correspondent pas";
        } else if (confirm && value === confirm) {
          delete newErrors.confirm;
        }
        break;

      case "confirm":
        if (!value.trim() && next) {
          newErrors.confirm = "Veuillez confirmer le mot de passe";
        } else if (value && value !== next) {
          newErrors.confirm = "Les mots de passe ne correspondent pas";
        } else {
          delete newErrors.confirm;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  }, [errors, next, confirm]);

  // ─── VALIDATION LORS DU CHANGEMENT ───
  const handleChange = (field: string, value: string) => {
    // Mettre à jour la valeur
    switch (field) {
      case "current":
        setCurrent(value);
        break;
      case "next":
        setNext(value);
        setDone(false);
        break;
      case "confirm":
        setConfirm(value);
        break;
      default:
        break;
    }

    // Marquer comme touché
    setTouched(prev => ({ ...prev, [field]: true }));

    // Valider en temps réel
    if (touched[field]) {
      validateField(field, value);
    }
  };

  // ─── VALIDATION AU FLOUTAGE ───
  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // ─── VALIDATION COMPLÈTE AVANT SOUMISSION ───
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Vérifier le mot de passe actuel
    if (!current.trim()) {
      newErrors.current = "Le mot de passe actuel est obligatoire";
    }

    // Vérifier le nouveau mot de passe
    if (!next.trim()) {
      newErrors.next = "Le nouveau mot de passe est obligatoire";
    } else if (next.length < 6) {
      newErrors.next = "Le mot de passe doit avoir au moins 6 caractères";
    }

    // Vérifier la confirmation
    if (!confirm.trim()) {
      newErrors.confirm = "Veuillez confirmer le mot de passe";
    } else if (confirm !== next) {
      newErrors.confirm = "Les mots de passe ne correspondent pas";
    }

    // Marquer tous les champs comme touchés
    setTouched({
      current: true,
      next: true,
      confirm: true,
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── SOUMISSION ───
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valider
    if (!validateAll()) {
      toast.error("Veuillez corriger les erreurs");
      return;
    }

    setSaving(true);

    try {
      const response = await authAPI.changePassword({
        currentPassword: current,
        newPassword: next,
      });

      // Vérifier la réponse
      if (response?.success === true) {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
        setErrors({});
        setTouched({});
        toast.success("Mot de passe modifié avec succès");
      } else {
        const errorMsg = response?.message || "Erreur lors du changement";
        setErrors({ current: errorMsg });
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || "Erreur de connexion au serveur";
      setErrors({ current: errorMsg });
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // ─── RÉINITIALISER LES ERREURS QUAND UN CHAMP CHANGE ───
  useEffect(() => {
    if (done) {
      setDone(false);
    }
  }, [current, next, confirm]);

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {t("pwd.title")}
          </h1>
          <p className="text-muted-foreground">{t("pwd.subtitle")}</p>
        </div>

        {done && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            {t("pwd.success")}
          </motion.div>
        )}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            {/* Mot de passe actuel */}
            <div>
              <Input
                label={t("pwd.current")}
                name="current"
                type="password"
                required
                leftIcon={<Lock className="size-4" />}
                value={current}
                onChange={(e) => handleChange("current", e.target.value)}
                onBlur={(e) => handleBlur("current", e.target.value)}
                error={touched.current ? errors.current : undefined}
                placeholder="Votre mot de passe actuel"
              />
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <Input
                label={t("pwd.new")}
                name="new"
                type="password"
                required
                leftIcon={<Lock className="size-4" />}
                value={next}
                onChange={(e) => handleChange("next", e.target.value)}
                onBlur={(e) => handleBlur("next", e.target.value)}
                error={touched.next ? errors.next : undefined}
                placeholder="Nouveau mot de passe (min 6 caractères)"
              />

      
            </div>

            {/* Confirmation */}
            <div>
              <Input
                label={t("pwd.confirm")}
                name="confirm"
                type="password"
                required
                leftIcon={<Lock className="size-4" />}
                value={confirm}
                onChange={(e) => handleChange("confirm", e.target.value)}
                onBlur={(e) => handleBlur("confirm", e.target.value)}
                error={touched.confirm ? errors.confirm : undefined}
                placeholder="Confirmez votre nouveau mot de passe"
              />
            </div>

            {/* Conseils de sécurité */}
            <div className="flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              <ShieldCheck className="size-4 shrink-0 mt-0.5" />
              <span>Choisissez un mot de passe unique combinant lettres, chiffres et symboles.</span>
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={saving}
              disabled={saving || Object.keys(errors).length > 0}
            >
              <Lock className="size-4" />
              {t("pwd.update")}
            </Button>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}