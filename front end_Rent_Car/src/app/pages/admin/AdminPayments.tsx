import { useState } from "react";
import { RotateCcw, CreditCard } from "lucide-react";
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
  const list = payments.filter((p) => tab === "ALL" || p.status === tab);

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
            const car = res && getCar(res.carId); const u = res && getUser(res.userId);
            return (
              <tr key={p.id} className="hover:bg-muted/40">
                <Td className="font-mono text-xs">{p.stripeId}</Td>
                <Td>{u?.firstName} {u?.lastName}</Td>
                <Td>{car?.brand} {car?.model}</Td>
                <Td className="font-semibold">{euro(p.amount)}</Td>
                <Td><PaymentBadge status={p.status} /></Td>
                <Td className="text-muted-foreground">{p.date ? formatDate(p.date) : "—"}</Td>
                <Td>{p.status === "COMPLETED" && <Button size="sm" variant="outline" onClick={() => setRefundId(p.id)}><RotateCcw className="size-4" /> Rembourser</Button>}</Td>
              </tr>
            );
          })}
        </Table>
      )}
      <ConfirmModal isOpen={!!refundId} onClose={() => setRefundId(null)} onConfirm={() => { if (refundId) refundPayment(refundId); }}
        title="Rembourser le paiement" message="Êtes-vous sûr de vouloir rembourser ce paiement ?" confirmLabel="Rembourser" danger />
    </PageTransition>
  );
}
