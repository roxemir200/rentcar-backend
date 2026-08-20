import type { ReactNode } from "react";
import { Link } from "react-router";
import { Car, ShieldCheck, Clock, Star } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { usePublicStats } from "../../hooks/usePublicStats";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { stats } = usePublicStats();

  /**
   * Argument de confiance, tire du nombre reel de comptes clients.
   *
   * La page annoncait « Plus de 10 000 clients satisfaits » a une base qui en
   * comptait une poignee. Tant que le chiffre n'est pas connu -- ou qu'aucun
   * client n'est encore inscrit -- on promet le service plutot qu'une
   * audience, sans jamais avancer de nombre invente.
   */
  const clientsLine =
    stats && stats.clients > 0
      ? stats.clients > 1
        ? `${stats.clients} clients nous font déjà confiance`
        : "1 client nous fait déjà confiance"
      : "Un accompagnement personnalisé à chaque location";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-primary">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&h=1600&fit=crop&auto=format"
          alt="Voiture de sport élégante"
          className="absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-blue-900/90" />
        <Link to="/" className="relative flex items-center gap-2 text-white">
          <span className="size-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><Car className="size-5" /></span>
          <span className="text-xl font-bold">RentCar</span>
        </Link>
        <div className="relative text-white">
          <h2 className="text-white text-3xl font-bold leading-tight" style={{ fontSize: "2rem" }}>Roulez en toute liberté.</h2>
          <p className="mt-3 text-white/80 max-w-md">Louez la voiture parfaite en quelques clics. Une flotte premium, un service impeccable, disponible partout en France.</p>
          <div className="mt-8 space-y-4">
            {[
              { icon: ShieldCheck, text: "Assurance tous risques incluse" },
              { icon: Clock, text: "Réservation instantanée 24h/24" },
              { icon: Star, text: clientsLine },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="size-9 rounded-lg bg-white/15 flex items-center justify-center"><Icon className="size-4.5" /></span>
                <span className="text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-white/50 text-sm">© 2026 RentCar</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="size-9 rounded-xl bg-primary text-white flex items-center justify-center"><Car className="size-5" /></span>
            <span className="text-lg font-bold">RentCar</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontSize: "1.75rem" }}>{title}</h1>
          <p className="mt-1.5 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
