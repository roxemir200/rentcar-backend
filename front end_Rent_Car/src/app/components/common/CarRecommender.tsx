import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Sparkles,
  Target,
  Wallet,
  UsersRound,
  CalendarRange,
  Settings2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Loader2,
  Star,
  CheckCircle2,
  Zap,
  CarFront,
  ArrowRight,
  BadgeCheck,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Badge } from "./Badge";
import { StarRating } from "./StarRating";
import { Button } from "./Button";
import { cn } from "../ui/utils";
import { euro } from "../../lib/format";
import { recommendationsAPI } from "../../api/recommendations.api";
import type { Car } from "../../data/types";

type Objective = "QUOTIDIEN" | "FAMILLE" | "PROFESSIONNEL" | "AVENTURE" | "CONFORT" | "ECOLOGIQUE";
type TransmissionPref = "ANY" | "AUTOMATIC" | "MANUAL";

const OBJECTIVES: {
  key: Objective;
  label: string;
  hint: string;
  icon: typeof Target;
  accent: string;
}[] = [
  { key: "QUOTIDIEN",    label: "Quotidien",     hint: "Ville & trajets courts",  icon: CarFront,   accent: "from-sky-500 to-blue-600" },
  { key: "FAMILLE",      label: "Famille",       hint: "Espace & sécurité",       icon: UsersRound, accent: "from-emerald-500 to-teal-600" },
  { key: "PROFESSIONNEL",label: "Professionnel", hint: "Business & prestige",     icon: Target,     accent: "from-indigo-500 to-violet-600" },
  { key: "AVENTURE",     label: "Aventure",      hint: "Robuste & voyage",        icon: Zap,        accent: "from-orange-500 to-amber-600" },
  { key: "CONFORT",      label: "Confort",       hint: "Longs trajets premium",  icon: BadgeCheck, accent: "from-fuchsia-500 to-pink-600" },
  { key: "ECOLOGIQUE",   label: "Écologique",    hint: "Hybride / Électrique",    icon: Sparkles,   accent: "from-green-500 to-lime-600" },
];

const STEPS = [
  { id: 1, title: "Objectif",      icon: Target,      label: "Usage de la voiture" },
  { id: 2, title: "Budget",      icon: Wallet,      label: "Budget par jour" },
  { id: 3, title: "Passagers",   icon: UsersRound,  label: "Combien de passagers" },
  { id: 4, title: "Durée",        icon: CalendarRange,label: "Durée de location" },
  { id: 5, title: "Transmission", icon: Settings2,  label: "Transmission souhaitée" },
];

const TRANSMISSION_OPTIONS: { key: TransmissionPref; label: string; hint: string }[] = [
  { key: "AUTOMATIC", label: "Automatique", hint: "Conduite sans effort" },
  { key: "MANUAL",    label: "Manuelle",    hint: "Conduite sportive" },
  { key: "ANY",       label: "Indifférent",  hint: "Les deux me conviennent" },
];

export interface RecommendedCar {
  carId: number | string;
  brand: string;
  model: string;
  dailyRate: number;
  matchScore: number;
  ratingAvg: number;
  categoryName?: string;
  highlights?: string[];
}

interface CarRecommenderProps {
  cars?: Car[];
}

function ScoreRing({ score, size = 92 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c * (1 - clamped / 100);
  const tone =
    clamped >= 85 ? "stroke-emerald-500"
      : clamped >= 70 ? "stroke-teal-500"
      : clamped >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  const toneText =
    clamped >= 85 ? "text-emerald-600"
      : clamped >= 70 ? "text-teal-600"
      : clamped >= 50 ? "text-amber-600" : "text-rose-600";
  const toneBg =
    clamped >= 85 ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : clamped >= 70 ? "bg-teal-50 text-teal-700 border-teal-100"
      : clamped >= 50 ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-rose-50 text-rose-700 border-rose-100";
  const label =
    clamped >= 90 ? "Excellent"
      : clamped >= 75 ? "Très bien"
      : clamped >= 60 ? "Bien" : "Correct";
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} className="stroke-slate-100" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            className={cn(tone)}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.7,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-extrabold tracking-tight", toneText)}>{Math.round(clamped)}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-semibold", toneBg)}>
        {label}
      </span>
    </div>
  );
}

