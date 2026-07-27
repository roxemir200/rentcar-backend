// front end_Rent_Car\src\app\pages\admin\Dashboard.tsx

import { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { 
  Car, CheckCircle2, CircleDot, Clock, ClipboardList, PlayCircle, XCircle, 
  Wallet, CalendarDays, Users, Star, Trophy, AlertTriangle, BellRing, RefreshCw,
  AlertCircle, AlertOctagon, CheckCircle
} from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { StatCard, Card, PageTransition } from "../../components/common/Misc";
import { StarRating } from "../../components/common/StarRating";
import { useApp } from "../../context/AppContext";
import { euro } from "../../lib/format";
import { cn } from "../../components/ui/utils";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const STOCK_THRESHOLDS = {
  CRITICAL: 0,
  URGENT: 1,
  WARNING: 2,
  MAX_ALERT: 2,
} as const;

type StockAlertLevel = "critical" | "urgent" | "warning";

interface StockAlert {
  id: string;
  name: string;
  available: number;
  total: number;
  level: StockAlertLevel;
}

const getStockAlertLevel = (available: number): StockAlertLevel => {
  if (available <= STOCK_THRESHOLDS.CRITICAL) return "critical";
  if (available <= STOCK_THRESHOLDS.URGENT) return "urgent";
  return "warning";
};

const getAlertBadge = (level: StockAlertLevel) => {
  switch (level) {
    case "critical":
      return {
        icon: AlertOctagon,
        container: "bg-red-50 border-red-200",
        text: "text-red-700",
        iconColor: "text-red-600",
        label: "Critique",
        badgeBg: "bg-red-100 text-red-700",
      };
    case "urgent":
      return {
        icon: AlertCircle,
        container: "bg-orange-50 border-orange-200",
        text: "text-orange-700",
        iconColor: "text-orange-600",
        label: "Urgent",
        badgeBg: "bg-orange-100 text-orange-700",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        container: "bg-amber-50 border-amber-200",
        text: "text-amber-800",
        iconColor: "text-amber-600",
        label: "Attention",
        badgeBg: "bg-amber-100 text-amber-700",
      };
  }
};

const LEVEL_PRIORITY: Record<StockAlertLevel, number> = {
  critical: 0,
  urgent: 1,
  warning: 2,
};

export default function Dashboard() {
  // ─── CONTEXT ───
  const { 
    cars, 
    categories, 
    reservations, 
    payments, 
    users, 
    reviews, 
    getCar, 
    getCarRating,
    loadDashboardStats,
    loadDashboardRevenue,
    loadDashboardTopCars,
    dashboardStats,
    dashboardRevenue,
    dashboardTopCars,
    currentUser,
    showWelcomeToast,
  } = useApp();

  // ─── STATE ───
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── LOAD DASHBOARD DATA ───
  const loadData = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loadDashboardStats();
      await loadDashboardRevenue(year);
      await loadDashboardTopCars(5);
    } catch (err) {
      setError("Erreur lors du chargement des statistiques");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Afficher le toast "Bienvenue" quand le tableau de bord admin est chargé
  useEffect(() => {
    if (!loading && currentUser && currentUser.role === "ADMIN") {
      showWelcomeToast();
    }
  }, [loading, currentUser, showWelcomeToast]);

  // When year changes, reload revenue
  useEffect(() => {
    if (currentUser && currentUser.role === "ADMIN") {
      loadDashboardRevenue(year);
    }
  }, [year, currentUser, loadDashboardRevenue]);

  // ─── STOCK ALERTS ───
  const stockAlerts = useMemo((): StockAlert[] => {
    const alerts: StockAlert[] = categories
      .map((cat) => {
        const carsInCategory = cars.filter((c) => {
          if (c.categoryId && cat.id) {
            return String(c.categoryId) === String(cat.id);
          }
          return c.category === cat.name;
        });

        const total = carsInCategory.length;
        const available = carsInCategory.filter((c) => c.status === "AVAILABLE").length;

        return {
          id: cat.id,
          name: cat.name,
          available,
          total,
          level: getStockAlertLevel(available),
        };
      })
      .filter((c) => c.available <= STOCK_THRESHOLDS.MAX_ALERT);

    return alerts.sort((a, b) => {
      const diff = LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level];
      if (diff !== 0) return diff;
      return a.available - b.available;
    });
  }, [categories, cars]);

  const criticalCount = stockAlerts.filter(a => a.level === "critical").length;
  const urgentCount = stockAlerts.filter(a => a.level === "urgent").length;
  const warningCount = stockAlerts.filter(a => a.level === "warning").length;

  // ─── STATS ───
  const stats = useMemo(() => {
    // Utiliser les données du dashboard si disponibles, sinon calculer localement
    if (dashboardStats) {
      return {
        totalCars: dashboardStats.totalCars || 0,
        available: dashboardStats.availableCars || 0,
        rented: dashboardStats.rentedCars || 0,
        reserved: dashboardStats.reservedCars || 0,
        totalRes: dashboardStats.totalReservations || 0,
        inProgress: dashboardStats.inProgressReservations || 0,
        completed: dashboardStats.completedReservations || 0,
        cancelled: dashboardStats.cancelledReservations || 0,
        revenue: dashboardStats.totalRevenue || 0,
        thisMonth: dashboardStats.revenueThisMonth || 0,
        clients: dashboardStats.totalClients || 0,
        avg: dashboardStats.averageRating || 0,
      };
    }

    // Fallback : calcul local
    const paid = payments.filter((p) => p.status === "COMPLETED");
    const revenue = paid.reduce((s, p) => s + (p.amount || 0), 0);
    const thisMonth = paid
      .filter((p) => p.date && new Date(p.date).getMonth() === new Date().getMonth() && new Date(p.date).getFullYear() === year)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    return {
      totalCars: cars.length,
      available: cars.filter((c) => c.status === "AVAILABLE").length,
      rented: cars.filter((c) => c.status === "RENTED").length,
      reserved: cars.filter((c) => c.status === "RESERVED").length,
      totalRes: reservations.length,
      inProgress: reservations.filter((r) => r.status === "IN_PROGRESS").length,
      completed: reservations.filter((r) => r.status === "COMPLETED").length,
      cancelled: reservations.filter((r) => r.status === "CANCELLED").length,
      revenue,
      thisMonth,
      clients: users.filter((u) => u.role === "CLIENT").length,
      avg,
    };
  }, [cars, reservations, payments, users, reviews, year, dashboardStats]);

  // ─── CHART DATA ───
  const chartData = useMemo(() => {
    if (dashboardRevenue && dashboardRevenue.length > 0) {
      return MONTHS.map((m, i) => {
        const monthData = dashboardRevenue.find(
          (item: any) => item.month === i + 1
        );
        return {
          month: m,
          revenu: monthData?.amount || 0,
          count: monthData?.reservationCount || 0,
        };
      });
    }

    // Fallback : calcul local
    return MONTHS.map((m, i) => {
      const monthPayments = payments.filter(
        (p) => p.status === "COMPLETED" && 
        p.date && 
        new Date(p.date).getMonth() === i && 
        new Date(p.date).getFullYear() === year
      );
      return {
        month: m,
        revenu: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
        count: monthPayments.length,
      };
    });
  }, [payments, year, dashboardRevenue]);

  // ─── TOP CARS ───
  const topCars = useMemo(() => {
    if (dashboardTopCars && dashboardTopCars.length > 0) {
      return dashboardTopCars.map((car: any) => ({
        carId: String(car.carId),
        count: car.reservationCount || 0,
        revenue: car.totalRevenue || 0,
        brand: car.brand,
        model: car.model,
        imageUrl: car.imageUrl,
        avgRating: car.averageRating,
      }));
    }

    // Fallback : calcul local
    const map = new Map<string, { count: number; revenue: number }>();
    reservations
      .filter((r) => r.status !== "CANCELLED")
      .forEach((r) => {
        const e = map.get(r.carId) ?? { count: 0, revenue: 0 };
        map.set(r.carId, { 
          count: e.count + 1, 
          revenue: e.revenue + (r.total || 0) 
        });
      });
    return [...map.entries()]
      .map(([carId, v]) => ({ carId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reservations, dashboardTopCars]);

  const medals = ["🥇", "🥈", "🥉", "4", "5"];

  // ─── RENDER ───
  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-destructive text-lg font-semibold">❌ {error}</div>
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <RefreshCw className="size-4" />
            Réessayer
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité — {year}</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className="size-4" />
          Actualiser
        </button>
      </div>

      {/* Stat cards - Voitures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Car className="size-5" />} label="Total voitures" value={stats.totalCars} />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Disponibles" value={stats.available} tone="success" />
        <StatCard icon={<CircleDot className="size-5" />} label="Louées" value={stats.rented} tone="danger" />
        <StatCard icon={<Clock className="size-5" />} label="Réservées" value={stats.reserved} tone="warning" />
      </div>

      {/* Stat cards - Réservations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<ClipboardList className="size-5" />} label="Total réservations" value={stats.totalRes} />
        <StatCard icon={<PlayCircle className="size-5" />} label="En cours" value={stats.inProgress} tone="success" />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Terminées" value={stats.completed} />
        <StatCard icon={<XCircle className="size-5" />} label="Annulées" value={stats.cancelled} tone="danger" />
      </div>

      {/* Stat cards - Finances & Clients */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Wallet className="size-5" />} label="Revenu total" value={euro(stats.revenue)} tone="success" />
        <StatCard icon={<CalendarDays className="size-5" />} label="Revenu ce mois" value={euro(stats.thisMonth)} tone="info" />
        <StatCard icon={<Users className="size-5" />} label="Clients" value={stats.clients} />
        <StatCard icon={<Star className="size-5" />} label="Note moyenne" value={`${stats.avg.toFixed(1)}/5`} tone="gold" />
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 ? (
        <Card className="p-6 mb-8 border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="relative">
                <BellRing className="size-5 text-amber-500" />
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
                  {stockAlerts.length}
                </span>
              </span>
              <h3 className="text-foreground text-base font-semibold">Alertes de stock</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {criticalCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                  <AlertOctagon className="size-3" />
                  {criticalCount} critique{criticalCount > 1 ? "s" : ""}
                </span>
              )}
              {urgentCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-medium flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {warningCount} attention{warningCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {stockAlerts.map((a) => {
              const badge = getAlertBadge(a.level);
              const Icon = badge.icon;
              return (
                <div 
                  key={a.id} 
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm",
                    badge.container
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "size-10 rounded-full flex items-center justify-center shrink-0",
                      a.level === "critical" && "bg-red-100",
                      a.level === "urgent" && "bg-orange-100",
                      a.level === "warning" && "bg-amber-100",
                    )}>
                      <Icon className={cn("size-5", badge.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className={cn("text-sm font-semibold", badge.text)}>
                          {a.name}
                        </p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                          badge.badgeBg
                        )}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.available === 0
                          ? "Aucune voiture disponible"
                          : `Plus que ${a.available} voiture${a.available > 1 ? "s" : ""} disponible${a.available > 1 ? "s" : ""}`
                        }
                        {a.total > 0 && (
                          <span className="text-xs ml-1">
                            · {a.total} véhicule{a.total > 1 ? "s" : ""} au total dans la catégorie
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pl-0 sm:pl-4 sm:border-l sm:border-border/50">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-2xl font-bold", badge.text)}>{a.available}</span>
                        <span className="text-xs text-muted-foreground">/ {a.total}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Disponibles</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6 mb-8 border-green-200 bg-green-50/40">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="size-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold">État du stock optimal</h3>
              <p className="text-sm text-muted-foreground">
                Toutes les catégories disposent d'un niveau de stock suffisant.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Revenue Chart */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Revenus par mois — {year}</h3>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="h-9 rounded-lg border border-border bg-white px-3 text-sm"
          >
            {[2026, 2025, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12, fill: "#64748b" }} 
                tickFormatter={(v) => `${v} DT`} 
                allowDecimals={false} 
              />
              <Tooltip 
                cursor={{ fill: "#eff6ff" }} 
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: number, _n, p: any) => [`${euro(v)} · ${p.payload.count} réservation(s)`, "Revenu"]}
              />
              <Bar dataKey="revenu" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top Cars */}
      <Card className="p-6">
        <h3 className="text-foreground mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" /> 
          Top 5 des voitures les plus louées
        </h3>
        <div className="space-y-2">
          {topCars.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune réservation effectuée pour le moment.
            </p>
          ) : (
            topCars.map((t:any, i:number) => {
              let car = getCar(t.carId);
              const rating = t.avgRating ? { avg: t.avgRating, count: 1 } : getCarRating(t.carId);
              let imageUrl = t.imageUrl || car?.images?.[0] || "";
              
              // Add base URL if needed
              if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
                imageUrl = "http://localhost:8089" + imageUrl;
              }
              
              const brand = t.brand || car?.brand || "";
              const model = t.model || car?.model || "";
              
              return (
                <div key={t.carId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors">
                  <span className="w-8 text-center text-lg">{medals[i] || "🏅"}</span>
                  <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {imageUrl && <ImageWithFallback src={imageUrl} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{brand} {model}</p>
                    <p className="text-sm text-muted-foreground">{t.count} location{t.count > 1 ? "s" : ""}</p>
                  </div>
                  {rating.count > 0 && <StarRating value={rating.avg} size={13} showValue />}
                  <p className="font-semibold text-primary w-24 text-right">{euro(t.revenue)}</p>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </PageTransition>
  );
}