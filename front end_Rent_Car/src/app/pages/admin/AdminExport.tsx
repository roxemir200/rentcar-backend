import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, CalendarRange, Table2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Card, PageTransition } from "../../components/common/Misc";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { euro, formatDate } from "../../lib/format";
import { downloadCSV, downloadXLSX } from "../../lib/exporters";
import { cn } from "../../components/ui/utils";

type DataType = "reservations" | "payments" | "clients" | "cars";
type Format = "csv" | "xlsx";
type Period = "today" | "week" | "month" | "all";

const dataTypes: { id: DataType; label: string }[] = [
  { id: "reservations", label: "Réservations" },
  { id: "payments", label: "Paiements" },
  { id: "clients", label: "Clients" },
  { id: "cars", label: "Voitures" },
];

const periods: { id: Period; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tout" },
];

// Retourne true si la date iso est dans la période choisie
function inPeriod(iso: string | undefined, period: Period) {
  if (period === "all") return true;
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  if (period === "today") return d.toDateString() === now.toDateString();
  if (period === "week") {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

export default function AdminExport() {
  const { reservations, payments, users, cars, getCar, getUser } = useApp();
  const [type, setType] = useState<DataType>("reservations");
  const [format, setFormat] = useState<Format>("csv");
  const [period, setPeriod] = useState<Period>("month");
  const [busy, setBusy] = useState(false);

  // Construit les lignes selon le type + période
  const rows = useMemo<Record<string, string | number>[]>(() => {
    if (type === "reservations") {
      return reservations.filter((r) => inPeriod(r.createdAt, period)).map((r) => {
        const car = getCar(r.carId); const client = getUser(r.userId);
        return {
          ID: r.id.toUpperCase(),
          Client: `${client?.firstName ?? ""} ${client?.lastName ?? ""}`,
          Voiture: `${car?.brand ?? ""} ${car?.model ?? ""}`,
          Début: formatDate(r.startDate),
          Fin: formatDate(r.endDate),
          Total: euro(r.total),
          Statut: r.status,
          "Créée le": formatDate(r.createdAt),
        };
      });
    }
    if (type === "payments") {
      return payments.filter((p) => inPeriod(p.date, period)).map((p) => {
        const res = reservations.find((r) => r.id === p.reservationId);
        const client = res && getUser(res.userId);
        return {
          "ID Stripe": p.stripeId,
          Client: client ? `${client.firstName} ${client.lastName}` : "—",
          Montant: euro(p.amount),
          Statut: p.status,
          Date: p.date ? formatDate(p.date) : "—",
        };
      });
    }
    if (type === "clients") {
      return users.filter((u) => u.role === "CLIENT" && inPeriod(u.createdAt, period)).map((u) => ({
        ID: u.id,
        Prénom: u.firstName,
        Nom: u.lastName,
        Email: u.email,
        Téléphone: u.phone ?? "—",
        Adresse: u.address ?? "—",
        Permis: u.licenseNumber ?? "—",
        Actif: u.active ? "Oui" : "Non",
        "Inscrit le": formatDate(u.createdAt),
      }));
    }
    // cars — pas de filtre de période
    return cars.map((c) => ({
      Marque: c.brand,
      Modèle: c.model,
      Année: c.year,
      Catégorie: c.category,
      Immatriculation: c.plate,
      "Prix/jour": euro(c.pricePerDay),
      Statut: c.status,
    }));
  }, [type, period, reservations, payments, users, cars, getCar, getUser]);

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const preview = rows.slice(0, 5);

  const doExport = () => {
    if (rows.length === 0) { toast.error("Aucune donnée à exporter pour cette période."); return; }
    setBusy(true);
    setTimeout(() => {
      const filename = `rentcar-${type}-${period}-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv") downloadCSV(filename, rows);
      else downloadXLSX(filename, rows, dataTypes.find((d) => d.id === type)?.label);
      setBusy(false);
      toast.success(`${rows.length} ligne(s) exportée(s) en ${format.toUpperCase()}.`);
    }, 900);
  };

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Export des données</h1>
        <p className="text-muted-foreground">Exportez vos données au format CSV ou Excel.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Paramètres */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="p-5">
            <p className="font-semibold text-foreground mb-3 flex items-center gap-2"><Table2 className="size-4" /> Type de données</p>
            <div className="grid grid-cols-2 gap-2">
              {dataTypes.map((d) => (
                <button key={d.id} onClick={() => setType(d.id)}
                  className={cn("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all",
                    type === d.id ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {d.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-foreground mb-3">Format</p>
            <div className="grid grid-cols-2 gap-2">
              {([{ id: "csv" as Format, label: "CSV", icon: FileText }, { id: "xlsx" as Format, label: "Excel", icon: FileSpreadsheet }]).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setFormat(id)}
                  className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all",
                    format === id ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-foreground mb-3 flex items-center gap-2"><CalendarRange className="size-4" /> Période</p>
            <div className="grid grid-cols-2 gap-2">
              {periods.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)} disabled={type === "cars"}
                  className={cn("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                    period === p.id ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {p.label}
                </button>
              ))}
            </div>
            {type === "cars" && <p className="mt-2 text-xs text-muted-foreground">L'export des voitures inclut tout le parc.</p>}
          </Card>

          <Button size="lg" className="w-full" onClick={doExport} loading={busy}>
            {!busy && <Download className="size-5" />} Exporter ({rows.length})
          </Button>
        </div>

        {/* Aperçu */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-foreground">Aperçu des données</p>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-500" /> {rows.length} enregistrement(s)
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Aucune donnée pour cette sélection.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    {headers.map((h) => <th key={h} className="text-start px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-t border-border">
                      {headers.map((h) => <td key={h} className="px-3 py-2.5 text-foreground whitespace-nowrap">{String(row[h])}</td>)}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > preview.length && (
            <p className="mt-3 text-sm text-muted-foreground text-center">… et {rows.length - preview.length} ligne(s) de plus dans le fichier exporté.</p>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
