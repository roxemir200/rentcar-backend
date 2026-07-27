import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { AuthShell } from "./AuthShell";
import { Button } from "../../components/common/Button";
import { authAPI } from "../../api/auth.api";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token de vérification manquant");
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        if (response.success) {
          setStatus("success");
          setMessage(response.message || "Email vérifié avec succès !");
          toast.success("Email vérifié ! Vous pouvez maintenant vous connecter.");
        } else {
          setStatus("error");
          setMessage(response.message || "Token invalide ou expiré");
          toast.error(response.message || "Token invalide ou expiré");
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.response?.data?.message || "Une erreur est survenue lors de la vérification");
        toast.error("Erreur de vérification");
      }
    };

    verify();
  }, [token]);

  if (status === "loading") {
    return (
      <AuthShell title="Vérification" subtitle="Veuillez patienter...">
        <div className="text-center py-8">
          <Loader2 className="size-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Vérification de votre email...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={status === "success" ? "Email vérifié !" : "Vérification échouée"}
      subtitle={status === "success" ? "Votre compte est maintenant actif." : "Le lien n'est plus valide."}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <div className={`size-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${status === "success" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
          {status === "success" ? <CheckCircle2 className="size-9" /> : <XCircle className="size-9" />}
        </div>
        <h3 className="text-foreground">{message}</h3>
        {status === "success" ? (
          <p className="mt-2 text-muted-foreground">
            Vous pouvez maintenant vous connecter à votre compte.
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Le lien de vérification a expiré ou est invalide.
          </p>
        )}
        <Button
          size="lg"
          className="w-full mt-6"
          onClick={() => navigate(status === "success" ? "/login" : "/register")}
        >
          {status === "success" ? "Se connecter" : "Créer un nouveau compte"}
        </Button>
        {status === "error" && (
          <p className="mt-4 text-sm">
            <Link to="/login" className="text-primary hover:underline">
              ← Retour à la connexion
            </Link>
          </p>
        )}
      </motion.div>
    </AuthShell>
  );
}
