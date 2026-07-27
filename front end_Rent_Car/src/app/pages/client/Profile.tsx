import { useEffect, useState, useCallback } from "react";
import { User as UserIcon, Mail, Phone, MapPin, IdCard, Lock, Save, RotateCcw, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Card, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/format";
import { authAPI } from "../../api/auth.api";

// Champs modifiables du profil
interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  licenseNumber: string;
}

// Formatte le numéro tunisien : +216 XX XXX XXX
const formatTnPhone = (value: string) => {
  // Enlever tous les caractères non numériques
  let digits = value.replace(/[^\d]/g, "");
  
  // Si le premier chiffre n'est pas 2, ajouter 216 au début
  if (!digits.startsWith("216")) {
    digits = "216" + digits;
  }
  
  // Garder seulement les 11 premiers chiffres (216 + 8)
  digits = digits.slice(0, 11);
  
  let formatted = "+216";
  if (digits.length > 3) {
    formatted += " " + digits.slice(3, 5);
  }
  if (digits.length > 5) {
    formatted += " " + digits.slice(5, 8);
  }
  if (digits.length > 8) {
    formatted += " " + digits.slice(8, 11);
  }
  return formatted;
};

// Validation numéro tunisien : +216 suivi de 8 chiffres
const isValidTnPhone = (v: string) => {
  const digits = v.replace(/[^\d]/g, "");
  return digits.length === 11 && digits.startsWith("216");
};

export default function Profile() {
  const { currentUser, updateProfile } = useApp();
  const [saving, setSaving] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const {
    register: registerField,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isDirty, isSubmitting },
  } = useForm<ProfileForm>({
    mode: "onChange",
    defaultValues: {
      firstName: currentUser?.firstName ?? "",
      lastName: currentUser?.lastName ?? "",
      phone: currentUser?.phone ? currentUser.phone : "+216 ",
      address: currentUser?.address ?? "",
      licenseNumber: currentUser?.licenseNumber ?? "",
    },
  });

  const watchedPhone = watch("phone");

  // Format phone as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTnPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true, shouldDirty: true });
  };

  // Debounce function to wait before checking phone
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const checkPhoneAvailability = useCallback(
    debounce(async (phone: string) => {
      if (!phone || phone === currentUser?.phone || !isValidTnPhone(phone) || phone === "+216 ") {
        setPhoneExists(false);
        return;
      }
      setCheckingPhone(true);
      try {
        const response = await authAPI.checkPhone(phone);
        setPhoneExists(response.exists);
      } catch (err) {
        console.error("Error checking phone:", err);
        setPhoneExists(false);
      } finally {
        setCheckingPhone(false);
      }
    }, 500),
    [currentUser?.phone]
  );

  useEffect(() => {
    checkPhoneAvailability(watchedPhone);
  }, [watchedPhone, checkPhoneAvailability]);

  if (!currentUser) return null;

  useEffect(() => {
    reset({
      firstName: currentUser.firstName ?? "",
      lastName: currentUser.lastName ?? "",
      phone: currentUser.phone ? currentUser.phone : "+216 ",
      address: currentUser.address ?? "",
      licenseNumber: currentUser.licenseNumber ?? "",
    });
  }, [currentUser, reset]);

  const onSubmit = async (form: ProfileForm) => {
    if (phoneExists) {
      return;
    }
    setSaving(true);
    const res = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() && form.phone.trim() !== "+216" ? form.phone.trim() : undefined,
      address: form.address.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "La mise à jour du profil a échoué.");
      return;
    }
    toast.success("Profil mis à jour avec succès.");
  };

  const initials = `${currentUser.firstName[0] ?? ""}${currentUser.lastName[0] ?? ""}`.toUpperCase();

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Mon profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et vos coordonnées.</p>
        </div>

        {/* En-tête identité */}
        <Card className="p-6 mb-5 flex items-center gap-4">
          <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate" style={{ fontSize: "1.125rem" }}>
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <Mail className="size-4 shrink-0" /> {currentUser.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" /> Membre depuis le {formatDate(currentUser.createdAt)}
            </p>
          </div>
        </Card>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card className="p-6">
            <h3 className="text-foreground mb-4">Informations personnelles</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                name="firstName"
                required
                leftIcon={<UserIcon className="size-4" />}
                error={errors.firstName?.message}
                placeholder="Votre prénom"
                {...registerField("firstName", { required: "Le prénom est obligatoire" })}
              />
              <Input
                label="Nom"
                name="lastName"
                required
                leftIcon={<UserIcon className="size-4" />}
                error={errors.lastName?.message}
                placeholder="Votre nom"
                {...registerField("lastName", { required: "Le nom est obligatoire" })}
              />
            </div>

            {/* Email — non modifiable */}
            <div className="mt-4">
              <Input
                label="Adresse e-mail"
                name="email"
                leftIcon={<Mail className="size-4" />}
                value={currentUser.email}
                readOnly
                disabled
                className="cursor-not-allowed bg-muted text-muted-foreground pr-10"
                hint="L'adresse e-mail ne peut pas être modifiée."
              />
              <span className="sr-only">Champ verrouillé</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Téléphone"
                name="phone"
                type="tel"
                leftIcon={<Phone className="size-4" />}
                placeholder="+216 98 765 432"
                error={phoneExists ? "Ce numéro de téléphone est déjà utilisé" : errors.phone?.message}
                {...registerField("phone", {
                  validate: (value) => {
                    if (!value || value === "+216 ") return true; // Optional
                    if (!isValidTnPhone(value)) {
                      return "Numéro invalide";
                    }
                    return true;
                  },
                })}
                onChange={handlePhoneChange}
              />
              <Input
                label="Numéro de permis"
                name="licenseNumber"
                leftIcon={<IdCard className="size-4" />}
                placeholder="Ex : 12345678"
                {...registerField("licenseNumber")}
              />
            </div>

            <div className="mt-4">
              <Input
                label="Adresse"
                name="address"
                leftIcon={<MapPin className="size-4" />}
                placeholder="12 Avenue Habib Bourguiba, Tunis"
                {...registerField("address")}
              />
            </div>

            {/* Note sécurité e-mail */}
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
              <Lock className="size-4 shrink-0 mt-0.5" />
              <span>Pour des raisons de sécurité, votre e-mail est utilisé comme identifiant et reste inchangé.</span>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {isDirty ? (
                  <>Modifications non enregistrées</>
                ) : (
                  <><CheckCircle2 className="size-4 text-emerald-500" /> Profil à jour</>
                )}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!isDirty || saving || isSubmitting}
                  onClick={() => {
                    reset({
                      firstName: currentUser.firstName ?? "",
                      lastName: currentUser.lastName ?? "",
                      phone: currentUser.phone ? currentUser.phone : "+216 ",
                      address: currentUser.address ?? "",
                      licenseNumber: currentUser.licenseNumber ?? "",
                    });
                  }}
                >
                  <RotateCcw className="size-4" /> Réinitialiser
                </Button>
                <Button type="submit" loading={saving || isSubmitting || checkingPhone} disabled={!isValid || saving || isSubmitting || phoneExists || checkingPhone}>
                  <Save className="size-4" /> Enregistrer les modifications
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </PageTransition>
  );
}
