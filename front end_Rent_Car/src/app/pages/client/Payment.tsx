import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router";
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle2, XCircle, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, PageTransition, EmptyState } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { paymentsAPI } from "../../api/payments.api";
import { reservationsAPI } from "../../api/reservations.api";
import { contractsAPI } from "../../api/contrat.api";
import { euro, formatDate } from "../../lib/format";

type Phase = "idle" | "processing" | "done";

// ─── Composant Stripe stable (ne se remonte jamais) ──────────
function StripePaymentForm({
  amount,
  clientSecret,
  onSuccess,
  stripe,
}: {
  amount: number;
  clientSecret: string;
  onSuccess: () => void;
  stripe: any;
}) {
  const elements = useElements();
  const [cardReady, setCardReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const handlePay = async () => {
    if (!stripe || !elements || !cardReady) return;

    setPhase("processing");
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });

    if (stripeError) {
      toast.error(stripeError.message || "Paiement échoué");
      setPhase("idle");
    } else {
      toast.success("Paiement effectué avec succès !");
      setPhase("done");
      onSuccess();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Lock className="size-4 text-emerald-500" /> Paiement 100% sécurisé via Stripe
      </div>
      <div className="mb-4 p-3 border rounded-lg">
        <CardElement
          options={{ style: { base: { fontSize: '16px' } } }}
          onReady={() => setCardReady(true)}
        />
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={handlePay}
        disabled={!stripe || !cardReady || phase !== "idle"}
      >
        {phase !== "idle" ? (
          <Loader2 className="size-5 animate-spin mr-2" />
        ) : (
          <CreditCard className="size-5 mr-2" />
        )}
        Payer {euro(amount)}
      </Button>
    </Card>
  );
}

// ─── Page Paiement ────────────────────────────────────────────
export default function Payment() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stripe = useStripe();
  const { getCar } = useApp();

  const [reservation, setReservation] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const passedClientSecret = (location.state as any)?.clientSecret;
  const dataLoadedRef = useRef(false);

  const loadData = async () => {
    if (!reservationId) return;
    setLoading(true);
    setError(null);
    try {
      const [resRes, payRes, contractRes] = await Promise.all([
        reservationsAPI.getById(reservationId),
        paymentsAPI.getByReservation(reservationId).catch(() => ({ data: null })),
        contractsAPI.getByReservation(reservationId).catch(() => ({ data: null })),
      ]);
      setReservation(resRes.data?.value || resRes.data);
      setPayment(payRes.data?.value || payRes.data);
      setContract(contractRes.data?.value || contractRes.data);
    } catch (err) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true;
      loadData();
    }
  }, [reservationId]);

  // Loading
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Loader2 className="size-10 mx-auto text-primary animate-spin mb-3" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Error
  if (error || !reservation) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <EmptyState icon={<CreditCard className="size-8" />} title={error || "Paiement introuvable"}
          action={<Link to="/my-reservations"><Button>Retour</Button></Link>} />
      </div>
    );
  }

  const car = getCar(String(reservation.carId));
  const signed = contract?.status === "SIGNED";
  const isPaid = payment?.status === "COMPLETED";
  const isPending = payment?.status === "PENDING";
  const amount = payment?.amount || reservation.totalAmount || reservation.total || 0;
  const clientSecret = passedClientSecret || payment?.clientSecret;
  const canPay = isPending && signed && clientSecret;

  const handlePaymentSuccess = () => {
    setTimeout(() => loadData(), 2000);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <h1 className="text-foreground mb-6" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Paiement de votre réservation</h1>

        {/* Résumé */}
        <Card className="p-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              {car && <ImageWithFallback src={car.images?.[0]} alt="" className="size-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{car?.brand} {car?.model}</p>
              <p className="text-sm text-muted-foreground">{formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">Montant total à payer</span>
            <span className="text-3xl font-bold text-foreground">{euro(amount)}</span>
          </div>
        </Card>

        {/* Contrat non signé */}
        {!signed && !isPaid && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Le contrat doit être signé avant de pouvoir payer.</p>
              <Link to={`/contract/${reservationId}`} className="underline">Signer le contrat maintenant →</Link>
            </div>
          </div>
        )}

        {/* États */}
        {isPaid ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-6 text-center">
              <CheckCircle2 className="size-14 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-foreground">Paiement réussi ✅</h3>
              <p className="text-muted-foreground mt-1">Votre location est confirmée. Merci pour votre confiance !</p>
              <Link to={`/reservation/${reservationId}`}><Button className="mt-5">Voir ma réservation</Button></Link>
            </Card>
          </motion.div>
        ) : payment?.status === "FAILED" ? (
          <Card className="p-6 text-center">
            <XCircle className="size-14 mx-auto text-destructive mb-3" />
            <h3 className="text-foreground">Paiement échoué ❌</h3>
            <Button className="mt-5" onClick={() => loadData()}>Réessayer</Button>
          </Card>
        ) : payment?.status === "REFUNDED" ? (
          <Card className="p-6 text-center">
            <PaymentBadge status="REFUNDED" />
            <p className="mt-3 text-muted-foreground">Ce paiement a été remboursé.</p>
          </Card>
        ) : canPay ? (
          <StripePaymentForm
            amount={amount}
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            stripe={stripe}
          />
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Aucun paiement en attente.</p>
          </Card>
        )}

        {/* Historique */}
        {payment && (payment.status === "COMPLETED" || payment.status === "REFUNDED") && (
          <Card className="p-5 mt-5">
            <h3 className="text-foreground mb-3">Historique du paiement</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">ID Stripe</dt><dd className="font-mono">{payment.externalPaymentId}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Montant</dt><dd>{euro(payment.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Statut</dt><dd><PaymentBadge status={payment.status} /></dd></div>
              {payment.paymentDate && <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(payment.paymentDate)}</dd></div>}
            </dl>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}