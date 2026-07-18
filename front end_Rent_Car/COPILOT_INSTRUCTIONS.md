╔══════════════════════════════════════════════════════════════╗
║     INSTRUCTIONS IMPORTANTES - LIS CECI AVANT TOUT CODE     ║
╚══════════════════════════════════════════════════════════════╝

📌 TON RÔLE
────────────
Tu es un développeur React senior. Tu travailles SUR LE FRONTEND UNIQUEMENT.
Le backend Spring Boot est TERMINÉ et FONCTIONNEL. Tu ne dois JAMAIS suggérer
de modifier le code backend.

📌 ARCHITECTURE GLOBALE
─────────────────────────
Le projet est une application de location de voitures "RentCar" basée en Tunisie.

Backend : Spring Boot 4.1.0 sur http://localhost:8089
Frontend : React 18 + Vite + Tailwind CSS 4 (sur http://localhost:5173)

📌 BASE DE DONNÉES (MySQL)
─────────────────────────────
Le backend utilise MySQL avec les tables suivantes :
- users (id, firstName, lastName, email, password, phoneNumber, address, drivingLicenseNumber, role, isActive)
- cars (id, brand, model, year, registrationNumber, color, mileage, seats, fuelType, transmission, dailyRate, status, category_id)
- car_categories (id, name, description)
- car_images (id, imageUrl, isPrimary, car_id)
- reservations (id, startDate, endDate, pickupLocation, returnLocation, totalAmount, status, client_id, car_id, mileageStart, mileageEnd, fuelLevelStart, fuelLevelEnd, damagesAtStart, damagesAtEnd)
- contracts (id, contractNumber, terms, pdfUrl, status, signedAt, reservation_id)
- payments (id, provider, externalPaymentId, amount, currency, status, paymentDate, reservation_id)
- reviews (id, rating, comment, client_id, car_id, reservation_id)
- notifications (id, title, message, type, isRead, user_id)

📌 AUTHENTIFICATION
─────────────────────
Système JWT (JSON Web Token).
- POST /api/auth/register → Inscription client
- POST /api/auth/login → Connexion (retourne token + role)
- GET /api/auth/me → Profil utilisateur
- PUT /api/auth/profile → Mise à jour profil

Le token doit être envoyé dans le header : Authorization: Bearer <token>

📌 RÔLES
─────────
- CLIENT : Peut voir les voitures, réserver, signer contrat, payer, donner avis
- ADMIN : Gère tout (dashboard, réservations, voitures, utilisateurs)

📌 FORMAT DES RÉPONSES API
─────────────────────────────
Toutes les réponses suivent ce format :
{
  "success": true/false,
  "message": "message descriptif",
  "data": { ... },
  "timestamp": "2026-07-14T10:00:00"
}

📌 ENDPOINTS PRINCIPAUX
──────────────────────────

AUTHENTIFICATION :
  POST /api/auth/register  → { firstName, lastName, email, password, phoneNumber?, address?, drivingLicenseNumber? }
  POST /api/auth/login     → { email, password } → { token, type, id, email, firstName, lastName, role }
  GET /api/auth/me?email=x → UserResponse
  PUT /api/auth/profile    → { firstName, lastName, phoneNumber?, address?, drivingLicenseNumber? }

VOITURES :
  GET /api/cars                        → Liste voitures actives
  GET /api/cars/available              → Voitures disponibles
  GET /api/cars/:id                    → Détail voiture
  GET /api/cars/search?brand=&fuel=&... → Recherche filtrée
  POST /api/admin/cars                 → Ajouter (ADMIN)
  PUT /api/admin/cars/:id              → Modifier (ADMIN)
  DELETE /api/admin/cars/:id           → Supprimer (ADMIN)

CATÉGORIES :
  GET /api/categories                  → Liste catégories
  POST /api/admin/categories           → Ajouter (ADMIN)

RÉSERVATIONS :
  POST /api/reservations               → Créer (CLIENT)
  GET /api/reservations/my-reservations → Mes réservations (CLIENT)
  GET /api/reservations/:id            → Détail réservation
  PUT /api/reservations/:id/cancel     → Annuler
  GET /api/admin/reservations          → Toutes (ADMIN)
  PUT /api/admin/reservations/:id/confirm → Confirmer (ADMIN)
  PUT /api/admin/reservations/:id/start  → Démarrer (ADMIN)
  PUT /api/admin/reservations/:id/complete → Terminer (ADMIN)

CONTRATS :
  POST /api/admin/contracts/generate/:id → Générer (ADMIN)
  PUT /api/contracts/:id/sign           → Signer (CLIENT)
  GET /api/contracts/reservation/:id    → Voir contrat
  PUT /api/admin/contracts/:id/cancel   → Annuler (ADMIN)

PAIEMENTS (Stripe) :
  POST /api/payments/create-intent      → Créer paiement (CLIENT)
  GET /api/payments/reservation/:id     → Voir paiement
  POST /api/admin/payments/:id/refund   → Rembourser (ADMIN)

AVIS :
  POST /api/reviews                     → Donner avis (CLIENT)
  GET /api/reviews/car/:id              → Avis d'une voiture
  GET /api/reviews/my-reviews           → Mes avis (CLIENT)

NOTIFICATIONS (SSE) :
  GET /api/notifications/stream         → Flux temps réel
  GET /api/notifications                → Historique
  PUT /api/notifications/:id/read       → Marquer lue
  PUT /api/notifications/read-all       → Tout marquer lu

DASHBOARD (ADMIN) :
  GET /api/admin/dashboard              → Statistiques
  GET /api/admin/dashboard/revenue      → Revenus par mois
  GET /api/admin/dashboard/top-cars     → Top voitures
  GET /api/admin/users                  → Utilisateurs
  PUT /api/admin/users/:id/toggle-active → Activer/Désactiver
  PUT /api/admin/users/:id/role         → Changer rôle

📌 STATUTS (ÉNUMS)
─────────────────────
Réservation : PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
Voiture : AVAILABLE, RESERVED, RENTED, MAINTENANCE
Contrat : DRAFT, SIGNED, CANCELLED
Paiement : PENDING, COMPLETED, FAILED, REFUNDED

📌 RÈGLES IMPORTANTES
────────────────────────
1. Le backend est sur http://localhost:8089 - ne change JAMAIS ce port
2. Toujours utiliser les vrais endpoints (pas de mock data)
3. Gérer TOUS les états : loading, empty, error, success
4. Prix en TND (Dinar Tunisien) - conversion depuis EUR si nécessaire
5. Site basé en Tunisie : adresses, téléphones tunisiens
6. Utiliser Tailwind CSS 4 + Radix UI pour les composants
7. Utiliser Sonner pour les notifications toast
8. Utiliser React Router 7 pour la navigation