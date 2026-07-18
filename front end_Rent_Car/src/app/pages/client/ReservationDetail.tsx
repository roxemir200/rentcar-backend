import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, Car, User, MapPin, FileText, PenLine, CreditCard, XCircle, Star, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { ReservationBadge, PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, PageTransition, EmptyState } from "../../components/common/Misc";
import { ConfirmModal } from "../../components/common/Modal";
import { ReviewModal } from "../../components/common/ReviewModal";
import { useApp } from "../../context/AppContext";
import { reservationsAPI } from "../../api/reservations.api";
import { euro, formatDate, daysBetween } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { ReservationStatus } from "../../data/types";

const steps: ReservationStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];
const stepLabels: Record<string, string> = { PENDING: "En attente", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée" };

export default function ReservationDetail({ admin }: { admin?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser,getCar, getUser, getContractByReservation, getPaymentByReservation } = useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la réservation depuis l'API
  const loadReservation = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reservationsAPI.getById(id);
      setReservation(res.data?.value || res.data);
    } catch (err) {
      setError("Réservation introuvable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservation();
  }, [id]);

  // Annuler via API
  const handleCancel = async () => {
    if (!id) return;
    try {
      const res = await reservationsAPI.cancel(id);
      if (res.data.success) {
        toast.success("Réservation annulée.");
        loadReservation(); // Recharger
      } else {
        toast.error(res.data.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      toast.error(message);
    } finally {
      setCancelOpen(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !reservation) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <EmptyState icon={<Car className="size-8" />} title={error || "Réservation introuvable"}
          action={<Link to={admin ? "/admin/reservations" : "/my-reservations"}><Button>Retour</Button></Link>} />
      </div>
    );
  }

  const car = getCar(String(reservation.carId));
  const client = getUser(String(reservation.clientId || reservation.userId));
  const contract = getContractByReservation(String(reservation.id));
  const payment = getPaymentByReservation(String(reservation.id));
  const currentStep = reservation.status === "CANCELLED" ? -1 : steps.indexOf(reservation.status);
  const days = daysBetween(reservation.startDate, reservation.endDate);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4" /> Retour</button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Réservation #{String(reservation.id)}</h1>
            <p className="text-muted-foreground text-sm">Créée le {formatDate(reservation.createdAt)}</p>
          </div>
          <ReservationBadge status={reservation.status} />
        </div>

        {/* Timeline */}
        {reservation.status !== "CANCELLED" ? (
          <Card className="p-6 mb-6">
            <div className="flex items-center">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={cn("size-9 rounded-full flex items-center justify-center border-2", i <= currentStep ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-400")}>
                      {i < currentStep ? <Check className="size-4.5" /> : <span className="text-sm font-semibold">{i + 1}</span>}
                    </div>
                    <span className={cn("mt-2 text-xs text-center", i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground")}>{stepLabels[s]}</span>
                  </div>
                  {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-2 -mt-6", i < currentStep ? "bg-primary" : "bg-slate-200")} />}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-4 mb-6 bg-red-50 border-red-200 text-destructive flex items-center gap-2"><XCircle className="size-5" /> Cette réservation a été annulée.</Card>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><Car className="size-4" /> Véhicule</p>
            <div className="h-28 rounded-xl overflow-hidden bg-slate-100 mb-3">{car && <ImageWithFallback src={car.images?.[0]} alt="" className="size-full object-cover" />}</div>
            <p className="font-semibold text-foreground">{car?.brand} {car?.model}</p>
            <p className="text-sm text-muted-foreground">{car?.plate}</p>
          </Card>
<Card className="p-5">
  <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><User className="size-4" /> Client</p>
  {/* ✅ Utiliser currentUser au lieu de chercher dans users */}
  <p className="font-semibold text-foreground">{reservation?.clientFirstName} {reservation?.clientLastName}</p>
  <p className="text-sm text-muted-foreground break-all">{reservation?.clientEmail}</p>
</Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><MapPin className="size-4" /> Location</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Dates</dt><dd className="text-foreground text-right">{formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Durée</dt><dd className="text-foreground">{days} jours</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Prise en charge</dt><dd className="text-foreground text-right">{reservation.pickupLocation}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Restitution</dt><dd className="text-foreground text-right">{reservation.returnLocation}</dd></div>
              <div className="flex justify-between pt-1 border-t border-border mt-1"><dt className="text-muted-foreground">Total</dt><dd className="font-bold text-primary">{euro(reservation.totalAmount || reservation.total)}</dd></div>
            </dl>
            {reservation.notes && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium">Notes :</span> {reservation.notes}</p>}
          </Card>
        </div>

        {/* État des lieux */}
        {(reservation.status === "IN_PROGRESS" || reservation.status === "COMPLETED") && (
          <Card className="p-6 mb-6">
            <h3 className="text-foreground mb-4">État des lieux</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Inspection title="Départ" data={reservation.startInspection ? { mileage: reservation.mileageStart, fuel: reservation.fuelLevelStart, damages: reservation.damagesAtStart } : null} />
              <Inspection title="Retour" data={reservation.endInspection ? { mileage: reservation.mileageEnd, fuel: reservation.fuelLevelEnd, damages: reservation.damagesAtEnd } : null} />
            </div>
          </Card>
        )}

        {/* Paiement */}
        {payment && reservation.status !== "PENDING" && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-foreground mb-1 flex items-center gap-2"><CreditCard className="size-5" /> Paiement</h3>
                <p className="text-sm text-muted-foreground">Montant : <span className="font-medium text-foreground">{euro(payment.amount)}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <PaymentBadge status={payment.status} />
                {!admin && contract?.status === "SIGNED" && payment.status === "PENDING" && (
                  <Link to={`/payment/${reservation.id}`}><Button size="sm"><CreditCard className="size-4" /> Payer {euro(payment.amount)}</Button></Link>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {admin ? (
            contract && <Link to={`/admin/contract/${reservation.id}`}><Button variant="outline"><FileText className="size-4" /> Voir le contrat</Button></Link>
          ) : <>
          {reservation.status === "CONFIRMED" && <>
            <Link to={`/contract/${reservation.id}`}><Button variant="outline"><FileText className="size-4" /> Voir le contrat</Button></Link>
            {contract?.status === "DRAFT" && <Link to={`/contract/${reservation.id}`}><Button><PenLine className="size-4" /> Signer le contrat</Button></Link>}
            {contract?.status === "SIGNED" && payment?.status === "PENDING" && <Link to={`/payment/${reservation.id}`}><Button><CreditCard className="size-4" /> Payer</Button></Link>}
          </>}
          {reservation.status === "IN_PROGRESS" && <Link to={`/contract/${reservation.id}`}><Button variant="outline"><FileText className="size-4" /> Voir le contrat</Button></Link>}
          {reservation.status === "COMPLETED" && <>
            <Link to={`/contract/${reservation.id}`}><Button variant="outline"><FileText className="size-4" /> Voir le contrat</Button></Link>
            <Button onClick={() => setReviewOpen(true)}><Star className="size-4" /> Donner mon avis</Button>
          </>}
          {(reservation.status === "PENDING" || reservation.status === "CONFIRMED") && (
            <Button variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => setCancelOpen(true)}><XCircle className="size-4" /> Annuler la réservation</Button>
          )}
          </>}
        </div>
      </div>

      <ConfirmModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Annuler la réservation" message="Êtes-vous sûr de vouloir annuler cette réservation ?" confirmLabel="Oui, annuler" danger />
      <ReviewModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} reservation={reservation} />
    </PageTransition>
  );
}

function Inspection({ title, data }: { title: string; data?: { mileage?: number; fuel?: string; damages?: string } | null }) {
  return (
    <div className="p-4 rounded-xl bg-muted">
      <p className="font-medium text-foreground mb-2">{title}</p>
      {data ? (
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Kilométrage</dt><dd className="text-foreground">{data.mileage?.toLocaleString("fr-FR")} km</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Carburant</dt><dd className="text-foreground">{data.fuel}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Dégâts</dt><dd className="text-foreground text-right max-w-[60%]">{data.damages || "Aucun"}</dd></div>
        </dl>
      ) : <p className="text-sm text-muted-foreground">Non renseigné.</p>}
    </div>
  );
}