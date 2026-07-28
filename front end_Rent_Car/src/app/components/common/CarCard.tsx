import { Link } from "react-router";
import { Settings2, Fuel, Users } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Badge } from "./Badge";
import { StarRating } from "./StarRating";
import { Button } from "./Button";
import { euro } from "../../lib/format";
import type { Car, CarStatus } from "../../data/types";
import { usePrefs } from "../../context/PrefsContext";
import type { TranslationKey } from "../../i18n/translations";
import { trCategory, trFuel, trTransmission } from "../../pages/client/CarsList";

const STATUS_KEYS: Record<CarStatus, { key: TranslationKey; variant: "success" | "warning" | "error" }> = {
  AVAILABLE: { key: "car.status.AVAILABLE", variant: "success" },
  RESERVED: { key: "car.status.RESERVED", variant: "warning" },
  RENTED:    { key: "car.status.RENTED",    variant: "error" },
};

export function CarCard({ car, rating }: { car: Car; rating: { avg: number; count: number } }) {
  const { t } = usePrefs();
  const status = STATUS_KEYS[car.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <ImageWithFallback src={car.images[0]} alt={`${car.brand} ${car.model}`}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3"><Badge variant="info" size="sm">{trCategory(t, car.category)}</Badge></div>
        <div className="absolute top-3 right-3"><Badge variant={status.variant} size="sm" dot>{t(status.key)}</Badge></div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-foreground">{car.brand} {car.model}</h3>
            <p className="text-sm text-muted-foreground">{car.year}</p>
          </div>
        </div>
        <div className="mt-1.5">
          {rating.count > 0 ? <StarRating value={rating.avg} size={15} showValue count={rating.count} />
            : <span className="text-sm text-muted-foreground">{t("car.noReviews")}</span>}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Settings2 className="size-4" /> {car.transmission === "Automatique" ? t("car.transmission.autoShort") : t("car.transmission.manualShort")}</span>
          <span className="flex items-center gap-1.5"><Fuel className="size-4" /> {trFuel(t, car.fuel)}</span>
          <span className="flex items-center gap-1.5"><Users className="size-4" /> {car.seats}</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <p><span className="text-2xl font-bold text-foreground">{euro(car.pricePerDay)}</span><span className="text-sm text-muted-foreground">{t("car.perDay")}</span></p>
          <Link to={`/cars/${car.id}`}><Button size="sm">{t("car.viewDetails")}</Button></Link>
        </div>
      </div>
    </motion.div>
  );
}
