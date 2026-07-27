import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, CarFront, AlertCircle, RefreshCw } from "lucide-react";
import { CarCard } from "../../components/common/CarCard";
import { CarCardSkeleton, EmptyState, PageTransition } from "../../components/common/Misc";
import { Input, Select } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useApp } from "../../context/AppContext";
import { cn } from "../../components/ui/utils";

const fuelOptions = [
  { value: "", label: "Carburant" },
  { value: "Essence", label: "Essence" },
  { value: "Diesel", label: "Diesel" },
  { value: "Hybride", label: "Hybride" },
  { value: "Électrique", label: "Électrique" },
];

const transmissionOptions = [
  { value: "", label: "Transmission" },
  { value: "Manuelle", label: "Manuelle" },
  { value: "Automatique", label: "Automatique" },
];

export default function CarsList() {
  const { cars, categories, carsLoading, carsError, loadCars, getCarRating, showWelcomeToast } = useApp();
  const [params, setParams] = useSearchParams();
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "");

  useEffect(() => {
    showWelcomeToast();
  }, [showWelcomeToast]);

  // Filtrage sur les propriétés front du Car
  const filtered = useMemo(
    () =>
      cars.filter((c) => {
        if (brand && !`${c.brand} ${c.model}`.toLowerCase().includes(brand.toLowerCase())) return false;
        // Utilise la version backend du type carburant (c.fuel) mappée si nécessaire
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

  // Réinitialiser les filtres
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
        <div className="mb-6">
          <h1 className="text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            Nos voitures disponibles
          </h1>
          <p className="mt-1 text-muted-foreground">
            Trouvez le véhicule idéal parmi notre flotte premium.
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <Input
                placeholder="Marque ou modèle..."
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
                placeholder="Prix min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Prix max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Catégories depuis l'API */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="size-4" /> Catégories :
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
                {cat.name}
              </button>
            ))}
            {(brand || fuel || transmission || minPrice || maxPrice || category) && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Affichage conditionnel */}
        {carsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : carsError ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <AlertCircle className="size-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Erreur lors du chargement des voitures
            </p>
            <p className="text-muted-foreground mb-4">{carsError}</p>
            <Button onClick={loadCars} variant="outline">
              <RefreshCw className="size-4 mr-2" /> Réessayer
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl">
            <EmptyState
              icon={<CarFront className="size-8" />}
              title="Aucune voiture trouvée"
              description="Essayez d'ajuster vos filtres de recherche."
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} véhicule{filtered.length > 1 ? "s" : ""} trouvé
              {filtered.length > 1 ? "s" : ""}
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