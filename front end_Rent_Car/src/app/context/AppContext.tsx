import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from "react";
import { toast } from "sonner";
import { carsAPI } from "../api/cars.api";
import { categoriesAPI } from "../api/categories.api";
import { reservationsAPI } from "../api/reservations.api";  // ✅ AJOUTÉ
import { paymentsAPI } from "../api/payments.api";
import { usersAPI } from "../api/users.api";
import { reviewsAPI } from "../api/reviews.api";
import { contractsAPI } from "../api/contrat.api";
import { dashboardAPI } from "../api/dashboard.api";
import { notificationsAPI } from "../api/notifications.api";
import { calendarAPI } from "../api/calendar.api";
import type {
  User, Car, Category, Reservation, Contract, Payment, Review, AppNotification,
  ReservationStatus, Inspection, Role,
} from "../data/types";
import { authAPI, toFrontendUser } from "../api/auth.api";
import { NOTIFICATIONS_STREAM_URL, resolveImageUrl } from "../config/env";

import { api } from "../api/axios";

export interface AppContextValue {
  currentUser: User | null;
  users: User[];
  cars: Car[];
  categories: Category[];
  reservations: Reservation[];
  contracts: Contract[];
  payments: Payment[];
  reviews: Review[];
  notifications: AppNotification[];
  // dashboard
  dashboardStats: any;
  dashboardRevenue: any[];
  dashboardTopCars: any[];
  // calendar
  calendarReservations: any[];
  // auth
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Partial<User>) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
  getProfile: (email: string) => Promise<User | null>;
  updateProfile: (data: Pick<User, "firstName" | "lastName" | "phone" | "address" | "licenseNumber">) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  showWelcomeToast: () => void;
  // reservations
  createReservation: (r: Omit<Reservation, "id" | "status" | "createdAt">) => Reservation;
  updateReservationStatus: (id: string, status: ReservationStatus, inspection?: { start?: Inspection; end?: Inspection }) => void;
  // contracts / payments
  signContract: (reservationId: string) => void;
  cancelContract: (contractId: string) => void;
  payReservation: (reservationId: string) => void;
  refundPayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  addOrUpdatePayment: (payment: Payment) => void;
  // reviews
  addReview: (r: Omit<Review, "id" | "date">) => Promise<void>;
  // notifications
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
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
  loadPayments: () => Promise<void>;
  loadDashboardStats: () => Promise<any>; // ✅ À AJOUTER
  loadUsers: () => Promise<void>;  // ✅ AJOUTÉ
  loadReviews: () => Promise<void>;  // ✅ AJOUTÉ
  loadContracts: () => Promise<void>;  // ✅ AJOUTÉ
  setContracts: (contracts: Contract[]) => void;  // ✅ AJOUTÉ
  loadNotifications: () => Promise<void>;  // ✅ AJOUTÉ
  loadDashboardRevenue: (year: number) => Promise<any[]>;
  loadDashboardTopCars: (limit: number) => Promise<any[]>;
  loadCalendarReservations: (year: number, month: number) => Promise<any[]>;
  // helpers
  getCar: (id: string) => Car | undefined;
  getUser: (id: string) => User | undefined;
  getContractByReservation: (rid: string) => Contract | undefined;
  getPaymentByReservation: (rid: string) => Payment | undefined;
  getCarRating: (carId: string) => { avg: number; count: number };
}

export const AppContext = createContext<AppContextValue | null>(null);

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
  images: [
    // Use primaryImage first if available
    ...(apiCar.primaryImage ? [apiCar.primaryImage] : []),
    // Then add other images
    ...(apiCar.images || []),
  ]
    // Make sure no duplicates and all are full URLs
    .filter((img, index, arr) => img && arr.indexOf(img) === index)
    .map((img: string) => resolveImageUrl(img)),
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

const mapReservationFromApi = (apiRes: any): Reservation => ({
  id: String(apiRes.id),
  userId: String(apiRes.userId || apiRes.clientId),
  carId: String(apiRes.carId),
  startDate: apiRes.startDate || '',
  endDate: apiRes.endDate || '',
  pickupLocation: apiRes.pickupLocation || '',
  returnLocation: apiRes.returnLocation || '',
  total: apiRes.totalAmount || apiRes.total || 0,
  totalAmount: apiRes.totalAmount || apiRes.total || 0,
  status: apiRes.status || 'PENDING',
  createdAt: apiRes.createdAt || '',
});

