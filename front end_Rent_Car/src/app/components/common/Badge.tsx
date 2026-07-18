import type { ReactNode } from "react";
import { cn } from "../ui/utils";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "gold";

const variants: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  gold: "bg-amber-50 text-amber-600 border-amber-200",
};

export function Badge({
  children, variant = "neutral", size = "md", className, dot,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        variants[variant],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", {
        success: "bg-emerald-500", warning: "bg-amber-500", error: "bg-red-500",
        info: "bg-blue-500", neutral: "bg-slate-400", gold: "bg-amber-500",
      }[variant])} />}
      {children}
    </span>
  );
}

// Status → badge mapping helpers for domain enums
import type { ReservationStatus, ContractStatus, PaymentStatus } from "../../data/types";

const reservationMap: Record<ReservationStatus, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: "warning", label: "En attente" },
  CONFIRMED: { variant: "info", label: "Confirmée" },
  IN_PROGRESS: { variant: "success", label: "En cours" },
  COMPLETED: { variant: "neutral", label: "Terminée" },
  CANCELLED: { variant: "error", label: "Annulée" },
};

export function ReservationBadge({ status }: { status: ReservationStatus }) {
  const { variant, label } = reservationMap[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

const contractMap: Record<ContractStatus, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: "neutral", label: "Brouillon" },
  SIGNED: { variant: "success", label: "Signé" },
  CANCELLED: { variant: "error", label: "Annulé" },
};

export function ContractBadge({ status }: { status: ContractStatus }) {
  const { variant, label } = contractMap[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

const paymentMap: Record<PaymentStatus, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: "warning", label: "En attente" },
  COMPLETED: { variant: "success", label: "Payé" },
  FAILED: { variant: "error", label: "Échoué" },
  REFUNDED: { variant: "neutral", label: "Remboursé" },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { variant, label } = paymentMap[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}
