import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Textarea } from "./Input";
import { StarRating } from "./StarRating";
import { useApp } from "../../context/AppContext";
import type { Reservation } from "../../data/types";

export function ReviewModal({ isOpen, onClose, reservation }: {
  isOpen: boolean; onClose: () => void; reservation: Reservation | null;
}) {
  const { currentUser, getCar, addReview, reviews } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!reservation) return null;
  const car = getCar(reservation.carId);
  const already = reviews.find((r) => String(r.reservationId) === String(reservation.id));

  const submit = async () => {
    if (rating === 0) { toast.error("Merci de sélectionner une note."); return; }
    setLoading(true);
    try {
      await addReview({ userId: currentUser!.id, carId: reservation.carId, reservationId: reservation.id, rating, comment });
      toast.success("Avis publié ! Merci ⭐");
      setRating(0); setComment("");
      onClose();
    } catch (err) {
      // Error submitting review
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Donner mon avis" size="md"
      footer={!already && <><Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button><Button onClick={submit} loading={loading}>Publier mon avis</Button></>}>
      {already ? (
        <div className="text-center py-4">
          <CheckCircle2 className="size-12 mx-auto text-emerald-500 mb-3" />
          <p className="text-foreground">Vous avez déjà donné votre avis pour cette réservation.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            Voiture : <span className="font-medium text-foreground">{car?.brand} {car?.model}</span>
          </div>
          <div>
            <p className="text-sm mb-2">Votre note</p>
            <StarRating value={rating} onChange={setRating} readOnly={false} size={32} />
          </div>
          <Textarea label="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec ce véhicule..." />
        </div>
      )}
    </Modal>
  );
}
