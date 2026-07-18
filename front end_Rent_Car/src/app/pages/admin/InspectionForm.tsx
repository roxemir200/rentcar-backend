import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, PlayCircle, FlagOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/common/AdminTable";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { Input, Select, Textarea } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { FUEL_LEVELS } from "../../data/mockData";
import { euro, formatDate } from "../../lib/format";
import type { FuelLevel } from "../../data/types";

export default function InspectionForm({ mode }: { mode: "start" | "complete" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reservations, getCar, getUser, updateReservationStatus } = useApp();
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<FuelLevel | "">("");
  const [damages, setDamages] = useState("");
  const [error, setError] = useState<Record<string, string>>({});

  const res = reservations.find((r) => r.id === id);
  if (!res) return <EmptyState icon={<PlayCircle className="size-8" />} title="Réservation introuvable" action={<Link to="/admin/reservations"><Button>Retour</Button></Link>} />;
  const car = getCar(res.carId)!;
  const client = getUser(res.userId)!;
  const isStart = mode === "start";

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!mileage || Number(mileage) < 0) errs.mileage = "Kilométrage valide requis";
    if (!fuel) errs.fuel = "Niveau de carburant requis";
    setError(errs);
    if (Object.keys(errs).length) return;
    const inspection = { mileage: Number(mileage), fuel: fuel as FuelLevel, damages };
    if (isStart) {
      updateReservationStatus(res.id, "IN_PROGRESS", { start: inspection });
      toast.success("Location démarrée. Le véhicule est maintenant loué.");
    } else {
      updateReservationStatus(res.id, "COMPLETED", { end: inspection });
      toast.success("Location terminée. Le véhicule est de nouveau disponible.");
    }
    navigate("/admin/reservations");
  };

  return (
    <PageTransition>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4" /> Retour</button>
      <PageHeader title={isStart ? "Démarrer la location" : "Terminer la location"}
        subtitle={`État des lieux ${isStart ? "de départ" : "de retour"}`} />

      <div className="grid md:grid-cols-3 gap-5">
        <Card className="p-5 md:col-span-1 h-fit">
          <p className="font-semibold text-foreground">{car.brand} {car.model}</p>
          <p className="text-sm text-muted-foreground">{car.plate}</p>
          <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="text-foreground">{client.firstName} {client.lastName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="text-foreground">{formatDate(res.startDate)} → {formatDate(res.endDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold text-primary">{euro(res.total)}</span></div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <div className="space-y-4">
            <Input label={`Kilométrage ${isStart ? "de départ" : "de retour"}`} type="number" required min={0}
              value={mileage} onChange={(e) => setMileage(e.target.value)} error={error.mileage} placeholder="Ex : 21000" />
            <Select label={`Niveau carburant ${isStart ? "départ" : "retour"}`} required placeholder="Sélectionner..."
              value={fuel} onChange={(e) => setFuel((e.target as HTMLSelectElement).value as FuelLevel)} error={error.fuel}
              options={FUEL_LEVELS.map((f) => ({ value: f, label: f }))} />
            <Textarea label={`${isStart ? "Dégâts constatés au départ" : "Nouveaux dégâts constatés au retour"}`}
              value={damages} onChange={(e) => setDamages(e.target.value)} placeholder="Décrivez les éventuels dégâts (rayures, bosses...)" />
            <Button size="lg" onClick={submit}>
              {isStart ? <><PlayCircle className="size-5" /> Démarrer la location</> : <><FlagOff className="size-5" /> Terminer la location</>}
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
