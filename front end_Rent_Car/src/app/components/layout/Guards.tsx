import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useApp } from "../../context/AppContext";

export function RequireAuth({ children, role }: { children: ReactNode; role?: "ADMIN" | "CLIENT" }) {
  const { currentUser } = useApp();
  const token = localStorage.getItem("token");

  if (!token || !currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
