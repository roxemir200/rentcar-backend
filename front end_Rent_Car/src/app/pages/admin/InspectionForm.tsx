import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, PlayCircle, FlagOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/common/AdminTable";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { Input, Select, Textarea } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { reservationsAPI } from "../../api/reservations.api";
import { FUEL_LEVELS } from "../../data/constants";
import { euro, formatDate } from "../../lib/format";
import type { FuelLevel } from "../../data/types";

export default function InspectionForm({ mode }: { mode: "start" | "complete" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reservations, getCar, getUser, getPaymentByReservation, loadReservations } = useApp();
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<FuelLevel | "">("");
  const [damages, setDamages] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const res = reservations.find((r) => r.id === id);
  const payment = useMemo(() => res ? getPaymentByReservation(res.id) : undefined, [res, getPaymentByReservation]);

  // Validation logic
  const validateField = (field: string, value: any) => {
    if (field === "mileage") {
      const mileageNum = Number(value);
      if (!value || value.trim() === "") {
        return "Le kilométrage est obligatoire";
      } else if (isNaN(mileageNum)) {
        return "Le kilométrage doit être un nombre";
      } else if (mileageNum <= 0) {
        return "Le kilométrage doit être positif";
      }
    } else if (field === "fuel") {
      if (!value) {
        return "Le niveau de carburant est obligatoire";
      }
    }
    return "";
  };

  // Update errors when values change (if field is touched)
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (touched.mileage) {
      const err = validateField("mileage", mileage);
      if (err) newErrors.mileage = err;
    }
    if (touched.fuel) {
      const err = validateField("fuel", fuel);
      if (err) newErrors.fuel = err;
    }
    setError(newErrors);
  }, [mileage, fuel, touched]);

  if (!res) return <EmptyState icon={<PlayCircle className="size-8" />} title="Réservation introuvable" action={<Link to="/admin/reservations"><Button>Retour</Button></Link>} />;
  
  const car = getCar(res.carId);
  const client = getUser(res.userId);
  const isStart = mode === "start";

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const submit = async () => {
    // Mark all fields as touched on submit
    setTouched({ mileage: true, fuel: true });

    const errs: Record<string, string> = {};
    const mileageErr = validateField("mileage", mileage);
    if (mileageErr) errs.mileage = mileageErr;
    const fuelErr = validateField("fuel", fuel);
    if (fuelErr) errs.fuel = fuelErr;

    setError(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const mileageNum = Number(mileage);
      let apiRes;
      if (isStart) {
        apiRes = await reservationsAPI.start(id, {
          mileageStart: mileageNum,
          fuelLevelStart: fuel,
          damagesAtStart: damages
        });
      } else {
        apiRes = await reservationsAPI.complete(id, {
          mileageEnd: mileageNum,
          fuelLevelEnd: fuel,
          damagesAtEnd: damages
        });
      }

      if (apiRes.data.success) {
        toast.success(isStart 
          ? "Location démarrée. Le véhicule est maintenant loué."
          : "Location terminée. Le véhicule est de nouveau disponible.");
        await loadReservations();
        navigate("/admin/reservations");
      } else {
        toast.error(apiRes.data.message);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;
      let msg: string;
      if (serverMessage) {
        msg = serverMessage;
      } else if (status === 403) {
        msg = "Action non autorisée. Votre session a peut-être expiré ou vous n'avez pas les droits nécessaires.";
      } else if (status === 401) {
        msg = "Session expirée. Veuillez vous reconnecter.";
      } else if (status === 400) {
        msg = "Demande invalide. Vérifiez les informations saisies.";
      } else if (status && status >= 500) {
        msg = "Erreur serveur. Veuillez réessayer dans un instant.";
      } else {
        msg = "Une erreur est survenue lors de l'opération.";
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4" /> Retour</button>
      <PageHeader title={isStart ? "Démarrer la location" : "Terminer la location"}
        subtitle={`État des lieux ${isStart ? "de départ" : "de retour"}`} />

      <div className="grid md:grid-cols-3 gap-5">
        <Card className="p-5 md:col-span-1 h-fit">
          <p className="font-semibold text-foreground">{car ? `${car.brand} ${car.model}` : "Voiture inconnue"}</p>
          <p className="text-sm text-muted-foreground">{car?.plate ?? "—"}</p>
          <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="text-foreground">{client ? `${client.firstName} ${client.lastName}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="text-foreground">{formatDate(res.startDate)} → {formatDate(res.endDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold text-primary">{euro(res.total)}</span></div>
            {payment && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paiement</span>
                <span className={payment.status === "COMPLETED" ? "text-emerald-600" : "text-destructive"}>
                  {payment.status}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <div className="space-y-4">
            <Input 
              label={`Kilométrage ${isStart ? "de départ" : "de retour"}`} 
              type="number" 
              required 
              min={1}
              value={mileage} 
              onChange={(e) => setMileage(e.target.value)} 
              onBlur={() => handleBlur("mileage")}
              error={error.mileage} 
              placeholder="Ex : 21000" 
            />
            <Select 
              label={`Niveau carburant ${isStart ? "départ" : "retour"}`} 
              required 
              placeholder="Sélectionner..."
              value={fuel} 
              onChange={(e) => setFuel((e.target as HTMLSelectElement).value as FuelLevel)} 
              onBlur={() => handleBlur("fuel")}
              error={error.fuel}
              options={FUEL_LEVELS.map((f) => ({ value: f, label: f }))} 
            />
            <Textarea 
              label={`${isStart ? "Dégâts constatés au départ" : "Nouveaux dégâts constatés au retour"}`}
              value={damages} 
              onChange={(e) => setDamages(e.target.value)} 
              placeholder="Décrivez les éventuels dégâts (rayures, bosses...)" 
            />
            <Button size="lg" onClick={submit} loading={loading}>
              {isStart ? <><PlayCircle className="size-5" /> Démarrer la location</> : <><FlagOff className="size-5" /> Terminer la location</>}
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
