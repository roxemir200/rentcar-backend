import { useEffect } from "react";
import { CarRecommender } from "../../components/common/CarRecommender";
import { PageTransition, CarCardSkeleton } from "../../components/common/Misc";
import { useApp } from "../../context/AppContext";

export default function Recommendations() {
  const { cars, carsLoading, showWelcomeToast } = useApp();

  useEffect(() => {
    showWelcomeToast();
  }, [showWelcomeToast]);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {carsLoading ? (
          <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm p-6 md:p-8 space-y-6 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="size-12 rounded-2xl bg-slate-200 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-7 w-56 bg-slate-200 rounded-lg" />
                <div className="h-4 w-full max-w-xl bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-slate-200 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CarCardSkeleton key={i} />
              ))}
            </div>
          </section>
        ) : (
          <CarRecommender cars={cars} />
        )}
      </div>
    </PageTransition>
  );
}
