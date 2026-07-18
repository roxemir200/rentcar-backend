import { Link } from "react-router";
import { Search, ShieldCheck, Zap, MapPin, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Button } from "../../components/common/Button";
import { CarCard } from "../../components/common/CarCard";
import { PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";

const categories = [
  { name: "Économique", img: "https://images.unsplash.com/photo-1471479917193-f00955256257?w=600&h=400&fit=crop&auto=format" },
  { name: "Berline", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop&auto=format" },
  { name: "SUV", img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop&auto=format" },
  { name: "Luxe", img: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop&auto=format" },
];

export default function Home() {
  const { cars, getCarRating } = useApp();
  const featured = cars.filter((c) => c.status === "AVAILABLE").slice(0, 3);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary">
        <ImageWithFallback src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&h=900&fit=crop&auto=format"
          alt="Route panoramique" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-blue-900/90" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-28 text-center text-white">
          <h1 className="text-white font-bold" style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", lineHeight: 1.1 }}>
            Votre prochaine voiture,<br />à portée de clic.
          </h1>
          <p className="mt-5 text-white/80 max-w-2xl mx-auto" style={{ fontSize: "1.125rem" }}>
            Louez parmi une flotte premium de véhicules soigneusement entretenus. Réservation instantanée, prix transparents, liberté totale.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/cars"><Button size="lg" className="bg-white text-primary hover:bg-white/90"><Search className="size-5" /> Voir les voitures</Button></Link>
            <Link to="/register"><Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">Créer un compte</Button></Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[["500+", "Véhicules"], ["25", "Agences"], ["4.8★", "Satisfaction"]].map(([n, l]) => (
              <div key={l}><p className="text-2xl font-bold text-white">{n}</p><p className="text-sm text-white/70">{l}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-5">
        {[
          { icon: Zap, title: "Réservation instantanée", desc: "Confirmez votre location en moins de 2 minutes, 24h/24." },
          { icon: ShieldCheck, title: "Assurance incluse", desc: "Tous nos véhicules sont couverts en tous risques." },
          { icon: MapPin, title: "Partout en France", desc: "25 agences pour récupérer votre voiture près de chez vous." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-card border border-border rounded-2xl p-6">
            <span className="size-11 rounded-xl bg-accent text-primary flex items-center justify-center"><Icon className="size-5.5" /></span>
            <h3 className="mt-4 text-foreground">{title}</h3>
            <p className="mt-1.5 text-muted-foreground text-sm">{desc}</p>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <h2 className="text-foreground">Explorez par catégorie</h2>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((c) => (
            <Link key={c.name} to={`/cars?category=${encodeURIComponent(c.name)}`} className="group relative h-40 rounded-2xl overflow-hidden">
              <ImageWithFallback src={c.img} alt={c.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <span className="absolute bottom-4 left-4 text-white font-semibold text-lg">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured cars */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground">Véhicules à la une</h2>
          <Link to="/cars" className="text-primary font-medium hover:underline flex items-center gap-1">Tout voir <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((car) => <CarCard key={car.id} car={car} rating={getCarRating(car.id)} />)}
        </div>
      </section>
    </PageTransition>
  );
}
