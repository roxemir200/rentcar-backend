import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { MailCheck } from "lucide-react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { authAPI } from "../../api/auth.api";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Register() {
  const { register: registerUser } = useApp();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
    getValues,
  } = useForm<RegisterForm>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedEmail = watch("email");
  const watchedPassword = watch("password");

  // Debounce function to wait before checking email
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const checkEmailAvailability = useCallback(
    debounce(async (email: string) => {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailExists(false);
        return;
      }
      setCheckingEmail(true);
      try {
        const response = await authAPI.checkEmail(email);
        setEmailExists(response.exists);
      } catch (err) {
        console.error("Error checking email:", err);
        setEmailExists(false);
      } finally {
        setCheckingEmail(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    checkEmailAvailability(watchedEmail);
  }, [watchedEmail, checkEmailAvailability]);

  const onSubmit = async (data: RegisterForm) => {
    if (emailExists) {
      return;
    }
    const res = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    });
    if (!res.ok) {
      return;
    }
    setRegisteredEmail(data.email);
    setSuccess(true);
  };

  const handleResend = async () => {
    try {
      const response = await authAPI.resendVerification(registeredEmail);
      if (response.success) {
        toast.success("Un nouvel email de vérification a été envoyé !");
      } else {
        toast.error(response.message || "Erreur lors de l'envoi de l'email");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors de l'envoi de l'email");
    }
  };

  if (success) {
    return (
      <AuthShell title="Vérifiez votre email !" subtitle="Un email de vérification vous a été envoyé.">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <div className="size-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5">
            <MailCheck className="size-9" />
          </div>
          <h3 className="text-foreground">📧 Vérifiez votre boîte mail</h3>
          <p className="mt-2 text-muted-foreground">
            Un email de vérification a été envoyé à <span className="font-medium text-foreground">{registeredEmail}</span>.
            <br />
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Button size="lg" className="w-full mt-6" onClick={() => navigate("/login")}>
            Retour à la connexion
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Vous n'avez pas reçu l'email ?{" "}
            <button
              onClick={handleResend}
              className="text-primary hover:underline font-medium"
            >
              Renvoyer
            </button>
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Rejoignez RentCar et réservez en quelques secondes.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            required
            placeholder="Camille"
            error={errors.firstName?.message}
            {...registerField("firstName", { required: "Le prénom est obligatoire" })}
          />
          <Input
            label="Nom"
            required
            placeholder="Laurent"
            error={errors.lastName?.message}
            {...registerField("lastName", { required: "Le nom est obligatoire" })}
          />
        </div>
        <Input
          label="Email"
          type="email"
          required
          placeholder="vous@exemple.com"
          error={emailExists ? "Cet email est déjà utilisé" : errors.email?.message}
          {...registerField("email", {
            required: "L'email est obligatoire",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Format d'email invalide",
            },
          })}
        />
        <Input
          label="Mot de passe"
          type="password"
          required
          placeholder="••••••••"
          hint="Minimum 6 caractères"
          error={errors.password?.message}
          {...registerField("password", {
            required: "Le mot de passe est obligatoire",
            minLength: {
              value: 6,
              message: "Le mot de passe doit avoir au moins 6 caractères",
            },
          })}
        />
        <Input
          label="Confirmer le mot de passe"
          type="password"
          required
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...registerField("confirmPassword", {
            required: "Veuillez confirmer votre mot de passe",
            validate: (value) => {
              const password = getValues("password");
              return value === password || "Les mots de passe ne correspondent pas";
            },
          })}
        />
        <Button type="submit" size="lg" loading={isSubmitting || checkingEmail} disabled={!isValid || isSubmitting || emailExists || checkingEmail} className="w-full">
          {isSubmitting ? "Création en cours..." : "Créer mon compte"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ? <Link to="/login" className="text-primary font-medium hover:underline">Se connecter →</Link>
        </p>
      </form>
    </AuthShell>
  );
}
