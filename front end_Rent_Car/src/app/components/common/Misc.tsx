import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../ui/utils";

// ── Card ──────────────────────────────────────────────
export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl transition-all duration-200",
      hover && "hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5",
      className,
    )}>
      {children}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="size-16 rounded-2xl bg-accent text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-foreground">{title}</h3>
      {description && <p className="mt-1.5 text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}

export function CarCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

// ── PageTransition ────────────────────────────────────
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ── StatCard (dashboard) ──────────────────────────────
export function StatCard({ icon, label, value, tone = "default" }: {
  icon: ReactNode; label: string; value: string | number; tone?: "default" | "success" | "danger" | "warning" | "info" | "gold";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
    warning: "bg-amber-50 text-amber-600",
    info: "bg-blue-50 text-blue-600",
    gold: "bg-amber-50 text-amber-500",
  };
  return (
    <Card className="p-5" hover>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={cn("size-11 rounded-xl flex items-center justify-center", tones[tone])}>{icon}</div>
      </div>
    </Card>
  );
}
