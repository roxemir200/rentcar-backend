import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { Plus, Pencil, Trash2, Search, CarFront, Upload, X, Star as StarIcon } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Input, Select, Textarea } from "../../components/common/Input";
import { Modal, ConfirmModal } from "../../components/common/Modal";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { euro } from "../../lib/format";
import type { Car, CarStatus, FuelType, Transmission } from "../../data/types";

// ----------------------------------------------------------------------
// Types locaux
// ----------------------------------------------------------------------
type CarFormValues = {
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  color: string;
  mileage: number;
  seats: number;
  fuelType: string;
  transmission: string;
  dailyRate: number;
  categoryId: string;
  description: string;
  images: string[];
};

const backendFuelOptions = [
  { value: "GASOLINE", label: "Essence" },
  { value: "DIESEL", label: "Diesel" },
  { value: "HYBRID", label: "Hybride" },
  { value: "ELECTRIC", label: "Électrique" },
];

const backendTransmissionOptions = [
  { value: "MANUAL", label: "Manuelle" },
  { value: "AUTOMATIC", label: "Automatique" },
];

const statusBadge: Record<CarStatus, { variant: "success" | "warning" | "error"; label: string }> = {
  AVAILABLE: { variant: "success", label: "Disponible" },
  RESERVED: { variant: "warning", label: "Réservée" },
  RENTED: { variant: "error", label: "Louée" },
};

const fuelMap: Record<string, FuelType> = {
  GASOLINE: "Essence",
  DIESEL: "Diesel",
  HYBRID: "Hybride",
  ELECTRIC: "Électrique",
};
const transmissionMap: Record<string, Transmission> = {
  MANUAL: "Manuelle",
  AUTOMATIC: "Automatique",
};

