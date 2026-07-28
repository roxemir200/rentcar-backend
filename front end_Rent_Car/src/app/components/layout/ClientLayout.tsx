import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router";
import { Car, Bell, Menu, X, LogOut, Calendar, Star, LayoutDashboard, CreditCard, MapPin, Mail, Phone, Facebook, Instagram, Twitter, User, FileText, KeyRound, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../../context/AppContext";
import { usePrefs } from "../../context/PrefsContext";
import { ThemeToggle, LanguageSwitcher } from "../common/PrefsControls";
import { SupportChat } from "../common/SupportChat";
import { cn } from "../ui/utils";
import type { TranslationKey } from "../../i18n/translations";

const navItems: { to: string; key: TranslationKey; end?: boolean; auth?: boolean; icon?: React.ComponentType<{ className?: string }> }[] = [
  { to: "/", key: "nav.home", end: true },
  { to: "/cars", key: "nav.cars" },
  { to: "/recommendations", key: "nav.recommendations", icon: Sparkles },
  { to: "/my-reservations", key: "nav.reservations", auth: true },
  { to: "/payments", key: "nav.payments", auth: true },
  { to: "/my-reviews", key: "nav.reviews", auth: true },
];

export function ClientLayout() {
  const { currentUser, notifications, logout } = useApp();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const unread = currentUser ? notifications.filter((n) => n.userId === currentUser.id && !n.read).length : 0;

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Car className="size-5" />
            </span>
            <span className="text-lg font-bold text-foreground">RentCar</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter((i) => !i.auth || currentUser).map((item) => {
              const Icon = item.icon;
              const pathIsActive = item.end
                ? location.pathname === "/"
                : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5",
                    pathIsActive ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {Icon && <Icon className="size-4" />}
                  {t(item.key)}
                </button>
              );
            })}
            {currentUser?.role === "ADMIN" && (
              <NavLink to="/admin/dashboard" className="px-3.5 py-2 rounded-lg text-sm font-medium text-primary hover:bg-accent flex items-center gap-1.5">
                <LayoutDashboard className="size-4" /> {t("nav.admin")}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            {currentUser ? (
              <>
                <button onClick={() => navigate("/notifications")} className="relative size-10 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
                  <motion.span animate={unread > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}>
                    <Bell className="size-5" />
                  </motion.span>
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center animate-pulse">
                      {unread}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button onClick={() => setAvatarOpen((o) => !o)} className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:brightness-110 transition-all">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                  </button>
                  <AnimatePresence>
                    {avatarOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-xl border border-border py-2 z-20">
                          <div className="px-4 py-2 border-b border-border">
                            <p className="text-sm font-medium text-foreground">{currentUser.firstName} {currentUser.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                          </div>
                          <MenuItem icon={<User className="size-4" />} label={t("nav.profile")} onClick={() => { navigate("/profile"); setAvatarOpen(false); }} />
                          <MenuItem icon={<Calendar className="size-4" />} label={t("nav.reservations")} onClick={() => { navigate("/my-reservations"); setAvatarOpen(false); }} />
                          <MenuItem icon={<CreditCard className="size-4" />} label={t("nav.payments")} onClick={() => { navigate("/payments"); setAvatarOpen(false); }} />
                          <MenuItem icon={<FileText className="size-4" />} label={t("nav.documents")} onClick={() => { navigate("/my-documents"); setAvatarOpen(false); }} />
                          <MenuItem icon={<Star className="size-4" />} label={t("nav.reviews")} onClick={() => { navigate("/my-reviews"); setAvatarOpen(false); }} />
                          <MenuItem icon={<Bell className="size-4" />} label={t("nav.notifications")} onClick={() => { navigate("/notifications"); setAvatarOpen(false); }} />
                          <div className="border-t border-border my-1" />
                          <MenuItem icon={<KeyRound className="size-4" />} label={t("nav.changePassword")} onClick={() => { navigate("/change-password"); setAvatarOpen(false); }} />
                          <MenuItem icon={<LogOut className="size-4" />} label={t("nav.logout")} danger onClick={() => { logout(); setAvatarOpen(false); navigate("/login"); }} />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="px-3.5 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors">{t("nav.login")}</Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition-all">{t("nav.register")}</Link>
              </div>
            )}
            <button onClick={() => setMenuOpen(true)} className="md:hidden size-10 rounded-lg hover:bg-secondary flex items-center justify-center" aria-label="Menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
            <motion.div className="absolute right-0 top-0 h-full w-72 bg-card shadow-2xl p-5" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }}>
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="p-1"><X className="size-5" /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.filter((i) => !i.auth || currentUser).map((item) => {
                  const Icon = item.icon;
                  const isActive = item.end
                    ? location.pathname === "/"
                    : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <button
                      key={item.to}
                      onClick={() => { navigate(item.to); setMenuOpen(false); }}
                      className={cn(
                        "px-3 py-2.5 rounded-lg text-sm font-medium text-left inline-flex items-center gap-2",
                        isActive ? "bg-accent text-primary" : "text-foreground hover:bg-secondary",
                      )}
                    >
                      {Icon && <Icon className="size-4" />}
                      {t(item.key)}
                    </button>
                  );
                })}
                {currentUser && (
                  <>
                    <NavLink to="/my-documents" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">{t("nav.documents")}</NavLink>
                    <NavLink to="/notifications" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">{t("nav.notifications")}</NavLink>
                    <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">{t("nav.profile")}</NavLink>
                    <NavLink to="/change-password" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">{t("nav.changePassword")}</NavLink>
                  </>
                )}
                {!currentUser && (
                  <>
                    <NavLink to="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">{t("nav.login")}</NavLink>
                    <NavLink to="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground">{t("nav.register")}</NavLink>
                  </>
                )}
                <div className="flex items-center gap-2 px-3 pt-3 mt-2 border-t border-border">
                  <LanguageSwitcher /> <ThemeToggle />
                </div>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 bg-sidebar text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-9 rounded-xl bg-primary flex items-center justify-center"><Car className="size-5" /></span>
              <span className="text-lg font-bold">RentCar</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">Votre partenaire de confiance pour la location de véhicules premium en Tunisie. Réservation simple, service impeccable.</p>
            <div className="flex gap-2 mt-4">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="size-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"><Icon className="size-4" /></a>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold mb-3">Liens rapides</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/cars" className="hover:text-white transition-colors">Nos voitures</Link></li>
              <li><Link to="/my-reservations" className="hover:text-white transition-colors">Mes réservations</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Créer un compte</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Services</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li>Location courte durée</li>
              <li>Location longue durée</li>
              <li>Assurance tous risques</li>
              <li>Assistance 24h/24</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Contact</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /> Av. Habib Bourguiba, Tunis</li>
              <li className="flex items-center gap-2"><Phone className="size-4 shrink-0" /> +216 71 234 567</li>
              <li className="flex items-center gap-2"><Mail className="size-4 shrink-0" /> contact@rentcar.tn</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-7xl mx-auto px-6 py-5 text-center text-sm text-white/50">© 2026 RentCar. Tous droits réservés.</p>
        </div>
      </footer>

      {/* Chat de support flottant — présent sur toutes les pages client */}
      <SupportChat />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors", danger ? "text-destructive" : "text-foreground")}>
      {icon} {label}
    </button>
  );
}
