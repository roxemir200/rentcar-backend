import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { carsAPI } from "../api/cars.api";
import { categoriesAPI } from "../api/categories.api";
import { reservationsAPI } from "../api/reservations.api";  // ✅ AJOUTÉ
import type {
  User, Car, Category, Reservation, Contract, Payment, Review, AppNotification,
  ReservationStatus, Inspection, Role,
} from "../data/types";
import { authAPI, toFrontendUser } from "../api/auth.api";
import {
  seedUsers,
  seedContracts, seedPayments, seedReviews, seedNotifications,  // ✅ seedReservations supprimé
} from "../data/mockData";
import { api } from "../api/axios";

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  cars: Car[];
  categories: Category[];
  reservations: Reservation[];
  contracts: Contract[];
  payments: Payment[];
  reviews: Review[];
  notifications: AppNotification[];
  // auth
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Partial<User>) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
  getProfile: (email: string) => Promise<User | null>;
  updateProfile: (data: Pick<User, "firstName" | "lastName" | "phone" | "address" | "licenseNumber">) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  // reservations
  createReservation: (r: Omit<Reservation, "id" | "status" | "createdAt">) => Reservation;
  updateReservationStatus: (id: string, status: ReservationStatus, inspection?: { start?: Inspection; end?: Inspection }) => void;
  // contracts / payments
  signContract: (reservationId: string) => void;
  cancelContract: (contractId: string) => void;
  payReservation: (reservationId: string) => void;
  refundPayment: (paymentId: string) => void;
  // reviews
  addReview: (r: Omit<Review, "id" | "date">) => void;
  // notifications
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  // users
  toggleUserActive: (id: string) => void;
  changeUserRole: (id: string, role: Role) => void; 
  // cars & categories
  saveCar: (car: Car) => void;
  deleteCar: (id: string) => void;
  saveCategory: (cat: Category) => void;
  deleteCategory: (id: string) => void;
  // loading states
  carsLoading: boolean;
  carsError: string | null;
  loadCars: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadReservations: () => Promise<void>;  // ✅ AJOUTÉ
  // helpers
  getCar: (id: string) => Car | undefined;
  getUser: (id: string) => User | undefined;
  getContractByReservation: (rid: string) => Contract | undefined;
  getPaymentByReservation: (rid: string) => Payment | undefined;
  getCarRating: (carId: string) => { avg: number; count: number };
}

const AppContext = createContext<AppContextValue | null>(null);

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    return toFrontendUser({
      ...parsed,
      phoneNumber: parsed.phone,
      drivingLicenseNumber: parsed.licenseNumber,
      isActive: parsed.active,
    });
  } catch {
    return null;
  }
};

const persistAuth = (user: User | null) => {
  try {
    if (user) {
      const { password: _password, ...safeUser } = user;
      localStorage.setItem("user", JSON.stringify(safeUser));
    } else {
      localStorage.removeItem("user");
    }
  } catch {
    // ignore
  }
};

// ──────────────── MAPPING FUNCTIONS ────────────────
const API_BASE_URL = 'http://localhost:8089';
const mapCarFromApi = (apiCar: any): Car => ({
  id: String(apiCar.id),
  brand: apiCar.brand || '',
  model: apiCar.model || '',
  year: apiCar.year || 0,
  plate: apiCar.registrationNumber || '',
  color: apiCar.color || '',
  mileage: apiCar.mileage || 0,
  seats: apiCar.seats || 5,
  fuel: apiCar.fuelType === 'GASOLINE' ? 'Essence'
    : apiCar.fuelType === 'DIESEL' ? 'Diesel'
    : apiCar.fuelType === 'HYBRID' ? 'Hybride'
    : apiCar.fuelType === 'ELECTRIC' ? 'Électrique'
    : 'Essence',
  transmission: apiCar.transmission === 'MANUAL' ? 'Manuelle' : 'Automatique',
  pricePerDay: apiCar.dailyRate || 0,
  status: apiCar.status || 'AVAILABLE',
  description: apiCar.description || '',
  category: apiCar.categoryName || '',
  categoryId: String(apiCar.categoryId || ''),
  images: (apiCar.images || []).map((img: string) => 
    img.startsWith('http') || img.startsWith('data:') ? img : `${API_BASE_URL}${img}`
  ),
});

const mapCarToApi = (car: Car): any => ({
  brand: car.brand,
  model: car.model,
  year: car.year,
  registrationNumber: car.plate,
  color: car.color,
  mileage: car.mileage,
  seats: car.seats,
  fuelType: car.fuel === 'Essence' ? 'GASOLINE'
    : car.fuel === 'Diesel' ? 'DIESEL'
    : car.fuel === 'Hybride' ? 'HYBRID'
    : car.fuel === 'Électrique' ? 'ELECTRIC'
    : 'GASOLINE',
  transmission: car.transmission === 'Manuelle' ? 'MANUAL' : 'AUTOMATIC',
  dailyRate: car.pricePerDay,
  categoryId: Number(car.categoryId) || null,
  description: car.description || '',
  status: car.status,
  imageUrls: car.images || [],
});

