import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  licenseNumber: string;
};

export default function Register() {
  const { register: registerUser } = useApp();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterForm>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      licenseNumber: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    const res = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      address: data.address,
      licenseNumber: data.licenseNumber,
    });
    if (!res.ok) {
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <AuthShell title="Inscription réussie !" subtitle="Votre compte a bien été créé.">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <div className="size-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5">
            <CheckCircle2 className="size-9" />
          </div>
          <h3 className="text-foreground">🎉 Bienvenue chez RentCar !</h3>
          <p className="mt-2 text-muted-foreground">Vous pouvez dès maintenant vous connecter et réserver votre première voiture.</p>
          <Button size="lg" className="w-full mt-6" onClick={() => navigate("/login")}>Se connecter</Button>
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
        <Input label="Téléphone" placeholder="+216 98 765 432" {...registerField("phone")} />
        <Input label="Adresse" placeholder="12 Avenue Habib Bourguiba, Tunis" {...registerField("address")} />
        <Input label="Numéro de permis de conduire" placeholder="12AB34567" {...registerField("licenseNumber")} />
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!isValid || isSubmitting} className="w-full">
          {isSubmitting ? "Création en cours..." : "Créer mon compte"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ? <Link to="/login" className="text-primary font-medium hover:underline">Se connecter →</Link>
        </p>
      </form>
    </AuthShell>
  );
}
