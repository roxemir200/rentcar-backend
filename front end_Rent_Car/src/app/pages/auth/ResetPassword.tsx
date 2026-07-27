import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { authAPI } from "../../api/auth.api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);

  // Vérifier le token au chargement
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setValidToken(false);
        setVerifying(false);
        return;
      }

      try {
        const response = await authAPI.verifyResetToken(token);
        setValidToken(response.success);
      } catch {
        setValidToken(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!newPassword || newPassword.length < 6) {
      setError("Le mot de passe doit avoir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token!, newPassword);
      if (response.success) {
        toast.success("Mot de passe réinitialisé avec succès !");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || "Erreur de connexion";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // État de vérification
  if (verifying) {
    return (
      <AuthShell title="Vérification" subtitle="Veuillez patienter...">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Vérification du lien...</p>
        </div>
      </AuthShell>
    );
  }

  // Token invalide
  if (!validToken) {
    return (
      <AuthShell title="Lien invalide" subtitle="Ce lien n'est plus valide.">
        <div className="text-center py-6">
          <div className="size-16 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
            <Lock className="size-9" />
          </div>
          <h3 className="text-foreground">Lien expiré ou invalide</h3>
          <p className="mt-2 text-muted-foreground">
            Votre lien de réinitialisation a expiré ou a déjà été utilisé.
          </p>
          <Link to="/forgot-password">
            <Button variant="outline" size="lg" className="w-full mt-6">
              Renvoyer un lien
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Formulaire de réinitialisation
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nouveau mot de passe"
          type="password"
          required
          placeholder="Minimum 6 caractères"
          leftIcon={<Lock className="size-4.5" />}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={error}
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          required
          placeholder="Répétez votre mot de passe"
          leftIcon={<Lock className="size-4.5" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={error}
        />

        <div className="flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          <ShieldCheck className="size-4 shrink-0 mt-0.5" />
          <span>Le mot de passe doit contenir au moins 6 caractères.</span>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
        </Button>

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary font-medium hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
