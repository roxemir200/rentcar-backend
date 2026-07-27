import { Link } from "react-router";
import { Star } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { StarRating } from "../../components/common/StarRating";
import { Button } from "../../components/common/Button";
import { Card, EmptyState, PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../lib/format";

export default function MyReviews() {
  const { reviews, getCar } = useApp();
  const mine = reviews.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-foreground mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Mes avis</h1>
        <p className="text-muted-foreground mb-6">Retrouvez tous les avis que vous avez publiés.</p>

        {mine.length === 0 ? (
          <Card><EmptyState icon={<Star className="size-8" />} title="Vous n'avez pas encore donné d'avis"
            description="Terminez une location pour partager votre expérience avec la communauté."
            action={<Link to="/my-reservations"><Button>Voir mes réservations</Button></Link>} /></Card>
        ) : (
          <div className="space-y-3">
            {mine.map((rev) => {
              const car = getCar(rev.carId);
              return (
                <Card key={rev.id} className="p-4 flex gap-4" hover>
                  <div className="h-20 w-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">{car && <ImageWithFallback src={car.images[0]} alt="" className="size-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{car?.brand} {car?.model}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(rev.date)}</span>
                    </div>
                    <div className="mt-1"><StarRating value={rev.rating} size={15} /></div>
                    {rev.comment && <p className="mt-1.5 text-sm text-foreground/80">{rev.comment}</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
