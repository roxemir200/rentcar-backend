import type {
  User,
  Category,
  Car,
  Reservation,
  Contract,
  Payment,
  Review,
  AppNotification,
} from "./types";

// Real Unsplash car photography for an elegant, high-end feel.
const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&h=800&fit=crop&auto=format`;

export const seedUsers: User[] = [
  {
    id: "u1",
    firstName: "Admin",
    lastName: "RentCar",
    email: "admin@rentcar.com",
    password: "admin123",
    phone: "+216 71 234 567",
    role: "ADMIN",
    active: true,
    createdAt: "2025-11-02T09:00:00Z",
  },
  {
    id: "u2",
    firstName: "Camille",
    lastName: "Laurent",
    email: "client@rentcar.com",
    password: "client123",
    phone: "+216 98 765 432",
    address: "12 Avenue Habib Bourguiba, 1000 Tunis",
    licenseNumber: "12AB34567",
    role: "CLIENT",
    active: true,
    createdAt: "2026-01-15T14:30:00Z",
  },
  {
    id: "u3",
    firstName: "Thomas",
    lastName: "Moreau",
    email: "thomas.moreau@email.com",
    password: "test1234",
    phone: "+216 22 111 333",
    role: "CLIENT",
    active: true,
    createdAt: "2026-02-20T10:15:00Z",
  },
  {
    id: "u4",
    firstName: "Sofia",
    lastName: "Nguyen",
    email: "sofia.nguyen@email.com",
    password: "test1234",
    role: "CLIENT",
    active: false,
    createdAt: "2026-03-05T16:45:00Z",
  },
];

export const seedCategories: Category[] = [
  { id: "c1", name: "Économique", description: "Petites voitures économiques et agiles, idéales pour la ville.", createdAt: "2025-11-02T09:00:00Z" },
  { id: "c2", name: "Berline", description: "Confort et élégance pour vos trajets longue distance.", createdAt: "2025-11-02T09:00:00Z" },
  { id: "c3", name: "SUV", description: "Espace, robustesse et polyvalence pour toute la famille.", createdAt: "2025-11-02T09:00:00Z" },
  { id: "c4", name: "Luxe", description: "Le raffinement absolu pour une expérience d'exception.", createdAt: "2025-11-02T09:00:00Z" },
];

export const seedCars: Car[] = [
  {
    id: "car1", brand: "Renault", model: "Clio", year: 2023, category: "Économique",
    plate: "AB-123-CD", color: "Blanc", mileage: 18500, seats: 5, fuel: "Essence",
    transmission: "Manuelle", pricePerDay: 35, status: "AVAILABLE",
    description: "Citadine polyvalente, parfaite pour la ville comme pour les escapades. Faible consommation et grande maniabilité.",
    images: [img("photo-1541899481282-d53bffe3c35d"), img("photo-1503376780353-7e6692767b70"), img("photo-1493238792000-8113da705763")],
  },
  {
    id: "car2", brand: "Peugeot", model: "308", year: 2022, category: "Berline",
    plate: "EF-456-GH", color: "Gris", mileage: 32000, seats: 5, fuel: "Diesel",
    transmission: "Automatique", pricePerDay: 52, status: "RESERVED",
    description: "Berline compacte au design affirmé, alliant confort et sobriété pour vos déplacements professionnels.",
    images: [img("photo-1552519507-da3b142c6e3d"), img("photo-1494976388531-d1058494cdd8")],
  },
  {
    id: "car3", brand: "Tesla", model: "Model 3", year: 2024, category: "Luxe",
    plate: "IJ-789-KL", color: "Noir", mileage: 9800, seats: 5, fuel: "Électrique",
    transmission: "Automatique", pricePerDay: 95, status: "AVAILABLE",
    description: "Berline 100% électrique, technologie de pointe, autopilote et une autonomie exceptionnelle. Le futur, aujourd'hui.",
    images: [img("photo-1560958089-b8a1929cea89"), img("photo-1536700503339-1e4b06520771"), img("photo-1617704548623-340376564e68")],
  },
  {
    id: "car4", brand: "BMW", model: "X5", year: 2023, category: "SUV",
    plate: "MN-012-OP", color: "Bleu", mileage: 21000, seats: 7, fuel: "Hybride",
    transmission: "Automatique", pricePerDay: 120, status: "RENTED",
    description: "SUV premium spacieux et puissant. Motorisation hybride, finitions haut de gamme et sécurité maximale.",
    images: [img("photo-1555215695-3004980ad54e"), img("photo-1520031441872-265e4ff70366")],
  },
  {
    id: "car5", brand: "Mercedes-Benz", model: "Classe A", year: 2024, category: "Berline",
    plate: "QR-345-ST", color: "Argent", mileage: 12400, seats: 5, fuel: "Essence",
    transmission: "Automatique", pricePerDay: 78, status: "AVAILABLE",
    description: "Compacte premium avec intérieur luxueux et système MBUX intuitif. Élégance et technologie réunies.",
    images: [img("photo-1618843479313-40f8afb4b4d8"), img("photo-1583121274602-3e2820c69888")],
  },
  {
    id: "car6", brand: "Audi", model: "Q3", year: 2023, category: "SUV",
    plate: "UV-678-WX", color: "Blanc", mileage: 27600, seats: 5, fuel: "Diesel",
    transmission: "Automatique", pricePerDay: 88, status: "AVAILABLE",
    description: "SUV compact au caractère sportif. Confort de conduite, technologie embarquée et allure raffinée.",
    images: [img("photo-1606664515524-ed2f786a0bd6"), img("photo-1606152421802-db97b9c7a11b")],
  },
  {
    id: "car7", brand: "Volkswagen", model: "Polo", year: 2022, category: "Économique",
    plate: "YZ-901-AB", color: "Rouge", mileage: 41000, seats: 5, fuel: "Essence",
    transmission: "Manuelle", pricePerDay: 32, status: "AVAILABLE",
    description: "Citadine fiable et économique, idéale pour un budget maîtrisé sans compromis sur la qualité.",
    images: [img("photo-1471479917193-f00955256257"), img("photo-1502877338535-766e1452684a")],
  },
  {
    id: "car8", brand: "Porsche", model: "911 Carrera", year: 2024, category: "Luxe",
    plate: "CD-234-EF", color: "Jaune", mileage: 5200, seats: 2, fuel: "Essence",
    transmission: "Automatique", pricePerDay: 320, status: "AVAILABLE",
    description: "L'icône sportive absolue. Performances exceptionnelles, sensations pures et prestige inégalé.",
    images: [img("photo-1503376780353-7e6692767b70"), img("photo-1544636331-e26879cd4d9b")],
  },
];

export const seedReservations: Reservation[] = [
  {
    id: "r1", userId: "u2", carId: "car2", startDate: "2026-07-15", endDate: "2026-07-20",
    pickupLocation: "Agence Tunis Centre", returnLocation: "Agence Tunis Centre",
    notes: "Siège bébé souhaité", total: 260, status: "CONFIRMED", createdAt: "2026-07-08T11:00:00Z",
  },
  {
    id: "r2", userId: "u2", carId: "car4", startDate: "2026-06-01", endDate: "2026-06-08",
    pickupLocation: "Aéroport Tunis-Carthage", returnLocation: "Aéroport Tunis-Carthage",
    total: 840, status: "IN_PROGRESS", createdAt: "2026-05-20T09:00:00Z",
    startInspection: { mileage: 21000, fuel: "Plein", damages: "Rayure légère portière arrière droite" },
  },
  {
    id: "r3", userId: "u2", carId: "car1", startDate: "2026-04-10", endDate: "2026-04-14",
    pickupLocation: "Agence Sousse", returnLocation: "Agence Sousse",
    total: 140, status: "COMPLETED", createdAt: "2026-04-01T15:30:00Z",
    startInspection: { mileage: 17800, fuel: "Plein", damages: "Aucun" },
    endInspection: { mileage: 18500, fuel: "Trois-quarts", damages: "Aucun" },
  },
  {
    id: "r4", userId: "u2", carId: "car7", startDate: "2026-07-25", endDate: "2026-07-28",
    pickupLocation: "Agence Tunis Centre", returnLocation: "Agence Tunis Centre",
    total: 96, status: "PENDING", createdAt: "2026-07-10T18:00:00Z",
  },
  {
    id: "r5", userId: "u3", carId: "car5", startDate: "2026-05-05", endDate: "2026-05-09",
    pickupLocation: "Agence Sfax", returnLocation: "Agence Sfax",
    total: 312, status: "CANCELLED", createdAt: "2026-04-28T12:00:00Z",
  },
  {
    id: "r6", userId: "u3", carId: "car3", startDate: "2026-07-12", endDate: "2026-07-16",
    pickupLocation: "Agence Sousse", returnLocation: "Agence Sousse",
    total: 380, status: "CONFIRMED", createdAt: "2026-07-05T10:00:00Z",
  },
];

export const seedContracts: Contract[] = [
  { id: "ct1", number: "CONT-20260708-1001", reservationId: "r1", status: "DRAFT" },
  { id: "ct2", number: "CONT-20260520-1002", reservationId: "r2", status: "SIGNED", signedAt: "2026-05-25T14:20:00Z" },
  { id: "ct3", number: "CONT-20260401-1003", reservationId: "r3", status: "SIGNED", signedAt: "2026-04-05T09:10:00Z" },
  { id: "ct4", number: "CONT-20260705-1004", reservationId: "r6", status: "SIGNED", signedAt: "2026-07-06T16:00:00Z" },
];

export const seedPayments: Payment[] = [
  { id: "p1", stripeId: "pi_3Nf8Zx2eZ", reservationId: "r1", amount: 260, status: "PENDING" },
  { id: "p2", stripeId: "pi_3Ma1Kq9dL", reservationId: "r2", amount: 840, status: "COMPLETED", date: "2026-05-25T14:25:00Z" },
  { id: "p3", stripeId: "pi_3Lb7Yt4fP", reservationId: "r3", amount: 140, status: "COMPLETED", date: "2026-04-05T09:15:00Z" },
  { id: "p4", stripeId: "pi_3Kc2Wr6gX", reservationId: "r6", amount: 380, status: "COMPLETED", date: "2026-07-06T16:05:00Z" },
];

export const seedReviews: Review[] = [
  { id: "rev1", userId: "u2", carId: "car1", reservationId: "r3", rating: 5, comment: "Voiture impeccable, parfaite pour la ville. Prise en charge rapide et sympathique !", date: "2026-04-15T10:00:00Z" },
  { id: "rev2", userId: "u3", carId: "car1", reservationId: "r5", rating: 4, comment: "Très bonne petite voiture, économique. Un léger bruit moteur mais rien de gênant.", date: "2026-03-22T14:30:00Z" },
  { id: "rev3", userId: "u3", carId: "car3", reservationId: "r6", rating: 5, comment: "Expérience incroyable avec la Tesla ! Silencieuse, rapide et l'autopilote est bluffant.", date: "2026-05-10T09:00:00Z" },
  { id: "rev4", userId: "u2", carId: "car4", reservationId: "r2", rating: 4, comment: "SUV très confortable et spacieux. Consommation raisonnable pour sa taille.", date: "2026-06-10T11:00:00Z" },
];

export const seedNotifications: AppNotification[] = [
  { id: "n1", userId: "u2", type: "RESERVATION", title: "Réservation confirmée", message: "Votre réservation de la Peugeot 308 a été confirmée par l'agence.", read: false, date: "2026-07-09T08:00:00Z", link: "/reservation/r1" },
  { id: "n2", userId: "u2", type: "CONTRACT", title: "Contrat prêt à signer", message: "Le contrat CONT-20260708-1001 est disponible. Merci de le signer.", read: false, date: "2026-07-09T08:05:00Z", link: "/contract/r1" },
  { id: "n3", userId: "u2", type: "PAYMENT", title: "Paiement en attente", message: "Un paiement de 260 DT est en attente pour votre réservation.", read: true, date: "2026-07-09T08:10:00Z", link: "/payment/r1" },
  { id: "n4", userId: "u2", type: "SYSTEM", title: "Bienvenue chez RentCar", message: "Merci d'avoir rejoint RentCar. Profitez de 10% sur votre première location !", read: true, date: "2026-01-15T14:30:00Z" },
  { id: "n5", userId: "u1", type: "RESERVATION", title: "Nouvelle réservation", message: "Une nouvelle réservation en attente nécessite votre confirmation.", read: false, date: "2026-07-10T18:05:00Z", link: "/admin/reservations" },
  { id: "n6", userId: "u1", type: "PAYMENT", title: "Paiement reçu", message: "Paiement de 380 DT reçu de Thomas Moreau.", read: false, date: "2026-07-06T16:05:00Z", link: "/admin/payments" },
];

export const FUEL_LEVELS = ["Vide", "Quart", "Moitié", "Trois-quarts", "Plein"] as const;
export const FUEL_TYPES = ["Essence", "Diesel", "Hybride", "Électrique"] as const;
export const TRANSMISSIONS = ["Manuelle", "Automatique"] as const;
export const CATEGORY_NAMES = ["Économique", "Berline", "SUV", "Luxe"] as const;
