import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { I18nextProvider } from "react-i18next";
import i18n, { applyDocumentLang, type I18nLang } from "./locales";
import { AppProvider } from "./context/AppContext";
import { PrefsProvider } from "./context/PrefsContext";
import { ClientLayout } from "./components/layout/ClientLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { RequireAuth } from "./components/layout/Guards";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
const stripePromise = loadStripe("pk_test_51QxQ0L013eLvCqd8VjOvdkFwebSB80M2Hc9epvdznE7dlvr9wzT8IepP38Wc2ZTtSkHDDBq2LpbO36VPiIFTBrqc00F4HYxjLy");

const Login = React.lazy(() => import("./pages/auth/Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const ForgotPassword = React.lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = React.lazy(() => import("./pages/auth/VerifyEmail"));

const Home = React.lazy(() => import("./pages/client/Home"));
const CarsList = React.lazy(() => import("./pages/client/CarsList"));
const Recommendations = React.lazy(() => import("./pages/client/Recommendations"));
const CarDetail = React.lazy(() => import("./pages/client/CarDetail"));
const MyReservations = React.lazy(() => import("./pages/client/MyReservations"));
const ReservationDetail = React.lazy(() => import("./pages/client/ReservationDetail"));
const Contract = React.lazy(() => import("./pages/client/Contract"));
const Payment = React.lazy(() => import("./pages/client/Payment"));
const MyReviews = React.lazy(() => import("./pages/client/MyReviews"));
const Notifications = React.lazy(() => import("./pages/client/Notifications"));
const PaymentsHistory = React.lazy(() => import("./pages/client/PaymentsHistory"));
const Profile = React.lazy(() => import("./pages/client/Profile"));
const MyDocuments = React.lazy(() => import("./pages/client/MyDocuments"));
const ChangePassword = React.lazy(() => import("./pages/client/ChangePassword"));

const Dashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const AdminReservations = React.lazy(() => import("./pages/admin/AdminReservations"));
const InspectionForm = React.lazy(() => import("./pages/admin/InspectionForm"));
const AdminCars = React.lazy(() => import("./pages/admin/AdminCars"));
const AdminCategories = React.lazy(() => import("./pages/admin/AdminCategories"));
const AdminContracts = React.lazy(() => import("./pages/admin/AdminContracts"));
const AdminPayments = React.lazy(() => import("./pages/admin/AdminPayments"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminNotifications = React.lazy(() => import("./pages/admin/AdminNotifications"));
const AdminExport = React.lazy(() => import("./pages/admin/AdminExport"));
const AdminCalendar = React.lazy(() => import("./pages/admin/AdminCalendar"));
const AdminChat = React.lazy(() => import("./pages/admin/AdminChat"));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-10">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Chargement" />
    </div>
  );
}

// Initialisation document.lang/dir avant le premier render (évite FOUC RTL)
try {
  const saved = localStorage.getItem('rentcar-lang') as I18nLang | null;
  if (saved && ['fr','en','ar'].includes(saved)) {
    applyDocumentLang(saved);
  }
} catch { /* ignore */ }

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
     <Elements stripe={stripePromise}>
    <PrefsProvider>
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth (standalone) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Client space */}
            <Route element={<ClientLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/cars" element={<CarsList />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/cars/:id" element={<CarDetail />} />
              <Route path="/my-reservations" element={<RequireAuth role="CLIENT"><MyReservations /></RequireAuth>} />
              <Route path="/reservation/:id" element={<RequireAuth role="CLIENT"><ReservationDetail /></RequireAuth>} />
              <Route path="/contract/:reservationId" element={<RequireAuth role="CLIENT"><Contract /></RequireAuth>} />
              <Route path="/payment/:reservationId" element={<RequireAuth role="CLIENT"><Payment /></RequireAuth>} />
              <Route path="/payments" element={<RequireAuth role="CLIENT"><PaymentsHistory /></RequireAuth>} />
              <Route path="/my-reviews" element={<RequireAuth role="CLIENT"><MyReviews /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth role="CLIENT"><Profile /></RequireAuth>} />
              <Route path="/my-documents" element={<RequireAuth role="CLIENT"><MyDocuments /></RequireAuth>} />
              <Route path="/change-password" element={<RequireAuth role="CLIENT"><ChangePassword /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            </Route>

            {/* Admin space */}
            <Route element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/reservations" element={<AdminReservations />} />
              <Route path="/admin/calendar" element={<AdminCalendar />} />
              <Route path="/admin/export" element={<AdminExport />} />
              <Route path="/admin/reservation/:id" element={<ReservationDetail admin />} />
              <Route path="/admin/reservation/:id/start" element={<InspectionForm mode="start" />} />
              <Route path="/admin/reservation/:id/complete" element={<InspectionForm mode="complete" />} />
              <Route path="/admin/contract/:reservationId" element={<Contract admin />} />
              <Route path="/admin/cars" element={<AdminCars />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/contracts" element={<AdminContracts />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/chat" element={<AdminChat />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AppProvider>
    </PrefsProvider>
    </Elements>
    </I18nextProvider>
  );
}