// ----------------------------------------------------------------------
// Composant principal
// ----------------------------------------------------------------------
export default function AdminCars() {
  const { cars, categories, saveCar, deleteCar } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = cars.filter((c) => {
    const term = `${c.brand} ${c.model} ${c.plate}`.toLowerCase();
    return term.includes(query.toLowerCase()) && (!statusFilter || c.status === statusFilter);
  });

  const blankCar: Car = {
    id: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    category: "",
    categoryId: "",
    plate: "",
    color: "",
    mileage: 0,
    seats: 5,
    fuel: "Essence",
    transmission: "Automatique",
    pricePerDay: 0,
    status: "AVAILABLE",
    description: "",
    images: [],
  };

  const openEdit = (car: Car) => setEditingCar(car);
  const closeEdit = () => setEditingCar(null);

  return (
    <PageTransition>
      <PageHeader
        title="Gestion des voitures"
        subtitle={`${cars.length} véhicule(s)`}
        action={
          <Button onClick={() => openEdit(blankCar)}>
            <Plus className="size-4" /> Ajouter une voiture
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Rechercher..."
            leftIcon={<Search className="size-4.5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Tous les statuts"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
            options={[
              { value: "", label: "Tous" },
              { value: "AVAILABLE", label: "Disponible" },
              { value: "RESERVED", label: "Réservée" },
              { value: "RENTED", label: "Louée" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState icon={<CarFront className="size-8" />} title="Aucune voiture" />
        </div>
      ) : (
        <Table head={["Photo", "Véhicule", "Immatriculation", "Catégorie", "Prix/jour", "Statut", "Actions"]}>
          {filtered.map((car) => (
            <tr key={car.id} className="hover:bg-muted/40">
              <Td>
                <div className="h-11 w-16 rounded-lg overflow-hidden bg-slate-100">
                  <ImageWithFallback src={car.images?.[0]} alt="" className="size-full object-cover" />
                </div>
              </Td>
              <Td className="font-medium">
                {car.brand} {car.model} <span className="text-muted-foreground font-normal">{car.year}</span>
              </Td>
              <Td className="font-mono text-xs">{car.plate}</Td>
              <Td>
                <Badge variant="info" size="sm">{car.category}</Badge>
              </Td>
              <Td className="font-semibold">{euro(car.pricePerDay)}</Td>
              <Td>
                <Badge variant={statusBadge[car.status].variant} size="sm" dot>
                  {statusBadge[car.status].label}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(car)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-red-50"
                    onClick={() => setDeleteId(car.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {editingCar && (
        <CarModal
          car={editingCar}
          categories={categories}
          onClose={closeEdit}
          onSave={async (car) => {
            try {
              await saveCar(car);
              closeEdit();
            } catch {
              // déjà toasté
            }
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteCar(deleteId);
            } finally {
              setDeleteId(null);
            }
          }
        }}
        title="Supprimer la voiture"
        message="Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
      />
    </PageTransition>
  );
}

// ----------------------------------------------------------------------
// Modale formulaire
// ----------------------------------------------------------------------
function CarModal({
  car,
  categories,
  onClose,
  onSave,
}: {
  car: Car;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (car: Car) => Promise<void>;
}) {
  const defaultValues: CarFormValues = {
    brand: car.brand || "",
    model: car.model || "",
    year: car.year || new Date().getFullYear(),
    registrationNumber: car.plate || "",
    color: car.color || "",
    mileage: car.mileage || 0,
    seats: car.seats || 5,
    fuelType: car.fuel === "Essence" ? "GASOLINE" : car.fuel === "Diesel" ? "DIESEL" : car.fuel === "Hybride" ? "HYBRID" : car.fuel === "Électrique" ? "ELECTRIC" : "GASOLINE",
    transmission: car.transmission === "Manuelle" ? "MANUAL" : "AUTOMATIC",
    dailyRate: car.pricePerDay || 0,
    categoryId: car.categoryId || "",
    description: car.description || "",
    images: car.images || [],
  };

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CarFormValues>({
    defaultValues,
    mode: "onTouched", // ✅ validation quand l'utilisateur quitte le champ
  });

  const [imgError, setImgError] = useState("");

  const onSubmit = async (data: CarFormValues) => {
    if (!data.images?.length) {
      setImgError("Une image principale est obligatoire.");
      return;
    }

    const updatedCar: Car = {
      ...car,
      brand: data.brand,
      model: data.model,
      year: data.year,
      plate: data.registrationNumber,
      color: data.color,
      mileage: data.mileage,
      seats: data.seats,
      fuel: fuelMap[data.fuelType] || "Essence",
      transmission: transmissionMap[data.transmission] || "Automatique",
      pricePerDay: data.dailyRate,
      categoryId: data.categoryId,
      category: categories.find((c) => c.id === data.categoryId)?.name || car.category,
      description: data.description,
      images: data.images,
    };

    await onSave(updatedCar);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={car.id ? "Modifier la voiture" : "Ajouter une voiture"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input label="Marque *" {...register("brand", { required: "La marque est obligatoire" })} placeholder="Renault" error={errors.brand?.message} onBlur={() => trigger("brand")} />
          </div>
          <div>
            <Input label="Modèle *" {...register("model", { required: "Le modèle est obligatoire" })} placeholder="Clio" error={errors.model?.message} onBlur={() => trigger("model")} />
          </div>
          <Input label="Année" type="number" {...register("year")} />
          <div>
            <Input label="Immatriculation *" {...register("registrationNumber", { required: "Le numéro d'immatriculation est obligatoire" })} placeholder="AB-123-CD" error={errors.registrationNumber?.message} onBlur={() => trigger("registrationNumber")} />
          </div>
          <Input label="Couleur" {...register("color")} placeholder="Blanc" />
          <div>
            <Input label="Kilométrage *" type="number" {...register("mileage", { required: "Le kilométrage est obligatoire", min: { value: 0, message: "Doit être positif" } })} error={errors.mileage?.message} onBlur={() => trigger("mileage")} />
          </div>
          <div>
            <Input label="Places *" type="number" {...register("seats", { required: "Le nombre de places est obligatoire", min: { value: 1, message: "Doit être positif" } })} error={errors.seats?.message} onBlur={() => trigger("seats")} />
          </div>
          <div>
            <Input label="Prix / jour (DT) *" type="number" {...register("dailyRate", { required: "Le tarif journalier est obligatoire", min: { value: 0.01, message: "Doit être positif" } })} error={errors.dailyRate?.message} onBlur={() => trigger("dailyRate")} />
          </div>
          <div>
            <Select label="Carburant *" {...register("fuelType", { required: "Le type de carburant est obligatoire" })} options={backendFuelOptions} error={errors.fuelType?.message} onBlur={() => trigger("fuelType")} />
          </div>
          <div>
            <Select label="Transmission *" {...register("transmission", { required: "Le type de transmission est obligatoire" })} options={backendTransmissionOptions} error={errors.transmission?.message} onBlur={() => trigger("transmission")} />
          </div>
       <div>
  <Select
  label="Catégorie *"
  {...register("categoryId", { required: "La catégorie est obligatoire" })}
  options={[
    { value: "", label: "Choisir une catégorie" },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ]}
  error={errors.categoryId?.message}
  onBlur={() => trigger("categoryId")}
/>
</div>
        </div>

        <Controller
          name="images"
          control={control}
          render={({ field: { value, onChange } }) => (
            <ImageUploader
              images={value}
              onChange={onChange}
              error={imgError}
              onClearError={() => setImgError("")}
            />
          )}
        />

        <Textarea label="Description" {...register("description")} placeholder="Description de la voiture..." />
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// Upload d'images depuis l'ordinateur (converties en data URL). La 1ère image est l'image principale.
// Le upload vers le serveur est fait dans AppContext.tsx (saveCar).
// ----------------------------------------------------------------------
function ImageUploader({ images, onChange, error, onClearError }: { images: string[]; onChange: (imgs: string[]) => void; error?: string; onClearError?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const readFiles = (files: FileList | null) => {
    if (!files) return;
    Promise.all(Array.from(files).map((file) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }))).then((urls) => {
      onChange([...images, ...urls]);
      onClearError?.();
    });
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const makeMain = (i: number) => { const next = [...images]; const [x] = next.splice(i, 1); onChange([x, ...next]); };

  return (
    <div>
      <label className="block mb-1.5 text-sm text-foreground">
        Images de la voiture <span className="text-destructive">*</span>
        <span className="text-muted-foreground font-normal"> — 1 image principale obligatoire + images secondaires optionnelles</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={i} className="relative size-24 rounded-xl overflow-hidden border border-border group bg-slate-100">
            <ImageWithFallback src={src} alt={`image ${i + 1}`} className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-medium flex items-center gap-0.5"><StarIcon className="size-2.5" fill="currentColor" /> Principale</span>
            ) : (
              <button type="button" onClick={() => makeMain(i)} className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Définir principale</button>
            )}
            <button type="button" onClick={() => removeAt(i)} className="absolute top-1 right-1 size-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-destructive"><X className="size-3" /></button>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()}
          className="size-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Upload className="size-5" />
          <span className="text-[11px]">Ajouter une image</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { readFiles(e.target.files); e.target.value = ""; }} />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}