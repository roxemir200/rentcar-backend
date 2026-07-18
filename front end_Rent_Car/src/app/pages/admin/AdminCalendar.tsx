import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, PageTransition } from "../../components/common/Misc";
import { Button } from "../../components/common/Button";
import { ReservationBadge } from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";
import type { Reservation, ReservationStatus } from "../../data/types";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const STATUS_COLORS: Record<ReservationStatus, { bar: string; label: string; dot: string }> = {
  PENDING: { bar: "bg-amber-400 text-amber-950", label: "En attente", dot: "bg-amber-400" },
  CONFIRMED: { bar: "bg-blue-500 text-white", label: "Confirmée", dot: "bg-blue-500" },
  IN_PROGRESS: { bar: "bg-emerald-500 text-white", label: "En cours", dot: "bg-emerald-500" },
  COMPLETED: { bar: "bg-slate-500 text-white", label: "Terminée", dot: "bg-slate-500" },
  CANCELLED: { bar: "bg-red-500 text-white", label: "Annulée", dot: "bg-red-500" },
};

// Normalise à minuit pour comparer les jours
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function AdminCalendar() {
  const { reservations, getCar, getUser } = useApp();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hovered, setHovered] = useState<{ res: Reservation; day: number } | null>(null);
  const [dayModal, setDayModal] = useState<Date | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Grille du mois : cases de début alignées sur Lundi
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Lun=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  // Réservations couvrant un jour donné (entre startDate et endDate inclus)
  const reservationsOn = (date: Date) => {
    const t = atMidnight(date).getTime();
    return reservations.filter((r) => {
      const s = atMidnight(new Date(r.startDate)).getTime();
      const e = atMidnight(new Date(r.endDate)).getTime();
      return t >= s && t <= e;
    });
  };

  const isToday = (d: Date) => atMidnight(d).getTime() === atMidnight(today).getTime();

  return (
    <PageTransition>
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-foreground flex items-center gap-2" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            <CalendarDays className="size-6 text-primary" /> Calendrier des réservations
          </h1>
          <p className="text-muted-foreground">Vue mensuelle de toutes les réservations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Aujourd'hui</Button>
          <div className="flex items-center rounded-lg border border-border">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="size-9 flex items-center justify-center hover:bg-secondary rounded-s-lg"><ChevronLeft className="size-5" /></button>
            <span className="px-3 text-sm font-semibold text-foreground min-w-36 text-center">{MONTHS[month]} {year}</span>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="size-9 flex items-center justify-center hover:bg-secondary rounded-e-lg"><ChevronRight className="size-5" /></button>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {(Object.keys(STATUS_COLORS) as ReservationStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={cn("size-3 rounded-full", STATUS_COLORS[s].dot)} /> {STATUS_COLORS[s].label}
          </span>
        ))}
      </div>

      {/* Grille */}
      <Card className="p-3 sm:p-4 overflow-hidden">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-24 rounded-lg bg-muted/30" />;
            const dayRes = reservationsOn(date);
            return (
              <button
                key={i}
                onClick={() => setDayModal(date)}
                className={cn(
                  "min-h-24 rounded-lg border p-1.5 text-start transition-colors relative flex flex-col gap-1",
                  isToday(date) ? "border-primary bg-accent/50" : "border-border hover:bg-muted/50",
                )}
              >
                <span className={cn("text-xs font-semibold", isToday(date) ? "text-primary" : "text-foreground")}>{date.getDate()}</span>
                <div className="flex flex-col gap-0.5">
                  {dayRes.slice(0, 3).map((r) => {
                    const car = getCar(r.carId);
                    return (
                      <div
                        key={r.id}
                        onMouseEnter={() => setHovered({ res: r, day: i })}
                        onMouseLeave={() => setHovered(null)}
                        className={cn("truncate rounded px-1.5 py-0.5 text-[10px] font-medium relative", STATUS_COLORS[r.status].bar)}
                      >
                        {car?.brand} {car?.model}
                        {/* Popover survol */}
                        {hovered?.res.id === r.id && hovered.day === i && (
                          <HoverCard res={r} carLabel={`${car?.brand} ${car?.model}`} clientLabel={(() => { const u = getUser(r.userId); return `${u?.firstName} ${u?.lastName}`; })()} />
                        )}
                      </div>
                    );
                  })}
                  {dayRes.length > 3 && <span className="text-[10px] text-muted-foreground px-1">+{dayRes.length - 3} de plus</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Modale jour */}
      <Modal isOpen={!!dayModal} onClose={() => setDayModal(null)} title={dayModal ? `Réservations du ${formatDate(dayModal.toISOString())}` : ""}>
        {dayModal && (() => {
          const list = reservationsOn(dayModal);
          if (list.length === 0) return <p className="text-muted-foreground py-4 text-center">Aucune réservation ce jour.</p>;
          return (
            <div className="space-y-3">
              {list.map((r) => {
                const car = getCar(r.carId); const client = getUser(r.userId);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    <span className={cn("size-2.5 rounded-full shrink-0", STATUS_COLORS[r.status].dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{car?.brand} {car?.model}</p>
                      <p className="text-sm text-muted-foreground truncate">{client?.firstName} {client?.lastName} · {formatDate(r.startDate)} → {formatDate(r.endDate)}</p>
                    </div>
                    <ReservationBadge status={r.status} />
                    <Link to={`/admin/reservation/${r.id}`} onClick={() => setDayModal(null)}><Button size="sm" variant="outline">Détails</Button></Link>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Modal>
    </PageTransition>
  );
}

function HoverCard({ res, carLabel, clientLabel }: { res: Reservation; carLabel: string; clientLabel: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className="absolute z-30 top-full left-0 mt-1 w-56 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border p-3 text-start cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-mono text-muted-foreground mb-1">#{res.id.toUpperCase()}</p>
        <p className="text-sm font-semibold text-foreground">{carLabel}</p>
        <p className="text-xs text-muted-foreground mb-2">{clientLabel}</p>
        <p className="text-xs text-foreground mb-2">{formatDate(res.startDate)} → {formatDate(res.endDate)}</p>
        <ReservationBadge status={res.status} />
        <Link to={`/admin/reservation/${res.id}`} className="mt-2 block text-xs font-medium text-primary hover:underline">Voir détails →</Link>
      </motion.div>
    </AnimatePresence>
  );
}
