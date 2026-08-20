import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router";
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle2, XCircle, Lock, Loader2 } from "lucide-react";
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
  onSuccess: (status: "success" | "error", message?: string) => void;
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
      onSuccess("error", stripeError.message || "Paiement échoué");
      setPhase("idle");
    } else {
      setPhase("done");
      onSuccess("success");
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
  const { getCar, getPaymentByReservation, payments, addOrUpdatePayment } = useApp();

  const [reservation, setReservation] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createdClientSecret, setCreatedClientSecret] = useState<string | null>(null);

  const passedClientSecret = (location.state as any)?.clientSecret;
  const dataLoadedRef = useRef(false);
  const intentRequestedRef = useRef(false);

  // Get payment from AppContext's payments array
  const payment = getPaymentByReservation(reservationId || "") || null;

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
      setContract(contractRes.data?.value || contractRes.data);
      
      // If we got a payment from the API, add it to AppContext
      const apiPayment = payRes.data?.value || payRes.data;
      if (apiPayment) {
        addOrUpdatePayment({
          id: String(apiPayment.id),
          stripeId: apiPayment.externalPaymentId,
          externalPaymentId: apiPayment.externalPaymentId,
          reservationId: String(apiPayment.reservationId),
          amount: apiPayment.amount,
          currency: apiPayment.currency,
          provider: apiPayment.provider,
          status: apiPayment.status,
          date: apiPayment.paymentDate,
          paymentDate: apiPayment.paymentDate,
          createdAt: apiPayment.createdAt,
        });
      }
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

  // We don't need polling anymore because we use SSE!
  // Just show a toast and wait for the SSE event to update the payment
  useEffect(() => {
    if (payment?.status && payment.status !== "PENDING") {
      setAwaitingConfirmation(false);
    }
  }, [payment?.status]);

  const car = reservation ? getCar(String(reservation.carId)) : undefined;
  const signed = contract?.status === "SIGNED";
  const isPaid = payment?.status === "COMPLETED";
  const amount = payment?.amount || reservation?.totalAmount || reservation?.total || 0;
  const clientSecret: string | undefined = passedClientSecret || createdClientSecret || undefined;
  const canPay = signed && !!clientSecret;

  /**
   * Redemande un clientSecret au backend quand il manque.
   *
   * Le secret n'etait transmis qu'une fois, dans l'etat de navigation renvoye
   * par la signature du contrat, et n'est stocke nulle part : ni en base, ni
   * dans `PaymentResponse`. Rafraichir la page, y revenir plus tard ou avoir
   * signe lors d'une session precedente le perdait definitivement. Le client
   * restait alors bloque sur « Aucun paiement en attente », sans aucun moyen
   * de payer -- re-signer le contrat etant refuse par le backend.
   *
   * L'endpoint existait deja ; il n'etait simplement appele nulle part.
   */
  const preparePayment = async () => {
    if (!reservationId) return;
    setPreparingPayment(true);
    setPaymentError(null);
    try {
      const res = await paymentsAPI.create({ reservationId });
      const data = res.data?.value || res.data;
      if (data?.clientSecret) {
        setCreatedClientSecret(data.clientSecret);
        // La reponse porte deja tout ce qu'il faut : inutile de recharger la
        // page entiere pour retrouver la ligne qui vient d'etre creee.
        addOrUpdatePayment({
          id: String(data.paymentId),
          stripeId: data.paymentIntentId,
          externalPaymentId: data.paymentIntentId,
          reservationId: String(reservationId),
          amount: reservation?.totalAmount ?? amount,
          currency: "EUR",
          provider: "STRIPE",
          status: "PENDING",
        });
      } else {
        setPaymentError("Le serveur n'a pas renvoyé de référence de paiement.");
      }
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.message ||
          "Impossible de préparer le paiement. Réessayez dans un instant.",
      );
    } finally {
      setPreparingPayment(false);
    }
  };

  const retryPreparePayment = () => {
    intentRequestedRef.current = true;
    preparePayment();
  };

  useEffect(() => {
    if (loading || !signed || isPaid || clientSecret) return;
    if (payment?.status === "REFUNDED" || payment?.status === "FAILED") return;
    if (intentRequestedRef.current) return;
    intentRequestedRef.current = true;
    preparePayment();
  }, [loading, signed, isPaid, clientSecret, payment?.status]);

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

  const handlePaymentResult = (status: "success" | "error") => {
    if (status === "success") {
      setAwaitingConfirmation(true);
      return;
    }

    setAwaitingConfirmation(false);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Paiement de votre réservation</h1>
          <Button size="sm" onClick={loadData} className="flex items-center gap-1">
            <Loader2 className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

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
            <Button className="mt-5" onClick={retryPreparePayment} disabled={preparingPayment}>
              {preparingPayment ? "Préparation..." : "Réessayer"}
            </Button>
          </Card>
        ) : payment?.status === "REFUNDED" ? (
          <Card className="p-6 text-center">
            <PaymentBadge status="REFUNDED" />
            <p className="mt-3 text-muted-foreground">Ce paiement a été remboursé.</p>
          </Card>
        ) : awaitingConfirmation ? (
          <Card className="p-6 text-center">
            <Loader2 className="size-10 mx-auto text-primary animate-spin mb-3" />
            <h3 className="text-foreground">Confirmation du paiement en cours</h3>
            <p className="text-muted-foreground mt-1">
              Votre paiement a été envoyé à Stripe. La confirmation finale arrive automatiquement.
            </p>
          </Card>
        ) : canPay ? (
          <StripePaymentForm
            amount={amount}
            clientSecret={clientSecret}
            onSuccess={handlePaymentResult}
            stripe={stripe}
          />
        ) : preparingPayment ? (
          <Card className="p-6 text-center">
            <Loader2 className="size-10 mx-auto text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Préparation du paiement...</p>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              {paymentError ||
                (signed
                  ? "Aucun paiement en attente."
                  : "Le paiement sera disponible une fois le contrat signé.")}
            </p>
            {signed && (
              <Button className="mt-4" onClick={retryPreparePayment}>
                Réessayer
              </Button>
            )}
          </Card>
        )}

        {/* Historique */}
        {payment && (payment.status === "COMPLETED" || payment.status === "REFUNDED") && (
          <Card className="p-5 mt-5">
            <h3 className="text-foreground mb-3">Historique du paiement</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">ID Paiement Stripe</dt><dd className="font-mono">{payment.stripeId || payment.externalPaymentId}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Montant payé</dt><dd>{euro(payment.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Statut</dt><dd><PaymentBadge status={payment.status} /></dd></div>
              {(payment.date || payment.paymentDate) && <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(payment.date || payment.paymentDate || "", true)}</dd></div>}
            </dl>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
