import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { PageHeader, Table, Td } from "../../components/common/AdminTable";
import { Button } from "../../components/common/Button";
import { Input, Textarea } from "../../components/common/Input";
import { Modal, ConfirmModal } from "../../components/common/Modal";
import { EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/format";
import type { Category } from "../../data/types";

type FormValues = {
  name: string;
  description: string;
};

export default function AdminCategories() {
  const { categories, saveCategory, deleteCategory } = useApp();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <PageTransition>
      <PageHeader
        title="Gestion des catégories"
        subtitle={`${categories.length} catégories`}
        action={
          <Button onClick={() => setEditing({ id: "", name: "", description: "", createdAt: "" })}>
            <Plus className="size-4" /> Ajouter une catégorie
          </Button>
        }
      />

      {categories.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState icon={<Tags className="size-8" />} title="Aucune catégorie" />
        </div>
      ) : (
        <Table head={["ID", "Nom", "Description", "Date", "Actions"]}>
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-muted/40">
              <Td className="font-mono text-xs">{c.id}</Td>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-muted-foreground max-w-md">{c.description}</Td>
              <Td className="text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</Td>
              <Td>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-red-50"
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {editing && (
        <CategoryModal
          cat={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            try {
              await saveCategory(c);
              setEditing(null);
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
              await deleteCategory(deleteId);
            } finally {
              setDeleteId(null);
            }
          }
        }}
        title="Supprimer la catégorie"
        message="Êtes-vous sûr de vouloir supprimer cette catégorie ?"
        confirmLabel="Supprimer"
        danger
      />
    </PageTransition>
  );
}

function CategoryModal({
  cat,
  onClose,
  onSave,
}: {
  cat: Category;
  onClose: () => void;
  onSave: (c: Category) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: cat.name || "",
      description: cat.description || "",
    },
    mode: "onTouched", // ✅ validation quand l'utilisateur quitte le champ
  });

  const onSubmit = async (data: FormValues) => {
    const updated: Category = {
      ...cat,
      name: data.name.trim(),
      description: data.description.trim(),
    };
    await onSave(updated);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={cat.id ? "Modifier la catégorie" : "Ajouter une catégorie"}
      size="md"
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
        <div>
          <Input
            label="Nom"
            {...register("name", {
              required: "Le nom de la catégorie est obligatoire",
              validate: (value) => value.trim() !== "" || "Le nom ne peut pas être vide",
            })}
            placeholder="Ex : Cabriolet"
            error={errors.name?.message}
            onBlur={() => trigger("name")} // ✅ validation quand l'utilisateur quitte le champ
          />
         
        </div>

        <div>
          <Textarea
            label="Description"
            {...register("description")}
            placeholder="Description de la catégorie..."
          />
        </div>
      </form>
    </Modal>
  );
}