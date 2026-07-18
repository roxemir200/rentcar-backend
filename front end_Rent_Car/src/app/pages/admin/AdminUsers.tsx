import { useState } from "react";
import { Power, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { Role } from "../../data/types";

const tabs = [
  { key: "ALL", label: "Tous" }, { key: "ADMIN", label: "Admin" }, { key: "CLIENT", label: "Client" },
  { key: "ACTIVE", label: "Actifs" }, { key: "INACTIVE", label: "Inactifs" },
];

export default function AdminUsers() {
  const { users, currentUser, toggleUserActive, changeUserRole } = useApp();
  const [tab, setTab] = useState("ALL");

  const list = users.filter((u) => {
    if (tab === "ADMIN") return u.role === "ADMIN";
    if (tab === "CLIENT") return u.role === "CLIENT";
    if (tab === "ACTIVE") return u.active;
    if (tab === "INACTIVE") return !u.active;
    return true;
  });

  return (
    <PageTransition>
      <PageHeader title="Gestion des utilisateurs" subtitle={`${users.length} utilisateurs`} />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors",
              tab === t.key ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:text-foreground")}>{t.label}</button>
        ))}
      </div>
      {list.length === 0 ? <div className="bg-card border border-border rounded-2xl"><EmptyState icon={<Users className="size-8" />} title="Aucun utilisateur" /></div> : (
        <Table head={["Nom complet", "Email", "Téléphone", "Rôle", "Statut", "Inscription", "Actions"]}>
          {list.map((u) => (
            <tr key={u.id} className="hover:bg-muted/40">
              <Td className="font-medium">{u.firstName} {u.lastName}</Td>
              <Td className="text-muted-foreground">{u.email}</Td>
              <Td className="text-muted-foreground">{u.phone ?? "—"}</Td>
              <Td><Badge variant={u.role === "ADMIN" ? "info" : "neutral"} size="sm">{u.role === "ADMIN" ? "Admin" : "Client"}</Badge></Td>
              <Td><Badge variant={u.active ? "success" : "error"} size="sm" dot>{u.active ? "Actif" : "Inactif"}</Badge></Td>
              <Td className="text-muted-foreground whitespace-nowrap">{formatDate(u.createdAt)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={u.id === currentUser?.id}
                    onClick={() => { toggleUserActive(u.id); toast.success(u.active ? "Utilisateur désactivé." : "Utilisateur activé."); }}>
                    <Power className="size-4" /> {u.active ? "Désactiver" : "Activer"}
                  </Button>
                  <select value={u.role} disabled={u.id === currentUser?.id}
                    onChange={(e) => { changeUserRole(u.id, e.target.value as Role); toast.success("Rôle mis à jour."); }}
                    className="h-8 rounded-lg border border-border bg-white px-2 text-sm disabled:opacity-50">
                    <option value="CLIENT">Client</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </PageTransition>
  );
}
