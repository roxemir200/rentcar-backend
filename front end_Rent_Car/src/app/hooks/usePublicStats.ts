import { useEffect, useState } from "react";
import { statsAPI } from "../api/stats.api";

export type PublicStats = {
  vehicles: number;
  clients: number;
  reviews: number;
  /** Note moyenne sur 5. `null` tant qu'aucun avis n'a été publié. */
  averageRating: number | null;
};

/**
 * Charge les chiffres réels affichés aux visiteurs.
 *
 * Ces valeurs étaient écrites en dur dans les pages — « 500+ véhicules »,
 * « 25 agences », « 4.8★ », « Plus de 10 000 clients satisfaits » — et ne
 * correspondaient à rien de ce que contenait la base.
 *
 * En cas d'échec réseau, `stats` reste `null` : les pages concernées masquent
 * alors les vignettes plutôt que d'afficher un chiffre inventé ou un zéro
 * trompeur.
 */
export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    statsAPI
      .getPublic()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.value || res.data;
        if (data) setStats(data as PublicStats);
      })
      .catch(() => {
        /* Chiffres indisponibles : les pages s'affichent sans eux. */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}