const mapPaymentFromApi = (apiPayment: any): Payment => ({
  id: String(apiPayment.id),
  stripeId: apiPayment.externalPaymentId || "",
  externalPaymentId: apiPayment.externalPaymentId,
  reservationId: String(apiPayment.reservationId),
  clientName: apiPayment.clientName,
  carInfo: apiPayment.carInfo,
  amount: Number(apiPayment.amount ?? 0),
  currency: apiPayment.currency,
  provider: apiPayment.provider,
  status: apiPayment.status,
  date: apiPayment.paymentDate || apiPayment.createdAt,
  paymentDate: apiPayment.paymentDate,
  createdAt: apiPayment.createdAt,
});

const mapUserFromApi = (apiUser: any): User => ({
  id: String(apiUser.id),
  firstName: apiUser.firstName || "",
  lastName: apiUser.lastName || "",
  email: apiUser.email || "",
  password: "", // We don't get the password from the API
  phone: apiUser.phoneNumber || apiUser.phone,
  address: apiUser.address,
  licenseNumber: apiUser.drivingLicenseNumber || apiUser.licenseNumber,
  role: apiUser.role || "CLIENT",
  active: apiUser.active ?? true,
  createdAt: apiUser.createdAt || new Date().toISOString(),
});

export const mapReviewFromApi = (apiReview: any): Review => ({
  id: String(apiReview.id),
  userId: String(apiReview.userId || apiReview.clientId || apiReview.client_id || ""),
  carId: String(apiReview.carId || apiReview.car_id || ""),
  reservationId: String(apiReview.reservationId || apiReview.reservation_id || ""),
  rating: apiReview.rating,
  comment: apiReview.comment || "",
  date: apiReview.createdAt || apiReview.created_at || new Date().toISOString(),
  userFirstName: apiReview.userFirstName || apiReview.clientFirstName || apiReview.firstName || apiReview.first_name || "",
  userLastName: apiReview.userLastName || apiReview.clientLastName || apiReview.lastName || apiReview.last_name || "",
});

export const mapContractFromApi = (apiContract: any): Contract => ({
  id: String(apiContract.id),
  number: apiContract.contractNumber || apiContract.contract_number || apiContract.number || "",
  reservationId: String(apiContract.reservationId || apiContract.reservation_id || ""),
  status: apiContract.status || "DRAFT",
  signedAt: apiContract.signedAt || apiContract.signed_at || null,
});

const mapNotificationFromApi = (apiNotification: any, currentUserId: string): AppNotification => ({
  id: `server-${apiNotification.id}`,
  userId: currentUserId, // since it's "my notifications", the recipient is current user
  type: apiNotification.type || "SYSTEM",
  title: apiNotification.title || "",
  message: apiNotification.message || "",
  read: Boolean(apiNotification.isRead),
  date: apiNotification.createdAt || new Date().toISOString(),
});

