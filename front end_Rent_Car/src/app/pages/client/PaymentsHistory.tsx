import { Link } from "react-router";
import { useState } from "react";
import { CreditCard, Loader2, Download } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { euro, formatDate, daysBetween } from "../../lib/format";
import { generateInvoicePDF } from "../../lib/exporters";
import { toast } from "sonner";

export default function PaymentsHistory() {
  const { currentUser, payments, reservations, getCar, getUser } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const mine = payments
    .map((p) => {
      const res = reservations.find((r) => r.id === p.reservationId);
      return { p, res };
    })
    // Don't require the reservation; just use p.paymentDate, or even show all payments
    .sort((a, b) => +new Date(b.p.paymentDate || b.p.createdAt || b.p.date || 0) - +new Date(a.p.paymentDate || a.p.createdAt || a.p.date || 0));

  const totalPaid = mine.filter((x) => x.p.status === "COMPLETED").reduce((s, x) => s + x.p.amount, 0);

  const downloadInvoice = (paymentId: string) => {
    const item = mine.find((x) => x.p.id === paymentId);
    if (!item?.res) return;
    const car = getCar(item.res.carId);
    const client = getUser(item.res.userId);
    const days = daysBetween(item.res.startDate, item.res.endDate);
    const total = item.p.amount;
    const subtotal = total / 1.19;
    const tax = total - subtotal;
    setBusy(paymentId);
    setTimeout(() => {
      generateInvoicePDF({
        number: `FAC-${item.p.stripeId.slice(-8).toUpperCase()}`,
        client: `${client?.firstName} ${client?.lastName}`,
        email: client?.email ?? "",
        car: `${car?.brand} ${car?.model}`,
        startDate: formatDate(item.res.startDate),
        endDate: formatDate(item.res.endDate),
        days,
        unitPrice: euro(car?.pricePerDay ?? 0),
        subtotal: euro(Math.round(subtotal)),
        tax: euro(Math.round(tax)),
        total: euro(total),
        status: item.p.status === "COMPLETED" ? "Payé" : "En attente",
        date: item.p.date ? formatDate(item.p.date) : formatDate(item.res.createdAt),
      });
      setBusy(null);
      toast.success("Facture téléchargée (PDF).");
    }, 500);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Historique des paiements</h1>
          <p className="text-muted-foreground">Retrouvez toutes vos transactions.</p>
        </div>

        {mine.length === 0 ? (
          <Card><EmptyState icon={<CreditCard className="size-8" />} title="Aucun paiement"
            description="Vos paiements apparaîtront ici après vos réservations."
            action={<Link to="/cars"><Button>Découvrir les voitures</Button></Link>} /></Card>
        ) : (
          <>
            <Card className="p-5 mb-4 flex items-center justify-between">
              <span className="text-muted-foreground">Total payé</span>
              <span className="text-2xl font-bold text-primary">{euro(totalPaid)}</span>
            </Card>
            <div className="space-y-3">
              {mine.map(({ p, res }) => {
                const car = res && getCar(res.carId);
                return (
                  <Card key={p.id} className="p-4 flex items-center gap-4" hover>
                    <div className="h-16 w-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                      {car && car.images.length > 0 ? (
                        <ImageWithFallback src={car.images[0]} alt={car.brand} className="size-full object-cover" />
                      ) : (
                        <CreditCard className="size-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {car ? `${car.brand} ${car.model}` : (p.carInfo || "Réservation")}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">{p.stripeId || p.externalPaymentId}</p>
                      <p className="text-xs text-muted-foreground">{p.paymentDate || p.createdAt || p.date ? formatDate(p.paymentDate || p.createdAt || p.date, true) : "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground mb-1">{euro(p.amount)}</p>
                      <PaymentBadge status={p.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      {res && <Link to={`/payment/${res.id}`}><Button size="sm" variant="outline"><CreditCard className="size-4" /></Button></Link>}
                      <Button size="sm" onClick={() => downloadInvoice(p.id)} disabled={busy === p.id}>
                        {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
