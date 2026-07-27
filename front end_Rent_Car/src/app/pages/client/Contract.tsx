import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, FileText, ShieldCheck, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { ContractBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { PageTransition, EmptyState } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { contractsAPI } from "../../api/contrat.api";
import { euro, formatDate, daysBetween } from "../../lib/format";

const clauses = [
  "Le locataire s'engage à utiliser le véhicule en bon père de famille et conformément au code de la route.",
  "Le véhicule est loué avec le plein de carburant et doit être restitué avec le plein.",
  "Toute infraction ou amende reste à la charge exclusive du locataire.",
  "Le kilométrage est illimité sauf mention contraire dans les conditions particulières.",
  "Le locataire doit signaler immédiatement tout accident, vol ou dommage à l'agence.",
  "Une franchise s'applique en cas de sinistre responsable, selon le barème en vigueur.",
  "La sous-location du véhicule est strictement interdite.",
  "Le non-respect de la date de restitution entraîne une facturation supplémentaire par jour de retard.",
];

export default function Contract({ admin }: { admin?: boolean }) {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const { getCar } = useApp();
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Stocker le clientSecret après signature
  const [storedClientSecret, setStoredClientSecret] = useState<string | null>(null);

  const loadContract = async () => {
    if (!reservationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await contractsAPI.getByReservation(reservationId);
      setContract(res.data?.value || res.data);
    } catch (err) {
      setError("Contrat introuvable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [reservationId]);

  // ✅ Signer le contrat → stocker le clientSecret
  const doSign = async () => {
    if (!contract?.id) return;
    setSigning(true);
    try {
      const res = await contractsAPI.sign(contract.id);
      if (res.data.success) {
        const data = res.data.data;
        // ✅ Stocker le clientSecret reçu du backend
        if (data?.clientSecret) {
          setStoredClientSecret(data.clientSecret);
        }
        loadContract();
      } else {
        toast.error(res.data.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la signature";
      toast.error(message);
    } finally {
      setSigning(false);
    }
  };

  // ✅ Rediriger vers le paiement avec le clientSecret stocké
  const handleGoToPayment = () => {
    navigate(`/payment/${contract.reservationId}`, {
      state: { clientSecret: storedClientSecret },
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <EmptyState
          icon={<FileText className="size-8" />}
          title={error || "Contrat introuvable"}
          action={
            <Link to={admin ? "/admin/reservations" : "/my-reservations"}>
              <Button>Retour</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const days = daysBetween(contract.startDate, contract.endDate);

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-foreground" style={{ fontSize: "1.375rem", fontWeight: 700 }}>
              {contract.contractNumber}
            </h1>
            <p className="text-sm text-muted-foreground">Contrat de location</p>
          </div>
          <ContractBadge status={contract.status} />
        </div>

        {/* Document */}
 
        <div
          className="rounded-2xl border-2 border-amber-100 bg-amber-50/40 shadow-sm p-6 sm:p-10"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <div className="text-center border-b-2 border-dashed border-amber-200 pb-4 mb-6">
            <p className="text-lg font-bold tracking-wide text-slate-800">CONTRAT DE LOCATION DE VÉHICULE</p>
            <p className="text-sm text-slate-500 mt-1">RentCar — Location de véhicules premium</p>
            <p className="text-xs text-slate-400 mt-0.5">N° {contract.contractNumber}</p>
          </div>

          <Section n="1" title="INFORMATIONS DU CLIENT">
            <Row k="Nom complet" v={`${contract.clientFirstName || ""} ${contract.clientLastName || ""}`} />
            <Row k="Email" v={contract.clientEmail || ""} />
          </Section>

          <Section n="2" title="VÉHICULE CONCERNÉ">
            <Row k="Marque / Modèle" v={`${contract.carBrand || ""} ${contract.carModel || ""}`} />
            <Row k="Immatriculation" v={contract.carRegistration || ""} />
            <Row k="Couleur" v={contract.carColor || ""} />
            <Row k="Kilométrage" v={`${(contract.carMileage || 0).toLocaleString("fr-FR")} km`} />
            <Row k="Carburant" v={contract.carFuelType || ""} />
            <Row k="Transmission" v={contract.carTransmission || ""} />
            <Row k="Places" v={String(contract.carSeats || "")} />
          </Section>

          <Section n="3" title="DÉTAILS DE LA LOCATION">
            <Row k="Du" v={formatDate(contract.startDate)} />
            <Row k="Au" v={formatDate(contract.endDate)} />
            <Row k="Durée" v={`${days} jour(s)`} />
            <Row k="Prise en charge" v={contract.pickupLocation || ""} />
            <Row k="Restitution" v={contract.returnLocation || ""} />
            <Row k="Tarif journalier" v={euro(contract.dailyRate || 0)} />
            <Row k="MONTANT TOTAL" v={euro(contract.totalAmount || 0)} bold />
          </Section>

          <Section n="4" title="CONDITIONS GÉNÉRALES">
            {contract.terms ? (
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">{contract.terms}</pre>
            ) : (
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
                {clauses.map((c, i) => <li key={i}>{c}</li>)}
              </ol>
            )}
          </Section>

          <Section n="5" title="SIGNATURES">
            <div className="grid sm:grid-cols-2 gap-6 mt-2">
              <div className="text-sm">
                <p className="font-bold text-slate-800">L'Agence</p>
                <p className="text-slate-600">RentCar - Location de véhicules</p>
                <p className="mt-2 text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="size-4" /> Signé électroniquement
                </p>
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-800">Le Client</p>
                <p className="text-slate-600">
                  {contract.clientFirstName} {contract.clientLastName}
                </p>
                {contract.status === "SIGNED" && contract.signedAt ? (
                  <p className="mt-2 text-emerald-600">✅ Signé le {formatDate(contract.signedAt)}</p>
                ) : contract.status === "DRAFT" ? (
                  <p className="mt-2 text-amber-600">⏳ En attente de signature</p>
                ) : (
                  <p className="mt-2 text-red-600">Contrat annulé</p>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Actions */}
        {!admin && contract.status === "DRAFT" && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 size-4 rounded border-border text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-foreground">
                J'ai lu et j'accepte les conditions générales de location décrites dans ce contrat.
              </span>
            </label>
            <Button className="mt-4 w-full sm:w-auto" disabled={!accepted || signing} onClick={doSign}>
              <FileText className="size-4" /> {signing ? "Signature..." : "Je signe le contrat"}
            </Button>
          </div>
        )}

        {/* ✅ Bouton "Procéder au paiement" avec clientSecret stocké */}
        {!admin && contract.status === "SIGNED" && storedClientSecret && (
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleGoToPayment}>
              <CreditCard className="size-5 mr-2" /> Procéder au paiement
            </Button>
          </div>
        )}

        {contract.status === "CANCELLED" && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-destructive text-sm">
            Ce contrat a été annulé.
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-bold text-slate-800 mb-2 text-sm">{n}. {title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-slate-500">{k}</span>
      <span className={bold ? "font-bold text-slate-900" : "text-slate-700"}>{v}</span>
    </div>
  );
}
