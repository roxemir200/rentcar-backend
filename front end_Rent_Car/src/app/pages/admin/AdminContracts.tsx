import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eye, Ban, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { ContractBadge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { ConfirmModal } from "../../components/common/Modal";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { contractsAPI } from "../../api/contrat.api";
import { formatDate } from "../../lib/format";

export default function AdminContracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | number | null>(null);

  // Charger tous les contrats depuis l'API
  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await contractsAPI.getAll();
      setContracts(res.data?.value || res.data || []);
    } catch (err) {
      setError("Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // Annuler un contrat
  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      const res = await contractsAPI.cancel(cancelId);
      if (res.data.success) {
        toast.success("Contrat annulé.");
        loadContracts();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancelId(null);
    }
  };

  // Loading
  if (loading) {
    return (
      <PageTransition>
        <PageHeader title="Gestion des contrats" subtitle="Chargement..." />
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </PageTransition>
    );
  }

  // Error
  if (error) {
    return (
      <PageTransition>
        <PageHeader title="Gestion des contrats" />
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadContracts} variant="outline">
            <RefreshCw className="size-4 mr-2" /> Réessayer
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader title="Gestion des contrats" subtitle={`${contracts.length} contrats`} />
      {contracts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState icon={<FileText className="size-8" />} title="Aucun contrat" />
        </div>
      ) : (
        <Table head={["N° Contrat", "Client", "Voiture", "Statut", "Signé le", "Actions"]}>
          {contracts.map((ct) => {
            // Données directement du backend (ContractResponse)
            const clientName = ct.clientFirstName && ct.clientLastName
              ? `${ct.clientFirstName} ${ct.clientLastName}`
              : "—";
            const carInfo = ct.carBrand && ct.carModel
              ? `${ct.carBrand} ${ct.carModel}`
              : "—";
            const canCancel = ct.status === "DRAFT" || ct.status === "SIGNED";  

            return (
              <tr key={ct.id} className="hover:bg-muted/40">
                <Td className="font-mono text-xs">{ct.contractNumber}</Td>
                <Td>{clientName}</Td>
                <Td>{carInfo}</Td>
                <Td><ContractBadge status={ct.status} /></Td>
                <Td className="text-muted-foreground">{ct.signedAt ? formatDate(ct.signedAt) : "—"}</Td>
                <Td>
                  <div className="flex gap-1">
                    {ct.reservationId && (
                      <Link to={`/admin/contract/${ct.reservationId}`}>
                        <Button size="sm" variant="ghost"><Eye className="size-4" /></Button>
                      </Link>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => setCancelId(ct.id)}>
                        <Ban className="size-4" />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <ConfirmModal
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Annuler le contrat"
        message="Êtes-vous sûr de vouloir annuler ce contrat ?"
        confirmLabel="Annuler le contrat"
        danger
      />
    </PageTransition>
  );
}