// ──────────────── APP PROVIDER ────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem("token");
    return token ? readStoredUser() : null;
  });
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [cars, setCars] = useState<Car[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);  // ✅ Plus de seed
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);

  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(false);  // ✅ AJOUTÉ

  const loadCars = useCallback(async () => {
    setCarsLoading(true);
    setCarsError(null);
    try {
      const res = await carsAPI.getAll();
      const apiData = res.data?.value || res.data || [];
      const mappedCars = apiData.map(mapCarFromApi);
      setCars(mappedCars);
    } catch (err) {
      setCarsError("Erreur lors du chargement des voitures");
      console.error("Erreur chargement voitures:", err);
    } finally {
      setCarsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data?.value || res.data || []);
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // ✅ AJOUTÉ : Charger les réservations depuis l'API
  const loadReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const res = await reservationsAPI.getMyReservations();
      setReservations(res.data?.value || res.data || []);
    } catch (err) {
      console.error("Erreur chargement réservations:", err);
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCars();
    loadCategories();
  }, [loadCars, loadCategories]);

  // Charger les réservations quand l'utilisateur est connecté
  useEffect(() => {
    if (currentUser) {
      loadReservations();
    }
  }, [currentUser, loadReservations]);

  // ──────────────── AUTH ────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const authResponse = await authAPI.login({ email, password });
      const token = authResponse?.token;
      if (!token) return null;

      localStorage.setItem("token", token);

      let user: User | null = null;
      try {
        user = await authAPI.getProfile(email);
      } catch {
        const u = toFrontendUser(authResponse);
        if (u && u.id) {
          user = { ...u, password };
        }
      }

      if (!user) return null;
      setCurrentUser(user);
      persistAuth(user);
      return user;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  }, []);

  const register = useCallback(async (data: Partial<User>) => {
    try {
      const response = await authAPI.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phoneNumber: data.phone,
        address: data.address,
        drivingLicenseNumber: data.licenseNumber,
      });
      return { ok: response?.success ?? true, error: response?.message };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "L'inscription a échoué.";
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const getProfile = useCallback(async (email: string) => {
    try {
      const u = await authAPI.getProfile(email);
      if (!u) return null;
      const next = currentUser?.password ? { ...u, password: currentUser.password } : u;
      setCurrentUser(next);
      persistAuth(next);
      return next;
    } catch {
      return null;
    }
  }, [currentUser]);

  const updateProfile = useCallback(async (
    data: Pick<User, "firstName" | "lastName" | "phone" | "address" | "licenseNumber">
  ) => {
    try {
      const res = await authAPI.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phone,
        address: data.address,
        drivingLicenseNumber: data.licenseNumber,
      });
      if (!res?.success) return { ok: false, error: res?.message };

      if (currentUser) {
        const refreshed = await getProfile(currentUser.email);
        if (!refreshed) {
          const updated = { ...currentUser, ...data };
          setCurrentUser(updated);
          persistAuth(updated);
        }
      }
      return { ok: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Échec de la mise à jour.";
      return { ok: false, error: msg };
    }
  }, [currentUser, getProfile]);

  const changePassword = useCallback((current: string, next: string) => {
    if (!currentUser) return { ok: false, error: "Non connecté." };
    if (currentUser.password !== current) return { ok: false, error: "Mot de passe actuel incorrect." };
    setCurrentUser(prev => prev ? { ...prev, password: next } : prev);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: next } : u));
    return { ok: true };
  }, [currentUser]);

  // ────── NOTIFICATIONS ──────
  const pushNotification = useCallback((userId: string, type: AppNotification["type"], title: string, message: string, link?: string) => {
    setNotifications(prev => [
      { id: nextId("n"), userId, type, title, message, read: false, date: new Date().toISOString(), link },
      ...prev,
    ]);
  }, []);

  // ────── RESERVATIONS ──────
  const createReservation = useCallback((r: Omit<Reservation, "id" | "status" | "createdAt">) => {
    const reservation: Reservation = { ...r, id: nextId("r"), status: "PENDING", createdAt: new Date().toISOString() };
    setReservations(prev => [reservation, ...prev]);
    pushNotification(r.userId, "RESERVATION", "Réservation créée",
      "Votre demande est en attente de confirmation.", `/reservation/${reservation.id}`);
    return reservation;
  }, [pushNotification]);

  const updateReservationStatus = useCallback((id: string, status: ReservationStatus, inspection?: { start?: Inspection; end?: Inspection }) => {
    setReservations(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, status };
      if (inspection?.start) updated.startInspection = inspection.start;
      if (inspection?.end) updated.endInspection = inspection.end;
      setCars(cs => cs.map(c => {
        if (c.id !== r.carId) return c;
        if (status === "CONFIRMED") return { ...c, status: "RESERVED" };
        if (status === "IN_PROGRESS") return { ...c, status: "RENTED" };
        if (status === "COMPLETED" || status === "CANCELLED") return { ...c, status: "AVAILABLE" };
        return c;
      }));
      if (status === "CONFIRMED") {
        setContracts(cts => cts.some(ct => ct.reservationId === id) ? cts : [
          ...cts,
          { id: nextId("ct"), number: `CONT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000+Math.random()*9000)}`, reservationId: id, status: "DRAFT" },
        ]);
        setPayments(ps => ps.some(p => p.reservationId === id) ? ps : [
          ...ps,
          { id: nextId("p"), stripeId: `pi_${Math.random().toString(36).slice(2,12)}`, reservationId: id, amount: r.total, status: "PENDING" },
        ]);
        pushNotification(r.userId, "RESERVATION", "Réservation confirmée",
          "Le contrat est prêt à être signé.", `/reservation/${id}`);
      }
      return updated;
    }));
  }, [pushNotification]);

  const signContract = useCallback((reservationId: string) => {
    setContracts(prev => prev.map(c => c.reservationId === reservationId ? { ...c, status: "SIGNED", signedAt: new Date().toISOString() } : c));
    const res = reservations.find(r => r.id === reservationId);
    if (res) pushNotification(res.userId, "CONTRACT", "Contrat signé",
      "Vous pouvez maintenant procéder au paiement.", `/payment/${reservationId}`);
  }, [reservations, pushNotification]);

  const cancelContract = useCallback((contractId: string) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: "CANCELLED" } : c));
  }, []);

  const payReservation = useCallback((reservationId: string) => {
    setPayments(prev => prev.map(p => p.reservationId === reservationId ? { ...p, status: "COMPLETED", date: new Date().toISOString() } : p));
    const res = reservations.find(r => r.id === reservationId);
    if (res) pushNotification(res.userId, "PAYMENT", "Paiement réussi",
      "Merci pour votre confiance !", `/reservation/${reservationId}`);
  }, [reservations, pushNotification]);

  const refundPayment = useCallback((paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: "REFUNDED" } : p));
    toast.success("Paiement remboursé avec succès.");
  }, []);

  const addReview = useCallback((r: Omit<Review, "id" | "date">) => {
    setReviews(prev => [{ ...r, id: nextId("rev"), date: new Date().toISOString() }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => currentUser && n.userId === currentUser.id ? { ...n, read: true } : n));
  }, [currentUser]);

  const toggleUserActive = useCallback((id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  }, []);
  const changeUserRole = useCallback((id: string, role: Role) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  }, []);

 const saveCar = useCallback(async (car: Car) => {
  try {
    const uploadedUrls: string[] = [];
    for (const img of car.images) {
      if (img.startsWith('data:')) {
        const blob = await fetch(img).then(r => r.blob());
        const file = new File([blob], 'image.jpg', { type: blob.type });
        const url = await uploadImageToServer(file);
        uploadedUrls.push(url);
      } else {
        uploadedUrls.push(img);
      }
    }
    
    const apiData = mapCarToApi({ ...car, images: uploadedUrls });
    
    if (car.id && !isNaN(Number(car.id))) {
      await carsAPI.update(car.id, apiData);
    } else {
      await carsAPI.create(apiData);
    }

    await loadCars();
    toast.success("Voiture enregistrée avec succès !");
  } catch (err) {
    toast.error("Erreur lors de l'enregistrement");
    console.error(err);
  }
}, [loadCars]);

  const deleteCar = useCallback(async (id: string) => {
    try {
      await carsAPI.delete(id);
      await loadCars();
      toast.success("Voiture supprimée avec succès !");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
      console.error(err);
    }
  }, [loadCars]);

  const saveCategory = useCallback(async (cat: Category) => {
    try {
      if (cat.id && !isNaN(Number(cat.id))) {
        await categoriesAPI.update(cat.id, cat);
      } else {
        await categoriesAPI.create(cat);
      }
      await loadCategories();
      toast.success("Catégorie enregistrée avec succès !");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(err);
    }
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoriesAPI.delete(id);
      await loadCategories();
      toast.success("Catégorie supprimée avec succès !");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
      console.error(err);
    }
  }, [loadCategories]);

  const getCar = useCallback((id: string) => cars.find(c => c.id === id), [cars]);
  const getUser = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getContractByReservation = useCallback((rid: string) => contracts.find(c => c.reservationId === rid), [contracts]);
  const getPaymentByReservation = useCallback((rid: string) => payments.find(p => p.reservationId === rid), [payments]);
  const getCarRating = useCallback((carId: string) => {
    const rs = reviews.filter(r => r.carId === carId);
    if (rs.length === 0) return { avg: 0, count: 0 };
    return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
  }, [reviews]);

  const value: AppContextValue = {
    currentUser, users, cars, categories, reservations, contracts, payments, reviews, notifications,
    login, register, logout, getProfile, updateProfile, changePassword,
    createReservation, updateReservationStatus,
    signContract, cancelContract, payReservation, refundPayment, addReview,
    markNotificationRead, markAllRead, toggleUserActive, changeUserRole,
    saveCar, deleteCar, saveCategory, deleteCategory,
    carsLoading, carsError, loadCars, loadCategories, loadReservations,  // ✅ AJOUTÉ
    getCar, getUser, getContractByReservation, getPaymentByReservation, getCarRating,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

async function uploadImageToServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/admin/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}