import { useNavigate } from "react-router";
import { Calendar, CreditCard, FileText, Settings, Bell, CheckCheck, X, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./Button";
import { EmptyState } from "./Misc";
import { useApp } from "../../context/AppContext";
import { relativeTime } from "../../lib/format";
import { cn } from "../ui/utils";
import type { NotificationType } from "../../data/types";

const icons: Record<NotificationType, { icon: typeof Calendar; tone: string }> = {
  RESERVATION: { icon: Calendar, tone: "bg-blue-50 text-blue-600" },
  PAYMENT: { icon: CreditCard, tone: "bg-emerald-50 text-emerald-600" },
  CONTRACT: { icon: FileText, tone: "bg-amber-50 text-amber-600" },
  SYSTEM: { icon: Settings, tone: "bg-slate-100 text-slate-600" },
  CHAT: { icon: MessageCircle, tone: "bg-purple-50 text-purple-600" },
};

export function NotificationsView({ admin }: { admin?: boolean }) {
  const { currentUser, notifications, markNotificationRead, markAllRead, deleteNotification } = useApp();
  const navigate = useNavigate();
  const mine = notifications.filter((n) => n.userId === currentUser!.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className={cn(admin ? "" : "max-w-3xl mx-auto px-4 sm:px-6 py-8")}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Notifications</h1>
          {unread > 0 && <span className="min-w-6 h-6 px-2 rounded-full bg-destructive text-white text-sm font-semibold flex items-center justify-center">{unread}</span>}
        </div>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="size-4" /> Tout marquer comme lu</Button>}
      </div>

      {mine.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl"><EmptyState icon={<Bell className="size-8" />} title="Aucune notification" description="Vous êtes à jour ! Vos notifications apparaîtront ici." /></div>
      ) : (
        <div className="space-y-2">
          {mine.map((n) => {
            const { icon: Icon, tone } = icons[n.type];
            return (
              <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={cn("w-full flex gap-3 p-4 rounded-xl border transition-colors",
                  n.read ? "bg-card border-border hover:bg-secondary" : "bg-blue-50/50 border-blue-100 hover:bg-blue-50")}>
                <button
                  onClick={() => { markNotificationRead(n.id); if (n.link) navigate(n.link); }}
                  className="flex-1 flex gap-3 text-left"
                >
                  <span className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", tone)}><Icon className="size-5" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{n.title}</p>
                      {!n.read && <span className="size-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{relativeTime(n.date)}</p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="shrink-0 size-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Supprimer la notification"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
