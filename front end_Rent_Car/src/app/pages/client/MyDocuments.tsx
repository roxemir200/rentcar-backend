import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import { FileText, Receipt, Eye, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ContractBadge, PaymentBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { usePrefs } from "../../context/PrefsContext";
import { euro, formatDate, daysBetween } from "../../lib/format";
import { generateContractPDF, generateInvoicePDF } from "../../lib/exporters";
import { cn } from "../../components/ui/utils";
import { contractsAPI } from "../../api/contrat.api";
import { mapContractFromApi } from "../../context/AppContext";

type Tab = "contracts" | "invoices";

export default function MyDocuments() {
  const { currentUser, reservations, contracts, payments, getCar, getUser, setContracts } = useApp();
  const { t } = usePrefs();
  const [tab, setTab] = useState<Tab>("contracts");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Load contracts for each of the user's reservations that have payments
  useEffect(() => {
    if (!currentUser || reservations.length === 0 || payments.length === 0) {
      setLoadingContracts(false);
      return;
    }

    const loadContractsForReservations = async () => {
      setLoadingContracts(true);

      // Get user's reservation IDs that have payments
      const reservationIdsWithPayments = payments
        .map(payment => payment.reservationId)
        .filter(resId => {
          const res = reservations.find(r => r.id === resId);
          return res && res.userId === currentUser.id;
        });

      // Make parallel API calls only for reservations with payments
      const contractPromises = reservationIdsWithPayments.map(async (resId) => {
        try {
          const contractRes = await contractsAPI.getByReservation(resId);
          return contractRes.data?.value || contractRes.data;
        } catch (err) {
          return null; // Ignore failed calls
        }
      });

      // Wait for all promises to resolve
      const contractResults = await Promise.all(contractPromises);
      const loadedContracts = contractResults.filter(c => c !== null);

      // Map the contracts and update the global state
      const mappedContracts = loadedContracts.map(mapContractFromApi);
      setContracts(mappedContracts);
      setLoadingContracts(false);
    };

    loadContractsForReservations();
  }, [currentUser, reservations, payments, setContracts]);

  // Contrats du client connecté
  const myContracts = useMemo(
    () =>
      contracts
        .map((c) => ({ c, res: reservations.find((r) => r.id === c.reservationId) }))
        .filter((x) => x.res && x.res.userId === currentUser!.id),
    [contracts, reservations, currentUser],
  );

  // Factures = paiements du client connecté
  const myInvoices = useMemo(
    () =>
      payments
        .map((p) => ({ p, res: reservations.find((r) => r.id === p.reservationId) }))
        .filter((x) => x.res && x.res.userId === currentUser!.id)
        .sort((a, b) => +new Date(b.p.date ?? 0) - +new Date(a.p.date ?? 0)),
    [payments, reservations, currentUser],
  );

  const downloadContract = (contractId: string) => {
    const item = myContracts.find((x) => x.c.id === contractId);
    if (!item?.res || !currentUser) return;
    const car = getCar(item.res.carId);
    setBusy(contractId);
    setTimeout(() => {
      generateContractPDF({
        number: item.c.number,
        status: item.c.status === "SIGNED" ? "Signé" : item.c.status === "DRAFT" ? "Brouillon" : "Annulé",
        client: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email ?? "",
        car: `${car?.brand} ${car?.model} (${car?.year})`,
        plate: car?.plate ?? "",
        startDate: formatDate(item.res!.startDate),
        endDate: formatDate(item.res!.endDate),
        pickup: item.res!.pickupLocation,
        ret: item.res!.returnLocation,
        total: euro(item.res!.total),
        signedAt: item.c.signedAt ? formatDate(item.c.signedAt) : undefined,
      });
      setBusy(null);
      toast.success("Contrat téléchargé (PDF).");
    }, 500);
  };

  const downloadInvoice = (paymentId: string) => {
    const item = myInvoices.find((x) => x.p.id === paymentId);
    if (!item?.res || !currentUser) return;
    const car = getCar(item.res.carId);
    const days = daysBetween(item.res.startDate, item.res.endDate);
    const total = item.p.amount;
    const subtotal = total / 1.19;
    const tax = total - subtotal;
    setBusy(paymentId);
    setTimeout(() => {
      generateInvoicePDF({
        number: `FAC-${item.p.stripeId.slice(-8).toUpperCase()}`,
        client: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email ?? "",
        car: `${car?.brand} ${car?.model}`,
        startDate: formatDate(item.res!.startDate),
        endDate: formatDate(item.res!.endDate),
        days,
        unitPrice: euro(car?.pricePerDay ?? 0),
        subtotal: euro(Math.round(subtotal)),
        tax: euro(Math.round(tax)),
        total: euro(total),
        status: item.p.status === "COMPLETED" ? "Payé" : "En attente",
        date: item.p.date ? formatDate(item.p.date) : formatDate(item.res!.createdAt),
      });
      setBusy(null);
      toast.success("Facture téléchargée (PDF).");
    }, 500);
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>{t("docs.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("docs.subtitle")}</p>

        {/* Onglets */}
        <div className="inline-flex p-1 rounded-xl bg-secondary mb-5">
          {([
            { id: "contracts" as Tab, label: t("docs.contracts"), icon: FileText },
            { id: "invoices" as Tab, label: t("docs.invoices"), icon: Receipt },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "contracts" ? (
          loadingContracts ? (
            <Card>
              <div className="p-8 text-center">
                <Loader2 className="size-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">Chargement des contrats...</p>
              </div>
            </Card>
          ) : myContracts.length === 0 ? (
            <Card><EmptyState icon={<FileText className="size-8" />} title={t("docs.emptyContracts")}
              action={<Link to="/cars"><Button>{t("nav.cars")}</Button></Link>} /></Card>
          ) : (
            <Card className="overflow-hidden">
              <DocTable
                headers={[t("docs.contractNo"), t("docs.car"), t("docs.dates"), t("docs.status"), t("docs.actions")]}
                rows={myContracts.map(({ c, res }) => {
                  const car = res && getCar(res.carId);
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <Td className="font-mono text-sm">{c.number}</Td>
                      <Td>{car?.brand} {car?.model}</Td>
                      <Td className="text-sm text-muted-foreground">{formatDate(res!.startDate)} → {formatDate(res!.endDate)}</Td>
                      <Td><ContractBadge status={c.status} /></Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Link to={`/contract/${res!.id}`}><Button size="sm" variant="outline"><Eye className="size-4" /></Button></Link>
                          <Button size="sm" onClick={() => downloadContract(c.id)} disabled={busy === c.id}>
                            {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                            <span className="hidden sm:inline">PDF</span>
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              />
            </Card>
          )
        ) : myInvoices.length === 0 ? (
          <Card><EmptyState icon={<Receipt className="size-8" />} title={t("docs.emptyInvoices")}
            action={<Link to="/cars"><Button>{t("nav.cars")}</Button></Link>} /></Card>
        ) : (
          <Card className="overflow-hidden">
            <DocTable
              headers={[t("docs.invoiceNo"), t("docs.car"), t("docs.amount"), t("docs.date"), t("docs.actions")]}
              rows={myInvoices.map(({ p, res }) => {
                const car = res && getCar(res.carId);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <Td className="font-mono text-sm">FAC-{p.stripeId.slice(-8).toUpperCase()}</Td>
                    <Td>{car?.brand} {car?.model}</Td>
                    <Td className="font-semibold text-foreground">{euro(p.amount)}</Td>
                    <Td className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        {p.date ? formatDate(p.date) : "—"} <PaymentBadge status={p.status} />
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link to={`/payment/${res!.id}`}><Button size="sm" variant="outline"><Eye className="size-4" /></Button></Link>
                        <Button size="sm" onClick={() => downloadInvoice(p.id)} disabled={busy === p.id}>
                          {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            />
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function DocTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-muted/60">
            {headers.map((h) => (
              <th key={h} className="text-start px-4 py-3 text-sm font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)}>{children}</td>;
}