function ResultCard({
  item, car, rank,
}: {
  item: RecommendedCar;
  car?: Car;
  rank: number;
}) {
  const fallbackColors = [
    "from-sky-500 via-blue-500 to-indigo-600",
    "from-violet-500 via-fuchsia-500 to-pink-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
  ];
  const imgSrc = car?.images?.[0] || "";
  const brand = car?.brand || item.brand;
  const model = car?.model || item.model;
  const price = car ? car.pricePerDay : item.dailyRate;
  const category = car?.category || item.categoryName || "Voiture";
  const statusLabel =
    car?.status === "AVAILABLE" ? "Disponible"
      : car?.status === "RESERVED" ? "Réservée"
      : car?.status === "RENTED" ? "Louée" : "Disponible";
  const statusVariant =
    car?.status === "AVAILABLE" ? "success"
      : car?.status === "RESERVED" ? "warning" : "error";
  const ratingAvg = car ? (car as any)?.ratingAvg ?? item.ratingAvg : item.ratingAvg;
  const reviewCount = (car as any)?.reviewCount ?? (car as any)?.ratingCount ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        delay: rank * 0.08,
        duration: 0.45,
        ease: [0.2, 0.7, 0.2, 1],
        hover: { duration: 0.2, ease: "easeOut" },
      }}
      className="relative grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] items-stretch gap-5 p-5 md:p-6 rounded-3xl border border-border bg-gradient-to-br from-white via-white to-slate-50 shadow-sm hover:shadow-xl hover:shadow-slate-200/40"
    >
      <span
        className={cn(
          "absolute -top-3 -left-3 size-8 rounded-full text-white font-bold text-sm flex items-center justify-center shadow-md ring-4 ring-white",
          "bg-gradient-to-br", fallbackColors[rank % fallbackColors.length]
        )}
      >#{rank + 1}</span>

      <div className="size-[140px] md:size-[170px] shrink-0 rounded-2xl overflow-hidden bg-slate-100 relative">
        <ImageWithFallback
          src={imgSrc}
          alt={`${brand} ${model}`}
          fallbackClassName="bg-gradient-to-br from-slate-100 to-slate-200"
          className="size-full object-cover"
        />
        <div className="absolute top-2 left-2">
          <Badge variant="info" size="sm">{category}</Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant={statusVariant as any} size="sm" dot>{statusLabel}</Badge>
        </div>
      </div>

      <div className="flex flex-col min-w-0 gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-foreground truncate">{brand} {model}</h4>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              {item.highlights?.[0] && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary text-xs font-medium border border-primary/10">
                  <CheckCircle2 className="size-3" />
                  {item.highlights[0]}
                </span>
              )}
              {car?.seats != null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <UsersRound className="size-3.5" /> {car.seats} places
                </span>
              )}
              {car?.fuel && (
                <span className="text-xs text-muted-foreground">{car.fuel}</span>
              )}
              {car?.transmission && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Settings2 className="size-3.5" /> {car.transmission}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-0.5">
          {ratingAvg > 0 ? (
            <StarRating value={ratingAvg} size={14} showValue count={reviewCount} />
          ) : (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Star className="size-3.5 text-muted-foreground/60" />
                Pas encore notée
              </span>
            )}
        </div>

        {item.highlights && item.highlights.length > 1 && (
          <ul className="mt-1 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {item.highlights.slice(1).map((h, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-end gap-4 md:border-l md:border-border/60 md:pl-6 mt-3 md:mt-0">
        <ScoreRing score={item.matchScore} />
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">{euro(price)}</span>
            <span className="text-xs text-muted-foreground">/jour</span>
          </div>
          {car ? (
            <Link to={`/cars/${car.id}`} className="w-full">
              <Button className="w-full" size="sm">
              Réserver <ArrowRight className="size-4" />
            </Button>
          </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Info className="size-4" />
              Véhicule archivé
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function CarRecommender({ cars = [] }: CarRecommenderProps) {
  const [stage, setStage] = useState<"wizard" | "loading" | "result">("wizard");
  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<Objective>("QUOTIDIEN");
  const [budget, setBudget] = useState<number>(60);
  const [passengers, setPassengers] = useState<number>(4);
  const [duration, setDuration] = useState<number>(3);
  const [transmission, setTransmission] = useState<TransmissionPref>("ANY");
  const [results, setResults] = useState<RecommendedCar[]>([]);
  const [meta, setMeta] = useState<{ fallbackUsed: boolean; carsScored: number; mlStatus: string } | null>(null);
  const [usedPrefs, setUsedPrefs] = useState<any>(null);

  const carsIndex = useMemo(() => {
    const m = new Map<string | number, Car>();
    cars.forEach((c) => {
      if (c.id != null) m.set(String(c.id), c);
      if (typeof c.id === "number") m.set(c.id, c);
    });
    return m;
  }, [cars]);

  const stepComplete = (() => {
    switch (step) {
      case 1: return objective != null;
      case 2: return budget > 0;
      case 3: return passengers >= 1 && passengers <= 7;
      case 4: return duration >= 1;
      case 5: return transmission != null;
      default: return false;
    }
  })();

  const pctProgress = stage === "result"
    ? 100
    : Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  const next = () => {
    if (stepComplete && step < STEPS.length) setStep(step + 1);
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const reset = () => {
    setStage("wizard");
    setStep(1);
    setResults([]);
    setMeta(null);
  };

  const submit = async () => {
    if (!stepComplete) return;
    setStage("loading");
    try {
      const res = await recommendationsAPI.getCarRecommendations({
        objective,
        budget,
        passengers,
        duration,
        transmission,
        topK: 3,
      });
      const body = (res?.data ?? {}) as any;
      const items = body?.data ?? [];
      setUsedPrefs(body?.preferences ?? { objective, budget, passengers, duration, transmission });
      const normalized: RecommendedCar[] = items.map((it: any) => ({
        carId: it.carId ?? it.car_id,
        brand: it.brand ?? "",
        model: it.model ?? "",
        dailyRate: Number(it.dailyRate ?? it.daily_rate ?? 0),
        matchScore: Number(it.matchScore ?? it.match_score ?? 0),
        ratingAvg: Number(it.ratingAvg ?? it.rating_avg ?? 0),
        categoryName: it.categoryName ?? it.category_name ?? "",
        highlights: it.highlights ?? [],
      }));
      setResults(normalized);
      setMeta({
        fallbackUsed: Boolean(body?.meta?.fallbackUsed ?? false),
        carsScored: Number(body?.meta?.carsScored ?? body?.meta?.cars_scored ?? cars.length),
        mlStatus: String(body?.meta?.mlServiceStatus ?? body?.meta?.ml_service_status ?? "OK"),
      });
      if (normalized.length === 0) {
        toast.warning("Aucune recommandation trouvée pour ces critères.");
      }
      setStage("result");
    } catch (err: any) {
      toast.error("Impossible de lancer la recommandation", {
        description: err?.response?.data?.message || err?.message || "Erreur réseau. Réessayez plus tard.",
      });
      setStage("wizard");
    }
  };

  const prefBadge = () => {
    const obj = OBJECTIVES.find((o) => o.key === usedPrefs?.objective);
    return [
      obj?.label ?? "",
      `${euro(usedPrefs?.budget ?? 0)}/j`,
      `${usedPrefs?.passengers ?? 0} passagers`,
      `${usedPrefs?.duration ?? 0} jr`,
      usedPrefs?.transmission === "ANY"
        ? "Transmission libre"
        : usedPrefs?.transmission === "AUTOMATIC" ? "Automatique" : "Manuelle",
    ].filter(Boolean);
  };

  return (
    <section className="mb-8 rounded-[28px] relative overflow-hidden border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm">
      <div className="pointer-events-none absolute -top-24 -right-20 size-80 rounded-full bg-gradient-to-br from-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-gradient-to-br from-violet-500/10 blur-3xl" aria-hidden />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Sparkles className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-[1.75rem] font-extrabold tracking-tight text-foreground">
                  Conseils personnalisés
                </h2>
                <p className="mt-1 text-muted-foreground max-w-2xl">
                  Répondez à 5 questions, notre moteur vous suggère les 3 véhicules les plus adaptés à votre voyage.
                </p>
              </div>
            </div>

          {stage === "result" && (
            <Button variant="outline" onClick={reset} className="w-full md:w-auto">
              <RotateCcw className="size-4" /> Recommencer
            </Button>
          )}
        </div>

        {/* Stepper */}
        {stage !== "result" && (
          <div className="mb-8">
            <div className="flex items-center gap-2">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <div className={cn(
                    "flex items-center gap-2 shrink-0",
                    !active && "md:flex md:flex-col md:items-start md:gap-1"
                  )}>
                      <div className={cn(
                        "size-9 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                        active && "border-primary bg-primary text-white shadow-md shadow-primary/20",
                        done && "border-emerald-500 bg-emerald-500 text-white",
                        !active && !done && "border-border bg-card text-muted-foreground"
                      )}>
                        {done ? <CheckCircle2 className="size-4" /> : (active ? <Icon className="size-4" /> : <span className="text-xs font-bold">{s.id}</span>)}
                      </div>
                      <div className="hidden md:block">
                        <p className={cn("text-xs font-semibold", active && "text-foreground", !active && !done && "text-muted-foreground", done && "text-emerald-600")}>{s.title}</p>
                        <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      </div>
                  </div>
                    {idx < STEPS.length - 1 && (
                      <div className="flex-1 h-1 mx-2 md:mx-4 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500", done ? "bg-emerald-500" : "bg-transparent")}
                          style={{ width: done ? "100%" : active ? "40%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar mobile */}
            <div className="mt-4 md:hidden h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
              className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
                style={{ width: `${pctProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Wizard / Loading / Result */}
        <AnimatePresence mode="wait">
          {stage === "wizard" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 1 — Objectif */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {OBJECTIVES.map((o) => {
                      const Icon = o.icon;
                      const selected = objective === o.key;
                      return (
                        <button
                          type="button"
                          key={o.key}
                          onClick={() => setObjective(o.key)}
                          className={cn(
                            "group text-left p-4 rounded-2xl border transition-all",
                            "relative overflow-hidden",
                            selected
                              ? "border-primary/60 ring-2 ring-primary/20 bg-white shadow-md"
                              : "border-border bg-white hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "absolute -top-10 -right-10 size-24 rounded-full opacity-10 transition-opacity bg-gradient-to-br",
                            o.accent,
                            selected ? "opacity-30" : "group-hover:opacity-20"
                          )} />
                          <div className="relative flex items-start gap-3">
                            <div className={cn(
                              "size-10 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br shadow-sm",
                              o.accent
                            )}>
                              <Icon className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("font-bold", selected ? "text-foreground" : "text-slate-800")}>{o.label}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{o.hint}</p>
                            </div>
                            <div className={cn(
                              "size-5 rounded-full border shrink-0 mt-1 transition-all",
                              selected ? "bg-primary border-primary" : "border-slate-300"
                            )}>
                              {selected && <CheckCircle2 className="size-4 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2 — Budget */}
              {step === 2 && (
                <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-center">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-baseline justify-between">
                        <label className="text-base font-semibold text-foreground">Budget par jour</label>
                        <span className="text-3xl font-extrabold tracking-tight text-foreground">{euro(budget)}<span className="text-sm font-medium text-muted-foreground ml-1">/ jour</span></span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Entrez le montant maximum que vous souhaitez dépenser par jour.</p>
                    </div>
                    <div>
                      <input
                        type="range"
                        min={15}
                        max={300}
                        step={5}
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full h-2 rounded-full accent-primary"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>15 DT</span>
                        <span>300 DT</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 100, 180].map((v) => (
                        <button
                          type="button"
                          key={v}
                          onClick={() => setBudget(v)}
                          className={cn(
                            "py-2 rounded-xl text-sm font-semibold border transition-all",
                            budget === v
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-border bg-white hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          {v} DT
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-white p-5 text-center">
                    <div className="size-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Wallet className="size-8" />
                    </div>
                    <p className="mt-4 font-bold text-foreground">
                      Estimation totale
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Pour {duration} jour{duration > 1 ? "s" : ""}</p>
                    <p className="mt-2 text-3xl font-extrabold text-foreground tracking-tight">
                      {euro(budget * duration)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Sous réserve des options.</p>
                  </div>
                </div>
              )}

              {/* Step 3 — Passagers */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-base font-semibold text-foreground">Nombre de passagers</label>
                      <span className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
                        <UsersRound className="size-6 text-primary" />
                        {passengers}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Incluez-vous, les enfants et bébés.</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPassengers(p)}
                        className={cn(
                          "aspect-square rounded-2xl font-bold text-lg transition-all border",
                          passengers === p
                            ? "bg-gradient-to-br from-primary to-violet-600 border-transparent text-white shadow-lg shadow-primary/20"
                            : "bg-white border-border text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl p-4 border border-border bg-white">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seulement vous</span>
                      <p className="font-bold text-foreground mt-1">
                        {passengers === 1 ? "✅ Parfait" : "1 passager"}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4 border border-border bg-white">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Couple / petit groupe</span>
                      <p className="font-bold text-foreground mt-1">{passengers >= 2 && passengers <= 4 ? "✅ Adapté" : "2 à 4 pers."}</p>
                    </div>
                    <div className="rounded-2xl p-4 border border-border bg-white">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Famille nombreuse</span>
                      <p className="font-bold text-foreground mt-1">{passengers >= 5 ? "✅ SUV / Monospace" : "5+ pers."}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 — Durée */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-base font-semibold text-foreground">Durée de location</label>
                      <span className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
                        <CalendarRange className="size-6 text-primary" />
                        {duration} <span className="text-base font-semibold text-muted-foreground">jour{duration > 1 ? "s" : ""}</span>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Une location longue durée est souvent mieux notée par notre IA.</p>
                  </div>
                  <div>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      step={1}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-primary"
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>1 jr</span>
                      <span>60 jr</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                          duration === d
                            ? "bg-primary border-primary text-white shadow-sm"
                            : "bg-white border-border text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {d} jour{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5 — Transmission */}
              {step === 5 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {TRANSMISSION_OPTIONS.map((t) => {
                    const selected = transmission === t.key;
                    return (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => setTransmission(t.key)}
                        className={cn(
                          "p-5 text-left rounded-2xl border transition-all",
                          selected
                            ? "border-primary/60 ring-2 ring-primary/20 bg-white shadow-md"
                            : "border-border bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0",
                            selected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                          )}>
                            <Settings2 className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-bold", selected ? "text-foreground" : "text-slate-800")}>{t.label}</p>
                            <p className="text-sm text-muted-foreground">{t.hint}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Nav */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="outline" onClick={prev} disabled={step === 1}>
                  <ChevronLeft className="size-4" /> Précédent
                </Button>
                {step < STEPS.length ? (
                  <Button onClick={next} disabled={!stepComplete}>
                    Suivant <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={!stepComplete}>
                    <Sparkles className="size-4" />
                    Trouver mes voitures
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {stage === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-14 flex flex-col items-center text-center gap-4"
            >
              <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white flex items-center justify-center">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-foreground">Analyse en cours…</p>
                <p className="text-muted-foreground mt-1">Notre IA sélectionne les meilleurs véhicules pour votre profil.</p>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-2.5 rounded-full bg-primary"
                    animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {stage === "result" && results.length > 0 && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    <BadgeCheck className="size-5 text-emerald-500" />
                    Nos {results.length} recommandation{results.length > 1 ? "s" : ""} sur mesure
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {prefBadge().map((p, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                {meta && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full font-medium border",
                      meta.fallbackUsed
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    )}>
                      {meta.fallbackUsed ? "🤖 Moteur hybride" : "✨ Service ML actif"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {meta.carsScored} véhicules analysés
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((it, i) => {
                  const car = carsIndex.get(String(it.carId)) ?? carsIndex.get(Number(it.carId));
                  return <ResultCard key={String(it.carId)} item={it} car={car} rank={i} />;
                })}
              </div>
            </motion.div>
          )}

          {stage === "result" && results.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center text-center gap-3"
            >
              <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Info className="size-7" />
              </div>
              <p className="text-lg font-bold text-foreground">Aucun véhicule ne correspond exactement</p>
              <p className="text-muted-foreground max-w-md">
                Essayez d'élargir votre budget, de réduire le nombre de passagers ou de choisir « Indifférent » pour la transmission.
              </p>
              <Button variant="outline" onClick={reset}>Ajuster mes critères</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
