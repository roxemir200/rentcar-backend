import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Mail, MailCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { authAPI } from "../../api/auth.api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.success) {
        setSent(true);
        toast.success("Un lien de réinitialisation a été envoyé");
      } else {
        setError(response.message || "Une erreur est survenue");
        toast.error(response.message || "Une erreur est survenue");
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || "Erreur de connexion";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Nous vous enverrons un lien de réinitialisation.">
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <div className="size-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5">
            <MailCheck className="size-9" />
          </div>
          <h3 className="text-foreground">Email envoyé ! 🎉</h3>
          <p className="mt-2 text-muted-foreground">
            Vérifiez votre boîte de réception à <span className="font-medium text-foreground">{email}</span>{" "}
            et suivez le lien pour réinitialiser votre mot de passe.
          </p>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full mt-6">
              Retour à la connexion
            </Button>
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            placeholder="vous@exemple.com"
            leftIcon={<Mail className="size-4.5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? "Envoi en cours..." : "Envoyer le lien"}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary font-medium hover:underline">
              ← Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
