import type {
  AppNotification,
  Car,
  Category,
  Contract,
  Payment,
  Reservation,
  Review,
  User,
} from '../app/data/types'

/**
 * Fabriques d'objets métier.
 * Chaque fabrique produit un objet valide par défaut ; les tests ne
 * surchargent que les champs pertinents pour le cas testé (Object Mother).
 */

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Amine',
  lastName: 'Ben Salah',
  email: 'amine@example.com',
  password: 'Secret123!',
  phone: '20123456',
  address: '12 rue de Tunis',
  licenseNumber: 'LIC-4421',
  role: 'CLIENT',
  active: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  ...overrides,
})

export const makeAdmin = (overrides: Partial<User> = {}): User =>
  makeUser({ id: 'a1', firstName: 'Sofia', lastName: 'Admin', email: 'admin@example.com', role: 'ADMIN', ...overrides })

export const makeCar = (overrides: Partial<Car> = {}): Car => ({
  id: 'c1',
  brand: 'Renault',
  model: 'Clio',
  year: 2024,
  category: 'Économique',
  categoryId: '1',
  plate: '123 TU 4567',
  color: 'Blanc',
  mileage: 12000,
  seats: 5,
  fuel: 'Essence',
  transmission: 'Manuelle',
  pricePerDay: 120,
  status: 'AVAILABLE',
  description: 'Citadine économique et fiable.',
  images: ['https://cdn.example.com/clio.jpg'],
  ...overrides,
})

export const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '1',
  name: 'Économique',
  description: 'Petites voitures économiques',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'r1',
  userId: 'u1',
  carId: 'c1',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  pickupLocation: 'Tunis Carthage',
  returnLocation: 'Tunis Carthage',
  total: 480,
  totalAmount: 480,
  status: 'PENDING',
  createdAt: '2026-02-20T09:00:00.000Z',
  ...overrides,
})

export const makeContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'ct1',
  number: 'CONT-20260220-1234',
  reservationId: 'r1',
  status: 'DRAFT',
  ...overrides,
})

export const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  stripeId: 'pi_123456',
  reservationId: 'r1',
  amount: 480,
  currency: 'TND',
  provider: 'STRIPE',
  status: 'PENDING',
  date: '2026-02-21T09:00:00.000Z',
  createdAt: '2026-02-21T09:00:00.000Z',
  ...overrides,
})

export const makeReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'rev1',
  userId: 'u1',
  carId: 'c1',
  reservationId: 'r1',
  rating: 4,
  comment: 'Très bonne expérience.',
  date: '2026-03-06T12:00:00.000Z',
  userFirstName: 'Amine',
  userLastName: 'Ben Salah',
  ...overrides,
})

export const makeNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n1',
  userId: 'u1',
  type: 'RESERVATION',
  title: 'Réservation confirmée',
  message: 'Le contrat est prêt à être signé.',
  read: false,
  date: '2026-02-21T09:00:00.000Z',
  ...overrides,
})

/** Réponse axios minimale (les services renvoient l'objet axios brut). */
export const axiosResponse = <T,>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {} as never,
})

/** Erreur axios minimale (structure `error.response.data.message`). */
export const axiosError = (status: number, message = 'Erreur serveur') =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { message } },
  })
