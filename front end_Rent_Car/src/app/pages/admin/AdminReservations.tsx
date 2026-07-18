import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Check, PlayCircle, FlagOff, Eye, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { ReservationBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { ConfirmModal } from "../../components/common/Modal";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { reservationsAPI } from "../../api/reservations.api";
import { euro, formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { ReservationStatus } from "../../data/types";

const tabs: { key: ReservationStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Toutes" }, { key: "PENDING", label: "En attente" }, { key: "CONFIRMED", label: "Confirmées" },
  { key: "IN_PROGRESS", label: "En cours" }, { key: "COMPLETED", label: "Terminées" }, { key: "CANCELLED", label: "Annulées" },
];

export default function AdminReservations() {
  const { getCar } = useApp();
  const [tab, setTab] = useState<ReservationStatus | "ALL">("ALL");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | number | null>(null);

  const loadReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservationsAPI.getAll();
      const data = res.data?.value || res.data || [];
      setReservations(data);
    } catch (err) {
      setError("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const list = [...reservations]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .filter((r) => tab === "ALL" || r.status === tab);

  const handleConfirm = async (id: string | number) => {
    try {
      const res = await reservationsAPI.confirm(id);
      if (res.data.success) {
        toast.success("Réservation confirmée. Contrat généré automatiquement.");
        loadReservations();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Erreur lors de la confirmation");
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      const res = await reservationsAPI.cancel(cancelId);
      if (res.data.success) {
        toast.success("Réservation annulée.");
        loadReservations();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancelId(null);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <PageHeader title="Gestion des réservations" subtitle="Chargement..." />
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <PageHeader title="Gestion des réservations" />
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadReservations} variant="outline"><RefreshCw className="size-4 mr-2" /> Réessayer</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader title="Gestion des réservations" subtitle="Suivez et gérez toutes les réservations clients." />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors",
              tab === t.key ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground")}>{t.label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState icon={<Eye className="size-8" />} title="Aucune réservation" />
        </div>
      ) : (
        <Table head={["ID", "Client", "Voiture", "Dates", "Montant", "Statut", "Actions"]}>
          {list.map((r) => {
            const car = getCar(String(r.carId));
            const clientName = r.clientFirstName && r.clientLastName
              ? `${r.clientFirstName} ${r.clientLastName}`
              : `Client #${r.clientId}`;
            return (
              <tr key={r.id} className="hover:bg-muted/40">
                <Td className="font-mono text-xs">#{String(r.id)}</Td>
                <Td>{clientName}</Td>
                <Td>{car?.brand} {car?.model}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(r.startDate)} → {formatDate(r.endDate)}</Td>
                <Td className="font-semibold">{euro(r.totalAmount || r.total)}</Td>
                <Td><ReservationBadge status={r.status} /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {r.status === "PENDING" && (
                      <Button size="sm" onClick={() => handleConfirm(r.id)}><Check className="size-4" /> Confirmer</Button>
                    )}
                    {r.status === "CONFIRMED" && (
                      <Link to={`/admin/reservation/${r.id}/start`}><Button size="sm"><PlayCircle className="size-4" /> Démarrer</Button></Link>
                    )}
                    {r.status === "IN_PROGRESS" && (
                      <Link to={`/admin/reservation/${r.id}/complete`}><Button size="sm" variant="secondary"><FlagOff className="size-4" /> Terminer</Button></Link>
                    )}
                    {/* ✅ Bouton Annuler (Admin) */}
                    {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => setCancelId(r.id)}>
                        <XCircle className="size-4" /> Annuler
                      </Button>
                    )}
                    <Link to={`/admin/reservation/${r.id}`}><Button size="sm" variant="outline"><Eye className="size-4" /></Button></Link>
                  </div>
                </Td>
              </tr>
            );
            
          })}
        </Table>
      )}

      <ConfirmModal
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Annuler la réservation"
        message="Êtes-vous sûr de vouloir annuler cette réservation ?"
        confirmLabel="Oui, annuler"
        danger
      />
    </PageTransition>
  );
}