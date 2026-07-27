import { useState, useMemo } from "react";
import { RotateCcw, CreditCard, Loader2 } from "lucide-react";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { ConfirmModal } from "../../components/common/Modal";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { euro, formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { PaymentStatus } from "../../data/types";

const tabs: { key: PaymentStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tous" }, { key: "PENDING", label: "En attente" }, { key: "COMPLETED", label: "Payés" },
  { key: "FAILED", label: "Échoués" }, { key: "REFUNDED", label: "Remboursés" },
];

export default function AdminPayments() {
  const { payments, reservations, getCar, getUser, refundPayment } = useApp();
  const [tab, setTab] = useState<PaymentStatus | "ALL">("ALL");
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  const list = payments
    .filter((p) => tab === "ALL" || p.status === tab)
    .sort((a, b) => +new Date(b.paymentDate || b.createdAt || 0) - +new Date(a.paymentDate || a.createdAt || 0));

  const refundDetails = useMemo(() => {
    if (!refundId) return null;
    const p = payments.find(x => x.id === refundId);
    if (!p) return null;
    const r = reservations.find(x => x.id === p.reservationId);
    const c = r && getCar(r.carId);
    const u = r && getUser(r.userId);
    return {
      amount: p.amount,
      stripeId: p.stripeId,
      client: p.clientName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "—",
      car: p.carInfo || [c?.brand, c?.model].filter(Boolean).join(" ") || "—",
      reservationId: p.reservationId,
    };
  }, [refundId, payments, reservations, getCar, getUser]);

  const message = refundDetails
    ? `Vous êtes sur le point de rembourser ${euro(refundDetails.amount)} à ${refundDetails.client} pour la réservation #${refundDetails.reservationId} (${refundDetails.car}). Cette action est irréversible.`
    : "Êtes-vous sûr de vouloir rembourser ce paiement ?";

  const handleConfirm = async () => {
    if (!refundId || refunding) return;
    setRefunding(true);
    try {
      const r = await refundPayment(refundId);
      if (r.ok) {
        setRefundId(null);
      }
    } finally {
      setRefunding(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader title="Gestion des paiements" subtitle={`${payments.length} transactions`} />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors",
              tab === t.key ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground")}>{t.label}</button>
        ))}
      </div>
      {list.length === 0 ? <div className="bg-card border border-border rounded-2xl"><EmptyState icon={<CreditCard className="size-8" />} title="Aucun paiement" /></div> : (
        <Table head={["N° Stripe", "Client", "Voiture", "Montant", "Statut", "Date", "Actions"]}>
          {list.map((p) => {
            const res = reservations.find((r) => r.id === p.reservationId);
            const car = res && getCar(res.carId);
            const u = res && getUser(res.userId);
            const clientLabel = p.clientName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "—";
            const carLabel = p.carInfo || [car?.brand, car?.model].filter(Boolean).join(" ") || "—";
            const isBusy = refunding && refundId === p.id;
            return (
              <tr key={p.id} className={cn("hover:bg-muted/40 transition-colors", isBusy && "bg-muted/60")}>
                <Td className="font-mono text-xs">{p.stripeId}</Td>
                <Td>{clientLabel}</Td>
                <Td>{carLabel}</Td>
                <Td className="font-semibold">{euro(p.amount)}</Td>
                <Td><PaymentBadge status={p.status} /></Td>
                <Td className="text-muted-foreground">{p.paymentDate || p.createdAt ? formatDate(p.paymentDate || p.createdAt, true) : "—"}</Td>
                <Td>{p.status === "COMPLETED" && <Button size="sm" variant="outline" disabled={isBusy} onClick={() => setRefundId(p.id)}>
                  {isBusy ? <><Loader2 className="size-4 animate-spin" /> En cours…</> : <><RotateCcw className="size-4" /> Rembourser</>}
                </Button>}</Td>
              </tr>
            );
          })}
        </Table>
      )}
      <ConfirmModal
        isOpen={!!refundId}
        onClose={() => !refunding && setRefundId(null)}
        onConfirm={handleConfirm}
        confirmDisabled={refunding}
        title={refunding ? "Remboursement en cours…" : "Confirmer le remboursement"}
        message={message}
        confirmLabel={refunding ? "Traitement…" : "Rembourser"}
        danger
      />
    </PageTransition>
  );
}
