import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Gauge, Palette, Hash, Users,
  Fuel, Settings2, MapPin, CalendarDays, AlertCircle, RefreshCw, CarFront,
} from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Badge } from "../../components/common/Badge";
import { StarRating } from "../../components/common/StarRating";
import { Button } from "../../components/common/Button";
import { Input, Textarea } from "../../components/common/Input";
import { Card, PageTransition, EmptyState } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { reservationsAPI } from "../../api/reservations.api";
import { euro, daysBetween, formatDate } from "../../lib/format";
import { cn } from "../../components/ui/utils";

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cars, carsLoading, carsError, loadCars, getCarRating, reviews, getUser, currentUser } = useApp();
  const car = id ? cars.find((c) => c.id === id) : undefined;
  const [active, setActive] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pickup, setPickup] = useState("Agence Tunis Centre");
  const [ret, setRet] = useState("Agence Tunis Centre");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // États de chargement / erreur
  if (carsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="animate-pulse space-y-6">
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-6 bg-slate-200 rounded w-2/3 mx-auto" />
          <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (carsError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="size-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-4">{carsError}</p>
        <Button onClick={loadCars} variant="outline">
          <RefreshCw className="size-4 mr-2" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <EmptyState
          icon={<CarFront className="size-8" />}
          title="Voiture introuvable"
          action={<Link to="/cars"><Button>Retour aux voitures</Button></Link>}
        />
      </div>
    );
  }

  // Calculs avis
  const rating = getCarRating(car.id);
  const carReviews = reviews
    .filter((r) => r.carId === car.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const today = new Date().toISOString().slice(0, 10);
  const days = start && end ? daysBetween(start, end) : 0;
  const total = days * car.pricePerDay;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    s,
    n: carReviews.filter((r) => r.rating === s).length,
  }));

  // Validation en temps réel
  const validateStart = (value: string) => {
    if (!value) {
      setErrors(prev => ({ ...prev, start: "La date de début est obligatoire" }));
    } else if (value <= today) {
      setErrors(prev => ({ ...prev, start: "La date de début doit être dans le futur" }));
    } else {
      setErrors(prev => ({ ...prev, start: undefined }));
    }
  };

  const validateEnd = (value: string) => {
    if (!value) {
      setErrors(prev => ({ ...prev, end: "La date de fin est obligatoire" }));
    } else if (value <= today) {
      setErrors(prev => ({ ...prev, end: "La date de fin doit être dans le futur" }));
    } else if (start && value <= start) {
      setErrors(prev => ({ ...prev, end: "La date de fin doit être après la date de début" }));
    } else {
      setErrors(prev => ({ ...prev, end: undefined }));
    }
  };

  const reserve = async () => {
    // Validation finale
    const newErrors: { start?: string; end?: string } = {};
    if (!start) newErrors.start = "La date de début est obligatoire";
    if (!end) newErrors.end = "La date de fin est obligatoire";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!currentUser) {
      toast.error("Vous devez être connecté pour réserver.");
      navigate("/login");
      return;
    }

    if (car.status !== "AVAILABLE") {
      toast.error("Ce véhicule n'est pas disponible.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await reservationsAPI.create({
        carId: Number(car.id),
        startDate: start,
        endDate: end,
        pickupLocation: pickup,
        returnLocation: ret,
        additionalNotes: notes,
      });

      if (response.data.success) {
        toast.success("Réservation créée avec succès !");
        navigate(`/reservation/${response.data.data.id}`);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de la réservation";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const spec = [
    { icon: Hash, label: "Immatriculation", value: car.plate },
    { icon: Palette, label: "Couleur", value: car.color },
    { icon: Gauge, label: "Kilométrage", value: `${car.mileage.toLocaleString("fr-FR")} km` },
    { icon: Users, label: "Places", value: car.seats },
    { icon: Fuel, label: "Carburant", value: car.fuel },
    { icon: Settings2, label: "Transmission", value: car.transmission },
  ];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Galerie + info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={car.images[active]}
                  alt={`${car.brand} ${car.model}`}
                  className="size-full object-cover"
                />
                {car.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActive((a) => (a - 1 + car.images.length) % car.images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={() => setActive((a) => (a + 1) % car.images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
              {car.images.length > 1 && (
                <div className="mt-3 flex gap-3">
                  {car.images.map((im, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={cn(
                        "h-16 w-24 rounded-lg overflow-hidden border-2",
                        active === i ? "border-primary" : "border-transparent opacity-70"
                      )}
                    >
                      <ImageWithFallback src={im} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="info">{car.category}</Badge>
                {rating.count > 0 && (
                  <StarRating value={rating.avg} showValue count={rating.count} />
                )}
              </div>
              <h1 className="mt-3 text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                {car.brand} {car.model}
              </h1>
              <p className="text-muted-foreground">{car.year}</p>
              <p className="mt-4 text-foreground/80 leading-relaxed">{car.description}</p>

              <h3 className="mt-6 mb-3 text-foreground">Caractéristiques techniques</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {spec.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                    <Icon className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Avis */}
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Avis clients</h3>
              {rating.count > 0 ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <div className="text-center sm:border-r border-border sm:pr-8">
                      <p className="text-4xl font-bold text-foreground">
                        {rating.avg.toFixed(1)}
                      </p>
                      <StarRating value={rating.avg} size={16} />
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rating.count} avis
                      </p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {dist.map(({ s, n }) => (
                        <div key={s} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-muted-foreground">{s}★</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${rating.count ? (n / rating.count) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {carReviews.map((rev) => {
                      const u = getUser(rev.userId);
                      return (
                        <div key={rev.id} className="border-t border-border pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="size-8 rounded-full bg-accent text-primary flex items-center justify-center text-sm font-semibold">
                                {u?.firstName?.[0]}
                                {u?.lastName?.[0]}
                              </span>
                              <span className="font-medium text-foreground text-sm">
                                {u?.firstName} {u?.lastName?.[0]}.
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(rev.date)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <StarRating value={rev.rating} size={14} />
                          </div>
                          <p className="mt-1.5 text-sm text-foreground/80">{rev.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<CalendarDays className="size-7" />}
                  title="Aucun avis pour cette voiture"
                  description="Soyez le premier à partager votre expérience !"
                />
              )}
            </Card>
          </div>

           <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <p>
                <span className="text-3xl font-bold text-foreground">{euro(car.pricePerDay)}</span>
                <span className="text-muted-foreground">/jour</span>
              </p>
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      label="Début *"
                      type="date"
                      min={today}
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        validateStart(e.target.value);
                      }}
                      onBlur={() => validateStart(start)}
                      error={errors.start}
                    />
                  </div>
                  <div>
                    <Input
                      label="Fin *"
                      type="date"
                      min={start || today}
                      value={end}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        validateEnd(e.target.value);
                      }}
                      onBlur={() => validateEnd(end)}
                      error={errors.end}
                    />
                  </div>
                </div>
                <Input
                  label="Lieu de prise en charge"
                  leftIcon={<MapPin className="size-4.5" />}
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
                <Input
                  label="Lieu de restitution"
                  leftIcon={<MapPin className="size-4.5" />}
                  value={ret}
                  onChange={(e) => setRet(e.target.value)}
                />
                <Textarea
                  label="Notes supplémentaires"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex : siège bébé, GPS..."
                  className="min-h-20"
                />
              </div>
              {days > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-accent flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {days} jour{days > 1 ? "s" : ""} × {euro(car.pricePerDay)}
                  </span>
                  <span className="font-bold text-primary">{euro(total)}</span>
                </div>
              )}
              <Button
                size="lg"
                className="w-full mt-4"
                onClick={reserve}
                disabled={car.status !== "AVAILABLE" || submitting}
              >
                {submitting ? "Réservation..." : car.status === "AVAILABLE" ? "Réserver maintenant" : "Non disponible"}
              </Button>
              {!currentUser && (
                <p className="mt-2 text-xs text-center text-muted-foreground">
                  Connexion requise pour réserver
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}