// ──────────────── APP PROVIDER ────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const welcomeToastShownRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem("token");
    return token ? readStoredUser() : null;
  });
  const [users, setUsers] = useState<User[]>([]);  // ✅ Plus de seed
  const [cars, setCars] = useState<Car[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);  // ✅ Plus de seed
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardRevenue, setDashboardRevenue] = useState<any[]>([]);
  const [dashboardTopCars, setDashboardTopCars] = useState<any[]>([]);
  const [calendarReservations, setCalendarReservations] = useState<any[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  // ────── NOTIFICATIONS ──────
  const pushNotification = useCallback((userId: string, type: AppNotification["type"], title: string, message: string, link?: string) => {
    setNotifications(prev => [
      { id: nextId("n"), userId, type, title, message, read: false, date: new Date().toISOString(), link },
      ...prev,
    ]);
  }, []);

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
    if (!currentUser) {
      setReservations([]);
      return;
    }
    setReservationsLoading(true);
    try {
      const res = currentUser.role === "ADMIN"
        ? await reservationsAPI.getAll()
        : await reservationsAPI.getMyReservations();
      const apiReservations = res.data?.value || res.data || [];
      setReservations(apiReservations.map(mapReservationFromApi));
    } catch (err) {
      console.error("Erreur chargement réservations:", err);
    } finally {
      setReservationsLoading(false);
    }
  }, [currentUser]);

  const loadPayments = useCallback(async () => {
    if (!currentUser) {
      setPayments([]);
      return;
    }

    try {
      const res = currentUser.role === "ADMIN"
        ? await paymentsAPI.getAll()
        : await paymentsAPI.getMyPayments();
      const apiPayments = res.data?.value || res.data || [];
      setPayments(apiPayments.map(mapPaymentFromApi));
    } catch (err) {
      setPayments([]);
    }
  }, [currentUser]);

  const loadUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      setUsers([]);
      return;
    }

    try {
      const res = await usersAPI.getAll();
      const apiUsers = res.data?.value || res.data || [];
      setUsers(apiUsers.map(mapUserFromApi));
    } catch (err) {
      setUsers([]);
    }
  }, [currentUser]);

  const loadReviews = useCallback(async () => {
    if (!currentUser) {
      setReviews([]);
      return;
    }

    try {
      // Don't load reviews for admin if the endpoint is not authorized
      if (currentUser.role === "ADMIN") {
        setReviews([]);
        return;
      }
      
      const res = await reviewsAPI.getMyReviews();
      const apiReviews = res.data?.value || res.data || [];
      setReviews(apiReviews.map(mapReviewFromApi));
    } catch (err) {
      setReviews([]);
    }
  }, [currentUser]);

  const loadContracts = useCallback(async () => {
    if (!currentUser) {
      setContracts([]);
      return;
    }

    try {
      let apiContracts: any[] = [];
      if (currentUser.role === "ADMIN") {
        const res = await contractsAPI.getAll();
        apiContracts = res.data?.value || res.data || [];
      } else {
        // For clients, use getMy() when backend endpoint is available
        // Uncomment these lines once you add the /api/contracts/my endpoint:
        // const res = await contractsAPI.getMy();
        // apiContracts = res.data?.value || res.data || [];
        apiContracts = [];
      }
      setContracts(apiContracts.map(mapContractFromApi));
    } catch (err) {
      setContracts([]);
    }
  }, [currentUser]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      const res = await notificationsAPI.getMyNotifications();
      const apiNotifications = res.data?.value || res.data || [];
      setNotifications(apiNotifications.map((n: any) => mapNotificationFromApi(n, currentUser.id)));
    } catch (err) {
      setNotifications([]);
    }
  }, [currentUser]);
  const loadDashboardStats = useCallback(async () => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return null;
    }
    try {
      const res = await dashboardAPI.getStats();
      const data = res.data?.data || res.data;
      setDashboardStats(data);
      return data;
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
      return null;
    }
  }, [currentUser]);

  const loadDashboardRevenue = useCallback(async (year: number = 2026) => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return [];
    }
    try {
      const res = await dashboardAPI.getRevenue(year);
      const data = res.data?.data || res.data || [];
      setDashboardRevenue(data);
      return data;
    } catch (err) {
      console.error("Erreur chargement revenus:", err);
      return [];
    }
  }, [currentUser]);

  const loadDashboardTopCars = useCallback(async (limit: number = 5) => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return [];
    }
    try {
      const res = await dashboardAPI.getTopCars(limit);
      const data = res.data?.data || res.data || [];
      setDashboardTopCars(data);
      return data;
    } catch (err) {
      console.error("Erreur chargement top cars:", err);
      return [];
    }
  }, [currentUser]);

  const loadCalendarReservations = useCallback(async (year: number, month: number) => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      return [];
    }
    try {
      const res = await calendarAPI.getReservations(year, month);
      const data = res.data?.data || res.data || [];
      
      // Map API response to Reservation type (add carBrand/carModel/clientFirstName/clientLastName as extra fields)
      const mappedReservations = data.map((apiRes: any) => ({
        ...mapReservationFromApi(apiRes),
        carBrand: apiRes.carBrand,
        carModel: apiRes.carModel,
        clientFirstName: apiRes.clientFirstName,
        clientLastName: apiRes.clientLastName
      }));
      
      setCalendarReservations(mappedReservations);
      return mappedReservations;
    } catch (err) {
      console.error("Erreur chargement calendrier:", err);
      return [];
    }
  }, [currentUser]);

  useEffect(() => {
    loadCars();
    loadCategories();
  }, [loadCars, loadCategories]);

  // Show welcome toast — triggered ONCE by the landing page (dashboard / cars) once mounted
  const showWelcomeToast = useCallback(() => {
    if (!currentUser || welcomeToastShownRef.current) return;
    welcomeToastShownRef.current = true;
    toast.success(`Bienvenue, ${currentUser.firstName} !`);
  }, [currentUser]);

  // Charger les réservations quand l'utilisateur est connecté
  useEffect(() => {
    if (currentUser) {
      loadReservations();
      loadPayments();
      loadUsers();
      loadReviews();
      loadContracts();
      loadNotifications();
        if (currentUser.role === "ADMIN") {
      loadDashboardStats(); // ✅ Optionnel
      loadDashboardRevenue(2026);
      loadDashboardTopCars(5);
    }
    } else {
      setReservations([]);
      setPayments([]);
      setUsers([]);
      setReviews([]);
      setContracts([]);
      setNotifications([]);
      setDashboardStats(null);
      setDashboardRevenue([]);
      setDashboardTopCars([]);
    }
  }, [currentUser, loadReservations, loadPayments, loadUsers, loadReviews, loadContracts, loadNotifications, loadDashboardStats, loadDashboardRevenue, loadDashboardTopCars]);

  // Gérer la connexion SSE
  useEffect(() => {
    if (!currentUser) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    let reconnectAttempts = 0;
    const maxShortRetries = 5; // Nombre de tentatives avec délais courts
    const maxDelayMs = 60000; // 1 minute max delay
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(`${NOTIFICATIONS_STREAM_URL}?token=${token}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          reconnectAttempts = 0; // Réinitialiser le compteur quand la connexion réussit
        };

        eventSource.onerror = (error) => {
          eventSource.close();

          if (reconnectAttempts < maxShortRetries) {
            reconnectAttempts++;
            // Exponential backoff starting at 2 seconds
            const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), maxDelayMs);
            reconnectTimeout = setTimeout(() => {
              connectSSE();
            }, delay);
          } else {
            // Après 5 tentatives, attendre 10 minutes avant de réessayer
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts = 0;
              connectSSE();
            }, 10 * 60 * 1000);
          }
        };

        eventSource.addEventListener("payment.updated", (event) => {
          const updatedPayment = JSON.parse(event.data);
          const normalizedPayment = mapPaymentFromApi(updatedPayment);
          setPayments(prev => {
            const index = prev.findIndex(p => p.id === normalizedPayment.id);
            if (index === -1) {
              return [normalizedPayment, ...prev];
            }

            const next = [...prev];
            next[index] = {
              ...next[index],
              ...normalizedPayment,
            };
            return next;
          });
          // Informer les pages avec state local (ex: MyReservations qui charge son propre fetch)
          // qu'un paiement évolue et qu'elles doivent recharger leurs données.
          window.dispatchEvent(new CustomEvent("rentcar:data-updated", { detail: { kind: "payment", id: normalizedPayment.id } }));
        });

        eventSource.addEventListener("reservation.updated", (event) => {
          const updated = JSON.parse(event.data);
          const normalized = mapReservationFromApi(updated);
          setReservations(prev => {
            const idx = prev.findIndex(r => r.id === normalized.id);
            if (idx === -1) return [normalized, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...normalized };
            return next;
          });
          window.dispatchEvent(new CustomEvent("rentcar:data-updated", { detail: { kind: "reservation", id: normalized.id } }));
        });

        eventSource.addEventListener("car.updated", (event) => {
          const updated = JSON.parse(event.data);
          const normalized = mapCarFromApi(updated);
          setCars(prev => {
            const idx = prev.findIndex(c => c.id === normalized.id);
            if (idx === -1) return [normalized, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...normalized };
            return next;
          });
          window.dispatchEvent(new CustomEvent("rentcar:data-updated", { detail: { kind: "car", id: normalized.id } }));
        });

        eventSource.addEventListener("notification", (event) => {
          const notification = JSON.parse(event.data);
          const notificationId = notification?.id ? `server-${notification.id}` : "";

          if (notificationId && seenNotificationIdsRef.current.has(notificationId)) {
            return;
          }

          if (notificationId) {
            seenNotificationIdsRef.current.add(notificationId);
          }

          setNotifications(prev => {
            const nextNotification: AppNotification = {
              id: notificationId || nextId("n"),
              userId: currentUser.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              read: Boolean(notification.isRead),
              date: notification.createdAt || new Date().toISOString(),
            };

            if (prev.some(item => item.id === nextNotification.id)) {
              return prev;
            }

            return [nextNotification, ...prev];
          });

          const isSelfReservationCreated =
            notification.type === "RESERVATION" &&
            notification.title === "Réservation en attente";

          if (!isSelfReservationCreated) {
            // Choix couleur toast selon type + titre :
            // → Ce qui correspond à une ACTION RÉUSSIE (success) est affiché en VERT.
            const type: keyof typeof toast = notification.type;
            const title: string = notification.title ?? "";
            const isSuccessToast =
              (type === "CONTRACT" && title.startsWith("Contrat signé")) ||
              (type === "PAYMENT" &&
                (title.startsWith("Paiement accepté") || title.startsWith("Paiement reçu") || title.startsWith("Remboursement"))) ||
              (type === "RESERVATION" &&
                ["Réservation confirmée", "Location démarrée", "Location terminée"].some(t =>
                  title.startsWith(t)
                ));

            const errorTitles = [
              "Réservation annulée",
              "Paiement échoué",
            ];
            const isErrorToast =
              errorTitles.some(t => title.startsWith(t));

            const toastId =
              notificationId || `${notification.type}-${notification.title}-${notification.message}`;

            if (isSuccessToast) {
              toast.success(notification.title, {
                id: toastId,
                description: notification.message,
              });
            } else if (isErrorToast) {
              toast.error(notification.title, {
                id: toastId,
                description: notification.message,
              });
            } else {
              toast.info(notification.title, {
                id: toastId,
                description: notification.message,
              });
            }
          }
        });
      } catch (e) {
        // Erreur lors de la création de EventSource, réessayer
        if (reconnectAttempts < maxShortRetries) {
          reconnectAttempts++;
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), maxDelayMs);
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, delay);
        } else {
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts = 0;
            connectSSE();
          }, 10 * 60 * 1000);
        }
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [currentUser]);

  // ──────────────── AUTH ────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const authResponse = await authAPI.login({ email, password });
      const token = authResponse?.token;
      if (!token) {
        throw new Error("Email ou mot de passe incorrect");
      }

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
    } catch (error: any) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Extract error message from backend if available
      const message = error?.response?.data?.message || "Email ou mot de passe incorrect";
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (data: Partial<User>) => {
    try {
      const response = await authAPI.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
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
  // ✅ Génère un nombre aléatoire sécurisé entre min et max
const secureRandom = (min: number, max: number): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
};

// ✅ Génère un ID aléatoire sécurisé
const secureRandomId = (prefix: string, length: number = 10): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  const id = Array.from(array)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
  return `${prefix}_${id}`;
};



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
      // ✅ Numéro de contrat sécurisé
      const contractNumber = `CONT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${secureRandom(1000, 9999)}`;
      
      setContracts(cts => cts.some(ct => ct.reservationId === id) ? cts : [
        ...cts,
        { 
          id: nextId("ct"), 
          number: contractNumber, 
          reservationId: id, 
          status: "DRAFT" 
        },
      ]);

      // ✅ ID Stripe sécurisé
      const stripeId = secureRandomId('pi', 10);
      
      setPayments(ps => ps.some(p => p.reservationId === id) ? ps : [
        ...ps,
        { 
          id: nextId("p"), 
          stripeId: stripeId, 
          reservationId: id, 
          amount: r.total, 
          status: "PENDING" 
        },
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

  const addOrUpdatePayment = useCallback((payment: Payment) => {
    setPayments(prev => {
      const index = prev.findIndex(p => p.id === payment.id);
      if (index !== -1) {
        const newPayments = [...prev];
        newPayments[index] = { ...newPayments[index], ...payment };
        return newPayments;
      }
      return [...prev, payment];
    });
  }, []);

  const payReservation = useCallback((reservationId: string) => {
    setPayments(prev => prev.map(p => p.reservationId === reservationId ? { ...p, status: "COMPLETED", date: new Date().toISOString() } : p));
    const res = reservations.find(r => r.id === reservationId);
    if (res) pushNotification(res.userId, "PAYMENT", "Paiement réussi", "Merci pour votre confiance !", `/reservation/${reservationId}`);
  }, [reservations, pushNotification]);

  const refundPayment = useCallback(async (paymentId: string): Promise<{ ok: boolean; error?: string }> => {
    const payment = payments.find(p => p.id === paymentId);
    try {
      const res = await paymentsAPI.refund(Number(paymentId));
      const body: any = res.data;
      const ok = Boolean(body?.success || body?.ok || body?.isSuccess || (res.status >= 200 && res.status < 300));
      const message: string | undefined = body?.message || body?.data?.message;

      if (!ok) {
        const errorMsg = message || "Échec du remboursement";
        toast.error("Remboursement impossible", { description: errorMsg });
        return { ok: false, error: errorMsg };
      }

      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, status: "REFUNDED" as const, paymentDate: new Date().toISOString() } : p
      ));

      if (payment?.reservationId) {
        setReservations(prev => prev.map(r =>
          r.id === payment.reservationId ? { ...r, status: "CANCELLED" as const } : r
        ));
        const res = reservations.find(r => r.id === payment.reservationId);
        if (res?.carId) {
          setCars(prev => prev.map(c =>
            c.id === res.carId ? { ...c, status: "AVAILABLE" as const } : c
          ));
        }
      }

      return { ok: true };
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || "Erreur réseau";
      toast.error("Remboursement échoué", { description: detail });
      return { ok: false, error: detail };
    }
  }, [payments, reservations]);

  const addReview = useCallback(async (r: Omit<Review, "id" | "date">) => {
    try {
      const res = await reviewsAPI.create({
        reservationId: Number(r.reservationId),
        rating: r.rating,
        comment: r.comment,
      });
      if (res.data.success) {
        const newReview = mapReviewFromApi(res.data.data);
        setReviews(prev => [newReview, ...prev]);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Erreur lors de la publication de l'avis");
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    try {
      // Extract the server id (remove "server-" prefix if exists)
      const serverId = id.startsWith("server-") ? id.replace("server-", "") : id;
      await notificationsAPI.markAsRead(serverId);
    } catch (err) {
      // Revert on error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  }, []);
  
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => currentUser && n.userId === currentUser.id ? { ...n, read: true } : n));

    try {
      await notificationsAPI.markAllAsRead();
    } catch (err) {
      // Revert on error
      loadNotifications();
    }
  }, [currentUser, loadNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      // Extract server id (remove "server-" prefix if present)
      const serverId = id.startsWith("server-") ? id.replace("server-", "") : id;
      await notificationsAPI.deleteNotification(serverId);
    } catch (err) {
      // Revert on error
      loadNotifications();
    }
  }, [loadNotifications]);

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
    dashboardStats, dashboardRevenue, dashboardTopCars, calendarReservations,
    login, register, logout, getProfile, updateProfile, changePassword, showWelcomeToast,
    createReservation, updateReservationStatus,
    signContract, cancelContract, payReservation, refundPayment, addOrUpdatePayment, addReview,
    markNotificationRead, markAllRead, deleteNotification, toggleUserActive, changeUserRole,
    saveCar, deleteCar, saveCategory, deleteCategory,
    carsLoading, carsError, loadCars, loadCategories, loadReservations, loadPayments, loadUsers, loadReviews, loadContracts, setContracts, loadDashboardStats, loadNotifications, loadDashboardRevenue, loadDashboardTopCars, loadCalendarReservations,
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
