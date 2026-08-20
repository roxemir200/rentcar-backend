import { Link } from "react-router";
import { Search, ShieldCheck, Zap, MapPin, ArrowRight, Check, Car as CarIcon } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Button } from "../../components/common/Button";
import { CarCard } from "../../components/common/CarCard";
import { PageTransition } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";
import { usePublicStats } from "../../hooks/usePublicStats";

// Fallback image quand AUCUNE image n'est disponible (ni voiture, ni category stock)
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop&auto=format";

// Images de secours par catégorie, si la première voiture de la catégorie n'a pas d'image
const fallbackImages: Record<string, string> = {
  "Économique": "https://images.unsplash.com/photo-1471479917193-f00955256257?w=600&h=400&fit=crop&auto=format",
  "Berline": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop&auto=format",
  "SUV": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop&auto=format",
  "Luxe": "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop&auto=format",
};

/** L'enseigne ne compte qu'une agence : ce n'est pas une donnée, c'est un fait. */
const AGENCY_COUNT = 1;

export default function Home() {
  const { cars, categories, currentUser, getCarRating } = useApp();
  const featured = cars.filter((c) => c.status === "AVAILABLE").slice(0, 3);
  const { stats } = usePublicStats();

  /**
   * Vignettes du bandeau d'accueil.
   *
   * Elles annonçaient « 500+ véhicules », « 25 agences » et « 4.8★ » — trois
   * chiffres inventés, dont deux faux par nature : le catalogue en compte
   * quelques dizaines et l'enseigne n'a qu'une agence.
   *
   * La satisfaction disparaît tant qu'aucun avis n'a été publié : afficher
   * « 0★ » se lirait comme un mécontentement général, alors que personne ne
   * s'est encore prononcé.
   */
  const heroStats = [
    ...(stats ? [{ value: String(stats.vehicles), label: stats.vehicles > 1 ? "Véhicules" : "Véhicule" }] : []),
    { value: String(AGENCY_COUNT), label: "Agence" },
    ...(stats?.averageRating != null
      ? [{ value: `${stats.averageRating.toFixed(1)}★`, label: "Satisfaction" }]
      : []),
  ];

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
          {/* Disposition en flex et non en grille fixe : le nombre de vignettes
              varie selon ce que la base contient reellement. */}
          {stats && (
            <div className="mt-12 flex flex-wrap items-start justify-center gap-x-12 gap-y-6">
              {heroStats.map(({ value, label }) => (
                <div key={label} className="text-center"><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm text-white/70">{label}</p></div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-5">
        {[
          { icon: Zap, title: "Réservation instantanée", desc: "Confirmez votre location en moins de 2 minutes, 24h/24." },
          { icon: ShieldCheck, title: "Assurance incluse", desc: "Tous nos véhicules sont couverts en tous risques." },
          { icon: MapPin, title: "Partout en Tunisie", desc: "25 agences pour récupérer votre voiture près de chez vous." },
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
          {categories.map((category) => {
            // 1. Trouver la PREMIÈRE voiture de cette catégorie (indépendamment du statut)
            //    - D'abord match robuste sur categoryId (id chaîne vs chaîne)
            //    - Puis fallback sur nom identique (case sensitive)
            const firstCar =
              cars.find((c) => {
                const matchById = String(c.categoryId) === String(category.id);
                const matchByName = !matchById && c.category && category.name && c.category === category.name;
                return matchById || matchByName;
              }) ?? null;

            // 2. Image source : 1ère image de la voiture > fallback catégorie > FALLBACK_IMG
            const carImg = (firstCar?.images && firstCar.images[0]) || null;
            const imgSrc: string =
              carImg || fallbackImages[String(category.name)] || FALLBACK_IMG;

            return (
              <Link key={category.id} to={`/cars?category=${encodeURIComponent(String(category.name))}`} className="group relative h-40 rounded-2xl overflow-hidden">
                <ImageWithFallback src={imgSrc} alt={String(category.name)} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <span className="absolute bottom-4 left-4 text-white font-semibold text-lg">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Inscription : invité non connecté uniquement */}
      {!currentUser && (
        <section className="max-w-7xl mx-auto px-6 py-14">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-blue-400/10 blur-2xl" aria-hidden />
            <div className="relative grid md:grid-cols-2 gap-10 items-center px-8 py-12 sm:px-12 sm:py-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
                  <CarIcon className="size-4" />
                  Locations premium
                </div>
                <h2 className="mt-5 text-foreground font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.15 }}>
                  🚗 Prêt à réserver votre voiture idéale&nbsp;?
                </h2>
                <p className="mt-4 text-muted-foreground" style={{ fontSize: "1rem", lineHeight: 1.65 }}>
                  Pour réserver une voiture, accéder à toutes les fonctionnalités et profiter de nos offres exclusives, créez votre compte en quelques secondes.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Consultez toutes les voitures disponibles",
                    "Réservez en ligne en quelques clics",
                    "Suivez vos locations en temps réel",
                    "Paiement 100% sécurisé",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-3.5" />
                      </span>
                      <span className="text-foreground/90 text-sm sm:text-base">
                        ✅ {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link to="/register">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                      Créer mon compte
                      <ArrowRight className="size-4.5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      Se connecter
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&h=700&fit=crop&auto=format"
                  alt="Famille heureuse partant en voyage"
                  className="rounded-2xl border border-border object-cover h-full max-h-[420px] w-full shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>
      )}

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
