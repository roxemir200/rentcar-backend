import { Link } from "react-router";
import { CreditCard, Receipt } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { euro, formatDate } from "../../lib/format";

export default function PaymentsHistory() {
  const { currentUser, payments, reservations, getCar } = useApp();
  const mine = payments
    .map((p) => ({ p, res: reservations.find((r) => r.id === p.reservationId) }))
    .filter((x) => x.res && x.res.userId === currentUser!.id)
    .sort((a, b) => +new Date(b.p.date ?? 0) - +new Date(a.p.date ?? 0));

  const totalPaid = mine.filter((x) => x.p.status === "COMPLETED").reduce((s, x) => s + x.p.amount, 0);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Historique des paiements</h1>
        <p className="text-muted-foreground mb-6">Retrouvez toutes vos transactions.</p>

        {mine.length === 0 ? (
          <Card><EmptyState icon={<Receipt className="size-8" />} title="Aucun paiement"
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
                    <div className="h-16 w-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">{car && <ImageWithFallback src={car.images[0]} alt="" className="size-full object-cover" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{car?.brand} {car?.model}</p>
                      <p className="text-sm text-muted-foreground font-mono">{p.stripeId}</p>
                      <p className="text-xs text-muted-foreground">{p.date ? formatDate(p.date) : "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground mb-1">{euro(p.amount)}</p>
                      <PaymentBadge status={p.status} />
                    </div>
                    {res && <Link to={`/payment/${res.id}`}><Button size="sm" variant="outline"><CreditCard className="size-4" /></Button></Link>}
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
