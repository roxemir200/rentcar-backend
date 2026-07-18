import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [remember, setRemember] = useState(true);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginForm>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    const user = await login(data.email, data.password);
    if (!user) {
      return;
    }
    toast.success(`Bienvenue, ${user.firstName} !`);
    navigate(user.role === "ADMIN" ? "/admin/dashboard" : "/cars");
  };

  return (
    <AuthShell title="Connexion" subtitle="Ravi de vous revoir ! Connectez-vous à votre compte.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          required
          placeholder="vous@exemple.com"
          leftIcon={<Mail className="size-4.5" />}
          error={errors.email?.message}
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
          leftIcon={<Lock className="size-4.5" />}
          error={errors.password?.message}
          {...registerField("password", {
            required: "Le mot de passe est obligatoire",
          })}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary/30" />
            Se souvenir de moi
          </label>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Mot de passe oublié ?</Link>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!isValid || isSubmitting} className="w-full">
          {isSubmitting ? "Connexion en cours..." : "Se connecter"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Pas de compte ? <Link to="/register" className="text-primary font-medium hover:underline">S'inscrire →</Link>
        </p>
   
      </form>
    </AuthShell>
  );
}
