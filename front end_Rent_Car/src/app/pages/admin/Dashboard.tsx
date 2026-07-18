import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Car, CheckCircle2, CircleDot, Clock, ClipboardList, PlayCircle, XCircle, Wallet, CalendarDays, Users, Star, Trophy, AlertTriangle, BellRing } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { StatCard, Card, PageTransition } from "../../components/common/Misc";
import { StarRating } from "../../components/common/StarRating";
import { useApp } from "../../context/AppContext";
import { euro } from "../../lib/format";
import { cn } from "../../components/ui/utils";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function Dashboard() {
  const { cars, categories, reservations, payments, users, reviews, getCar, getCarRating } = useApp();
  const [year, setYear] = useState(2026);

  // Alertes de stock : catégories avec moins de 3 voitures disponibles
  const stockAlerts = useMemo(() => {
    return categories.map((cat) => {
      const avail = cars.filter((c) => c.category === cat.name && c.status === "AVAILABLE").length;
      return { id: cat.id, name: cat.name, avail };
    }).filter((c) => c.avail < 3);
  }, [categories, cars]);

  const stats = useMemo(() => {
    const paid = payments.filter((p) => p.status === "COMPLETED");
    const revenue = paid.reduce((s, p) => s + p.amount, 0);
    const thisMonth = paid.filter((p) => p.date && new Date(p.date).getMonth() === new Date().getMonth() && new Date(p.date).getFullYear() === year).reduce((s, p) => s + p.amount, 0);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return {
      totalCars: cars.length,
      available: cars.filter((c) => c.status === "AVAILABLE").length,
      rented: cars.filter((c) => c.status === "RENTED").length,
      reserved: cars.filter((c) => c.status === "RESERVED").length,
      totalRes: reservations.length,
      inProgress: reservations.filter((r) => r.status === "IN_PROGRESS").length,
      completed: reservations.filter((r) => r.status === "COMPLETED").length,
      cancelled: reservations.filter((r) => r.status === "CANCELLED").length,
      revenue, thisMonth,
      clients: users.filter((u) => u.role === "CLIENT").length,
      avg,
    };
  }, [cars, reservations, payments, users, reviews, year]);

  const chartData = useMemo(() => MONTHS.map((m, i) => {
    const monthPayments = payments.filter((p) => p.status === "COMPLETED" && p.date && new Date(p.date).getMonth() === i && new Date(p.date).getFullYear() === year);
    return { month: m, revenu: monthPayments.reduce((s, p) => s + p.amount, 0), count: monthPayments.length };
  }), [payments, year]);

  const topCars = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    reservations.filter((r) => r.status !== "CANCELLED").forEach((r) => {
      const e = map.get(r.carId) ?? { count: 0, revenue: 0 };
      map.set(r.carId, { count: e.count + 1, revenue: e.revenue + r.total });
    });
    return [...map.entries()].map(([carId, v]) => ({ carId, ...v })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [reservations]);

  const medals = ["🥇", "🥈", "🥉", "4", "5"];

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité — {year}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Car className="size-5" />} label="Total voitures" value={stats.totalCars} />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Disponibles" value={stats.available} tone="success" />
        <StatCard icon={<CircleDot className="size-5" />} label="Louées" value={stats.rented} tone="danger" />
        <StatCard icon={<Clock className="size-5" />} label="Réservées" value={stats.reserved} tone="warning" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<ClipboardList className="size-5" />} label="Total réservations" value={stats.totalRes} />
        <StatCard icon={<PlayCircle className="size-5" />} label="En cours" value={stats.inProgress} tone="success" />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Terminées" value={stats.completed} />
        <StatCard icon={<XCircle className="size-5" />} label="Annulées" value={stats.cancelled} tone="danger" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Wallet className="size-5" />} label="Revenu total" value={euro(stats.revenue)} tone="success" />
        <StatCard icon={<CalendarDays className="size-5" />} label="Revenu ce mois" value={euro(stats.thisMonth)} tone="info" />
        <StatCard icon={<Users className="size-5" />} label="Clients" value={stats.clients} />
        <StatCard icon={<Star className="size-5" />} label="Note moyenne" value={`${stats.avg.toFixed(1)}/5`} tone="gold" />
      </div>

      {/* Alertes stock */}
      {stockAlerts.length > 0 && (
        <Card className="p-6 mb-8 border-amber-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative">
              <BellRing className="size-5 text-amber-500" />
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">{stockAlerts.length}</span>
            </span>
            <h3 className="text-foreground">Alertes de stock</h3>
          </div>
          <div className="space-y-2">
            {stockAlerts.map((a) => (
              <div key={a.id} className={cn("flex items-center gap-3 p-3 rounded-xl border",
                a.avail === 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800")}>
                <AlertTriangle className="size-5 shrink-0" />
                <p className="text-sm font-medium">
                  {a.avail === 0
                    ? `Aucune voiture disponible dans la catégorie ${a.name}`
                    : `Plus que ${a.avail} voiture${a.avail > 1 ? "s" : ""} disponible${a.avail > 1 ? "s" : ""} dans la catégorie ${a.name}`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Revenue chart */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Revenus par mois — {year}</h3>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
            {[2026, 2025].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis key="x" dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis key="y" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${v} DT`} allowDecimals={false} />
              <Tooltip key="tooltip" cursor={{ fill: "#eff6ff" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: number, _n, p: any) => [`${euro(v)} · ${p.payload.count} réservation(s)`, "Revenu"]} />
              <Bar key="bar" dataKey="revenu" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top cars */}
      <Card className="p-6">
        <h3 className="text-foreground mb-4 flex items-center gap-2"><Trophy className="size-5 text-amber-500" /> Top 5 des voitures les plus louées</h3>
        <div className="space-y-2">
          {topCars.map((t, i) => {
            const car = getCar(t.carId);
            const rating = getCarRating(t.carId);
            return (
              <div key={t.carId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <span className="w-8 text-center text-lg">{medals[i]}</span>
                <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">{car && <ImageWithFallback src={car.images[0]} alt="" className="size-full object-cover" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{car?.brand} {car?.model}</p>
                  <p className="text-sm text-muted-foreground">{t.count} location{t.count > 1 ? "s" : ""}</p>
                </div>
                {rating.count > 0 && <StarRating value={rating.avg} size={13} showValue />}
                <p className="font-semibold text-primary w-24 text-right">{euro(t.revenue)}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </PageTransition>
  );
}
