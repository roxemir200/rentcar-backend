import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, CarFront, AlertCircle, RefreshCw } from "lucide-react";
import { CarCard } from "../../components/common/CarCard";
import { CarCardSkeleton, EmptyState, PageTransition } from "../../components/common/Misc";
import { Input, Select } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { usePrefs } from "../../context/PrefsContext";
import { cn } from "../../components/ui/utils";
import type { TranslationKey } from "../../i18n/translations";

const FUEL_KEYS: Record<string, TranslationKey> = {
  Essence: "fuel.Essence",
  Diesel: "fuel.Diesel",
  Hybride: "fuel.Hybride",
  "Électrique": "fuel.Électrique",
};

const TRANS_KEYS: Record<string, TranslationKey> = {
  Manuelle: "trans.Manuelle",
  Automatique: "trans.Automatique",
};

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  "SUV / Spacieux": "categ.SUV / Spacieux",
  "Berline / Confort": "categ.Berline / Confort",
  "ÉCONOMIQUE": "categ.ÉCONOMIQUE",
  "Économique": "categ.Economique",
  Citadine: "categ.Citadine",
  Utilitaire: "categ.Utilitaire",
  Luxe: "categ.Luxe",
  Cabriolet: "categ.Cabriolet",
  "Hybride / Electrique": "categ.Hybride / Electrique",
  "Hybride / Électrique": "categ.Hybride / Electrique",
  Familiale: "categ.Familiale",
  Sport: "categ.Sport",
  "Pick-up": "categ.Pickup",
  "Pickup": "categ.Pickup",
  Autre: "categ.Autre",
};

export function trCategory(t: (k: TranslationKey) => string, raw: string): string {
  const k = CATEGORY_KEYS[raw];
  return k ? t(k) : raw;
}
export function trFuel(t: (k: TranslationKey) => string, raw: string): string {
  const k = FUEL_KEYS[raw];
  return k ? t(k) : raw;
}
export function trTransmission(t: (k: TranslationKey) => string, raw: string): string {
  const k = TRANS_KEYS[raw];
  return k ? t(k) : raw;
}

export default function CarsList() {
  const { cars, categories, carsLoading, carsError, loadCars, getCarRating, showWelcomeToast } = useApp();
  const { t } = usePrefs();
  const [params, setParams] = useSearchParams();
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "");

  const fuelOptions = useMemo(() => ([
    { value: "", label: t("cars.fuelLabel") },
    { value: "Essence", label: t("fuel.Essence") },
    { value: "Diesel", label: t("fuel.Diesel") },
    { value: "Hybride", label: t("fuel.Hybride") },
    { value: "Électrique", label: t("fuel.Électrique") },
  ]), [t]);

  const transmissionOptions = useMemo(() => ([
    { value: "", label: t("cars.transmissionLabel") },
    { value: "Manuelle", label: t("trans.Manuelle") },
    { value: "Automatique", label: t("trans.Automatique") },
  ]), [t]);

  useEffect(() => {
    showWelcomeToast();
  }, [showWelcomeToast]);

  const filtered = useMemo(
    () =>
      cars.filter((c) => {
        if (brand && !`${c.brand} ${c.model}`.toLowerCase().includes(brand.toLowerCase())) return false;
        if (fuel && c.fuel !== fuel) return false;
        if (transmission && c.transmission !== transmission) return false;
        if (minPrice && c.pricePerDay < Number(minPrice)) return false;
        if (maxPrice && c.pricePerDay > Number(maxPrice)) return false;
        if (category && c.category !== category) return false;
        return true;
      }),
    [cars, brand, fuel, transmission, minPrice, maxPrice, category]
  );

  const selectCat = (cat: string) => {
    const next = category === cat ? "" : cat;
    setCategory(next);
    if (next) setParams({ category: next });
    else setParams({});
  };

  const resetFilters = () => {
    setBrand("");
    setFuel("");
    setTransmission("");
    setMinPrice("");
    setMaxPrice("");
    setCategory("");
    setParams({});
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-5">
          <h1 className="text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {t("cars.pageTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("cars.pageSubtitle")}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <Input
                placeholder={t("cars.searchPlaceholder")}
                leftIcon={<Search className="size-4.5" />}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
            <Select
              value={fuel}
              onChange={(e) => setFuel((e.target as HTMLSelectElement).value)}
              options={fuelOptions}
            />
            <Select
              value={transmission}
              onChange={(e) => setTransmission((e.target as HTMLSelectElement).value)}
              options={transmissionOptions}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder={t("cars.minPrice")}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t("cars.maxPrice")}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="size-4" /> {t("cars.categories")}
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCat(cat.name)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  category === cat.name
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
                )}
              >
                {trCategory(t, cat.name)}
              </button>
            ))}
            {(brand || fuel || transmission || minPrice || maxPrice || category) && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                {t("cars.resetFilters")}
              </Button>
            )}
          </div>
        </div>

        {carsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : carsError ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <AlertCircle className="size-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-foreground mb-4">{carsError}</p>
            <Button onClick={loadCars} variant="outline">
              <RefreshCw className="size-4 mr-2" /> {t("action.today") === t("action.today") ? "Réessayer" : "Retry"}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl">
            <EmptyState
              icon={<CarFront className="size-8" />}
              title={t("cars.noResult")}
              description={t("cars.tryBroaden")}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length === 1
                ? t("cars.foundCount_one", { count: 1 } as never)
                : t("cars.foundCount_other", { count: filtered.length } as never)}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  rating={getCarRating(car.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}