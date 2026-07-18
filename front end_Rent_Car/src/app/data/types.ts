// Domain types for the RentCar platform

export type Role = "ADMIN" | "CLIENT";

export type FuelType = "Essence" | "Diesel" | "Hybride" | "Électrique";
export type Transmission = "Manuelle" | "Automatique";
export type CarStatus = "AVAILABLE" | "RESERVED" | "RENTED";
export type CategoryName = "Économique" | "Berline" | "SUV" | "Luxe";

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ContractStatus = "DRAFT" | "SIGNED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type FuelLevel = "Vide" | "Quart" | "Moitié" | "Trois-quarts" | "Plein";
export type NotificationType = "RESERVATION" | "PAYMENT" | "CONTRACT" | "SYSTEM";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  licenseNumber?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: CategoryName | string;
  description: string;
  createdAt: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: CategoryName | string;
  categoryId?: string;          // ← ajouté pour l'admin
  plate: string;
  color: string;
  mileage: number;
  seats: number;
  fuel: FuelType;
  transmission: Transmission;
  pricePerDay: number;
  status: CarStatus;
  description: string;
  images: string[];
}

export interface Inspection {
  mileage: number;
  fuel: FuelLevel;
  damages: string;
}

export interface Reservation {
  id: string;
  userId: string;
  carId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  notes?: string;
  total: number;
  status: ReservationStatus;
  createdAt: string;
  startInspection?: Inspection;
  endInspection?: Inspection;
  totalAmount?: number;
}

export interface Contract {
  id: string;
  number: string;
  reservationId: string;
  status: ContractStatus;
  signedAt?: string;
}

export interface Payment {
  id: string;
  stripeId: string;
  reservationId: string;
  amount: number;
  status: PaymentStatus;
  date?: string;
}

export interface Review {
  id: string;
  userId: string;
  carId: string;
  reservationId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  date: string;
  link?: string;
}
