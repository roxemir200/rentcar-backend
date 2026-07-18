import { useState, useEffect } from "react";
import { Link } from "react-router";
import { CalendarX, Eye, FileText, PenLine, CreditCard, XCircle, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { ReservationBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { ConfirmModal } from "../../components/common/Modal";
import { ReviewModal } from "../../components/common/ReviewModal";
import { useApp } from "../../context/AppContext";
import { reservationsAPI } from "../../api/reservations.api";
import { contractsAPI } from "../../api/contrat.api";
import { euro, formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { Reservation, ReservationStatus } from "../../data/types";

const tabs: { key: ReservationStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Toutes" }, { key: "PENDING", label: "En attente" },
  { key: "CONFIRMED", label: "Confirmées" }, { key: "IN_PROGRESS", label: "En cours" },
  { key: "COMPLETED", label: "Terminées" }, { key: "CANCELLED", label: "Annulées" },
];

export default function MyReservations() {
  const { currentUser, getCar } = useApp();
  const [tab, setTab] = useState<ReservationStatus | "ALL">("ALL");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reviewRes, setReviewRes] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [contracts, setContracts] = useState<Record<string, any>>({});  // ✅ AJOUTÉ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservationsAPI.getMyReservations();
      const data = res.data?.value || res.data || [];
      setReservations(data);
    } catch (err) {
      setError("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Charger le contrat pour une réservation
  const loadContract = async (reservationId: string | number) => {
    try {
      const res = await contractsAPI.getByReservation(reservationId);
      setContracts(prev => ({ ...prev, [String(reservationId)]: res.data?.value || res.data }));
    } catch {
      // Pas de contrat = normal pour PENDING
    }
  };

  useEffect(() => {
    if (currentUser) loadReservations();
  }, [currentUser]);

  // ✅ Charger les contrats pour les réservations qui en ont besoin
  useEffect(() => {
    reservations.forEach(r => {
      if (r.status !== "PENDING" && r.status !== "CANCELLED") {
        loadContract(r.id);
      }
    });
  }, [reservations]);

  const mine = reservations;
  const list = tab === "ALL" ? mine : mine.filter((r) => r.status === tab);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      toast.error(message);
    } finally {
      setCancelId(null);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Mes réservations</h1>
          <div className="animate-pulse space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadReservations} variant="outline">
            <RefreshCw className="size-4 mr-2" /> Réessayer
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Mes réservations</h1>
        <p className="text-muted-foreground mb-6">Gérez vos locations et suivez leur statut.</p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {tabs.map((t) => {
            const count = t.key === "ALL" ? mine.length : mine.filter((r) => r.status === t.key).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                  tab === t.key ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground")}>
                {t.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <Card><EmptyState icon={<CalendarX className="size-8" />} title="Aucune réservation"
            description="Vous n'avez pas encore de réservation dans cette catégorie."
            action={<Link to="/cars"><Button>Découvrir les voitures</Button></Link>} /></Card>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const car = getCar(String(r.carId));
              const contract = contracts[String(r.id)];  // ✅ Utiliser le state local
              return (
                <Card key={r.id} className="p-4 flex flex-col sm:flex-row gap-4" hover>
                  <div className="h-24 w-full sm:w-36 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {car && <ImageWithFallback src={car.images?.[0]} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{car?.brand} {car?.model}</p>
                        <p className="text-sm text-muted-foreground">#{String(r.id)} · {formatDate(r.startDate)} → {formatDate(r.endDate)}</p>
                      </div>
                      <ReservationBadge status={r.status} />
                    </div>
                    <p className="mt-2 font-bold text-primary">{euro(r.totalAmount || r.total)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to={`/reservation/${r.id}`}><Button size="sm" variant="outline"><Eye className="size-4" /> Détails</Button></Link>
                      {r.status === "CONFIRMED" && <>
                        <Link to={`/contract/${r.id}`}><Button size="sm" variant="ghost"><FileText className="size-4" /> Contrat</Button></Link>
                        {contract?.status === "DRAFT" && <Link to={`/contract/${r.id}`}><Button size="sm"><PenLine className="size-4" /> Signer</Button></Link>}
                        {contract?.status === "SIGNED" && <Link to={`/payment/${r.id}`}><Button size="sm"><CreditCard className="size-4" /> Payer</Button></Link>}
                      </>}
                      {r.status === "IN_PROGRESS" && <Link to={`/contract/${r.id}`}><Button size="sm" variant="ghost"><FileText className="size-4" /> Contrat</Button></Link>}
                      {r.status === "COMPLETED" && <Button size="sm" variant="ghost" onClick={() => setReviewRes(r)}><Star className="size-4" /> Donner mon avis</Button>}
                      {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => setCancelId(String(r.id))}><XCircle className="size-4" /> Annuler</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal isOpen={!!cancelId} onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Annuler la réservation" message="Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible." confirmLabel="Oui, annuler" danger />
      <ReviewModal isOpen={!!reviewRes} onClose={() => setReviewRes(null)} reservation={reviewRes} />
    </PageTransition>
  );
}