import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard, CalendarClock, CalendarDays, Car, Tags, FileText, CreditCard, Users, Bell, LogOut, Menu, X, Download, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../../context/AppContext";
import { ThemeToggle, LanguageSwitcher } from "../common/PrefsControls";
import { cn } from "../ui/utils";

const links = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/reservations", label: "Réservations", icon: CalendarClock },
  { to: "/admin/calendar", label: "Calendrier", icon: CalendarDays },
  { to: "/admin/cars", label: "Voitures", icon: Car },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
  { to: "/admin/contracts", label: "Contrats", icon: FileText },
  { to: "/admin/payments", label: "Paiements", icon: CreditCard },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/chat", label: "Chat", icon: MessageCircle },
  { to: "/admin/export", label: "Export données", icon: Download },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export function AdminLayout() {
  const { currentUser, notifications, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = currentUser ? notifications.filter((n) => n.userId === currentUser.id && !n.read).length : 0;

  const Sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64">
      <Link to="/admin/dashboard" className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <span className="size-9 rounded-xl bg-primary flex items-center justify-center"><Car className="size-5 text-white" /></span>
        <div>
          <span className="text-white font-bold">RentCar</span>
          <span className="block text-[11px] text-sidebar-foreground/60 -mt-0.5">Espace Admin</span>
        </div>
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-primary text-white shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
            )}>
            <Icon className="size-4.5 shrink-0" />
            <span className="flex-1">{label}</span>
            {to === "/admin/notifications" && unread > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="size-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            {currentUser?.firstName[0]}{currentUser?.lastName[0]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{currentUser?.firstName} {currentUser?.lastName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Administrateur</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }} className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors">
          <LogOut className="size-4.5" /> Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted flex">
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">{Sidebar}</aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div className="absolute left-0 top-0 h-full" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }}>{Sidebar}</motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-sidebar text-white h-14 flex items-center justify-between px-4">
          <button onClick={() => setOpen(true)} className="p-1"><Menu className="size-6" /></button>
          <span className="font-bold">RentCar Admin</span>
          <div className="flex items-center gap-1">
            <LanguageSwitcher onDark />
            <ThemeToggle onDark />
            <button onClick={() => navigate("/admin/notifications")} className="relative p-1">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute top-0 right-0 size-2 rounded-full bg-destructive" />}
            </button>
          </div>
        </header>
        <header className="hidden lg:flex sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border h-14 items-center justify-end gap-1 px-6">
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={() => navigate("/admin/notifications")} className="relative size-10 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">{unread}</span>}
          </button>
        </header>
        <main className="flex-1 p-5 sm:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
        <footer className="border-t border-border py-5">
          <p className="text-center text-sm text-muted-foreground">© 2026 RentCar — Espace administrateur. Tous droits réservés.</p>
        </footer>
      </div>
    </div>
  );
}
