Je conçois un site de location de voitures "RentCar". 
Voici TOUTES les pages pour les espaces Client et Admin.

═══════════════════════════════════════════════
AUTHENTIFICATION
═══════════════════════════════════════════════

PAGE 1 : CONNEXION (/login)
─────────────────────────────
Même page pour Client et Admin. Après connexion, redirection automatique selon le rôle.

Formulaire :
- Email (obligatoire)
- Mot de passe (obligatoire, avec icône œil)
- Checkbox "Se souvenir de moi"
- Bouton "Se connecter"
- Lien "Mot de passe oublié ?"
- Lien "Pas de compte ? S'inscrire →"

États : Normal, Erreur "Email ou mot de passe incorrect", Chargement (spinner), Succès (redirection admin→dashboard, client→home)

═══════════════════════════════════════════════

PAGE 2 : INSCRIPTION (/register)
──────────────────────────────────
Réservé aux clients.

Formulaire :
- Prénom, Nom, Email, Mot de passe (min 6 caractères)
- Téléphone, Adresse, Numéro de permis (optionnels)
- Bouton "Créer mon compte"
- Lien "Déjà un compte ? Se connecter →"

États : Normal, Erreur validation, Erreur "Email déjà utilisé", Chargement, Succès

═══════════════════════════════════════════════

PAGE 3 : MOT DE PASSE OUBLIÉ (/forgot-password)
──────────────────────────────────────────────────
Formulaire : Email + bouton "Envoyer le lien"
États : Normal, Succès "Email envoyé !"

═══════════════════════════════════════════════
ESPACE CLIENT
═══════════════════════════════════════════════

PAGE 4 : LISTE DES VOITURES (/cars) - PUBLIC
──────────────────────────────────────────────
- Barre de recherche avec filtres (marque, carburant, transmission, prix)
- Navigation par catégories : Économique, Berline, SUV, Luxe
- Grille 3 colonnes : photo, badge catégorie, marque+modèle+année, note⭐+nb avis, icônes techniques, prix/jour, badge statut, bouton "Voir détails"
États : Normal, Vide, Chargement

═══════════════════════════════════════════════

PAGE 5 : DÉTAIL VOITURE (/cars/:id) - PUBLIC
───────────────────────────────────────────────
- Galerie photos avec miniatures cliquables
- Colonne gauche : infos voiture, caractéristiques techniques
- Colonne droite : carte réservation (dates, lieux, calcul prix, bouton "Réserver")
- Section avis : note moyenne, barres répartition 1-5⭐, liste des avis
États : Normal, Vide "Aucun avis"

═══════════════════════════════════════════════

PAGE 6 : MES RÉSERVATIONS (/my-reservations) - CLIENT
───────────────────────────────────────────────────────
Onglets : Toutes | En attente | Confirmées | En cours | Terminées | Annulées
Tableau : ID, Voiture, Dates, Montant, Statut(badge), Actions
Badges : PENDING(jaune), CONFIRMED(bleu), IN_PROGRESS(vert), COMPLETED(gris), CANCELLED(rouge)
Actions : [Annuler] [Voir contrat] [Signer] [Payer] [Avis⭐] [Détails]
États : Normal, Vide

═══════════════════════════════════════════════

PAGE 7 : DÉTAIL RÉSERVATION (/reservation/:id) - CLIENT
──────────────────────────────────────────────────────────
- En-tête ID + badge statut
- Timeline : PENDING→CONFIRMED→IN_PROGRESS→COMPLETED
- Cartes : Véhicule, Client, Location, Paiement
- Section État des lieux (si IN_PROGRESS/COMPLETED)
- Actions contextuelles selon statut

═══════════════════════════════════════════════

PAGE 8 : CONTRAT (/contract/:reservationId) - CLIENT
───────────────────────────────────────────────────────
- Document style papier avec en-tête, sections numérotées (1 à 5)
- Section Signatures : Agence ✅, Client (DRAFT→⏳+bouton signer, SIGNED→✅+bouton payer)
Badges : DRAFT(gris), SIGNED(vert), CANCELLED(rouge)

═══════════════════════════════════════════════

PAGE 9 : PAIEMENT (/payment/:reservationId) - CLIENT
───────────────────────────────────────────────────────
- Résumé commande + montant
- Bouton [Payer X€] → Stripe Elements
- Historique paiement avec badge : PENDING(orange), COMPLETED(vert), FAILED(rouge), REFUNDED(gris)
États : Avant paiement, En cours, Réussi, Échoué, Remboursé

═══════════════════════════════════════════════

PAGE 10 : MES AVIS (/my-reviews) - CLIENT
───────────────────────────────────────────
Liste : photo voiture, marque+modèle, note⭐, commentaire, date
États : Normal, Vide

MODALE DONNER MON AVIS ⭐ :
- Étoiles interactives 1-5 + commentaire + bouton [Publier]
- États : Normal, Déjà noté, Succès

═══════════════════════════════════════════════

PAGE 11 : NOTIFICATIONS (/notifications) - CLIENT
───────────────────────────────────────────────────
Liste avec icônes (📋💰📄⚙️), titre, message, date relative, pastille lue/non lue
Badge 🔔 avec compteur dans navbar
Bouton [Tout marquer comme lu]
États : Normal, Vide

═══════════════════════════════════════════════
ESPACE ADMIN
═══════════════════════════════════════════════

PAGE 12 : DASHBOARD (/admin/dashboard) - ADMIN
─────────────────────────────────────────────────
- 3 lignes de 4 cartes stats (Véhicules, Réservations, Finances)
- Graphique revenus par mois avec sélecteur année
- Top 5 voitures les plus louées
Filtres : Tous | Admin | Client | Actifs | Inactifs

═══════════════════════════════════════════════

PAGE 13 : GESTION RÉSERVATIONS (/admin/reservations) - ADMIN
─────────────────────────────────────────────────────────────
Tableau : ID, Client, Voiture, Dates, Montant, Statut, Actions
Actions : PENDING→[Confirmer], CONFIRMED→[Démarrer], IN_PROGRESS→[Terminer]

═══════════════════════════════════════════════

PAGE 14 : DÉMARRER LOCATION (/admin/reservation/:id/start) - ADMIN
───────────────────────────────────────────────────────────────────
Formulaire : km départ, carburant (dropdown), dégâts (textarea), bouton [Démarrer]

═══════════════════════════════════════════════

PAGE 15 : TERMINER LOCATION (/admin/reservation/:id/complete) - ADMIN
──────────────────────────────────────────────────────────────────────
Formulaire : km retour, carburant (dropdown), dégâts (textarea), bouton [Terminer]

═══════════════════════════════════════════════

PAGE 16 : GESTION VOITURES (/admin/cars) - ADMIN
─────────────────────────────────────────────────
Tableau + bouton [+ Ajouter] → Modale formulaire 2 colonnes avec zone images

═══════════════════════════════════════════════

PAGE 17 : GESTION CATÉGORIES (/admin/categories) - ADMIN
─────────────────────────────────────────────────────────
Tableau + bouton [+ Ajouter] → mini modale

═══════════════════════════════════════════════

PAGE 18 : GESTION CONTRATS (/admin/contracts) - ADMIN
───────────────────────────────────────────────────────
Tableau : N°Contrat, Client, Voiture, Statut, Signé le, Actions (Voir, Annuler)

═══════════════════════════════════════════════

PAGE 19 : GESTION PAIEMENTS (/admin/payments) - ADMIN
────────────────────────────────────────────────────────
Tableau avec badges PENDING(orange), COMPLETED(vert), FAILED(rouge), REFUNDED(gris)
Filtres + Actions [Rembourser]

═══════════════════════════════════════════════

PAGE 20 : GESTION UTILISATEURS (/admin/users) - ADMIN
────────────────────────────────────────────────────────
Tableau : Nom, Email, Rôle(badge), Statut(badge), Actions [Activer/Désactiver] [Changer rôle]
Filtres : Tous | Admin | Client | Actifs | Inactifs

═══════════════════════════════════════════════

PAGE 21 : NOTIFICATIONS ADMIN (/admin/notifications) - ADMIN
───────────────────────────────────────────────────────────────
Même structure que page client avec layout admin (sidebar)
Badge 🔔 avec compteur dans sidebar

═══════════════════════════════════════════════

COMPOSANTS COMMUNS
───────────────────
Navbar client : Logo, Accueil, Réservations, Avis, Notifications(badge), Profil
Sidebar admin : Dashboard, Réservations, Voitures, Catégories, Contrats, Paiements, Utilisateurs

Badges :
- Réservation : PENDING(jaune), CONFIRMED(bleu), IN_PROGRESS(vert), COMPLETED(gris), CANCELLED(rouge)
- Contrat : DRAFT(gris), SIGNED(vert), CANCELLED(rouge)
- Paiement : PENDING(orange), COMPLETED(vert), FAILED(rouge), REFUNDED(gris)
- Rôle : ADMIN(bleu), CLIENT(gris)
- Statut utilisateur : Actif(vert), Inactif(rouge)

Étoiles notation : Or (#F59E0B), interactives en modale, lecture seule en liste

STYLE GLOBAL
────────────
Palette : Bleu(#2563EB), Blanc, Gris clair(#F3F4F6), Or(#F59E0B), Vert(#10B981), Rouge(#EF4444)
Police : Inter
Cartes avec ombre légère au hover
Modales centrées avec overlay
Boutons : Bleu(action), Rouge(danger), Orange(modifier)
Responsive (mobile, tablette, desktop)

╔══════════════════════════════════════════════════════════════╗
║              RENT A CAR - DESIGN SYSTEM COMPLET               ║
╚══════════════════════════════════════════════════════════════╝

Je veux un design ULTRA MODERNE et PROFESSIONNEL pour un site de location 
de voitures "RentCar". Le design doit être EXCEPTIONNEL, digne d'une startup 
de la Silicon Valley.

🎨 CHARTE GRAPHIQUE
─────────────────────
Couleurs principales :
  • Primaire : #2563EB (Bleu électrique)
  • Primaire foncé : #1D4ED8
  • Secondaire : #F59E0B (Or pour étoiles)
  • Succès : #10B981 (Vert émeraude)
  • Erreur : #EF4444 (Rouge vif)
  • Fond : #FFFFFF
  • Fond alternatif : #F8FAFC
  • Texte principal : #1E293B
  • Texte secondaire : #64748B

Typographie : Inter (Google Fonts), poids 400/500/600/700

Images : Utiliser des photos de voitures RÉELLES et ÉLÉGANTES (style Unsplash)
  • Voitures modernes, angles dynamiques, fonds urbains ou nature
  • Pas d'images cartoon ou illustrations basiques

═══════════════════════════════════════════════════════════════
EXIGENCES TECHNIQUES
═══════════════════════════════════════════════════════════════

✅ RESPONSIVE DESIGN OBLIGATOIRE
  • Mobile : 375px - 767px (1 colonne, menu hamburger)
  • Tablette : 768px - 1023px (2 colonnes)
  • Desktop : 1024px+ (3 colonnes, sidebar admin)

✅ ALERTES & NOTIFICATIONS
  • Toast notifications en haut à droite (succès/erreur/warning/info)
  • Animations d'entrée (slide from right) et sortie (fade out)
  • Disparition automatique après 5 secondes
  • Badge rouge sur icône cloche pour notifications non lues

✅ POPUPS & MODALES
  • Modales centrées avec overlay semi-transparent (backdrop blur)
  • Animation d'entrée : scale(0.95) → scale(1) + fadeIn
  • Fermeture : clic outside, bouton X, touche Échap
  • Modales de confirmation : "Êtes-vous sûr ?" avec boutons Annuler/Confirmer

✅ FRAMEWORKS
  • React 18+ avec TypeScript
  • Tailwind CSS 3+ pour le style
  • Headless UI pour les modales, dropdowns, transitions
  • Heroicons pour les icônes
  • React Router v6 pour la navigation
  • React Hot Toast pour les notifications
  • Recharts pour les graphiques du dashboard

═══════════════════════════════════════════════════════════════
COMPOSANTS RÉUTILISABLES
═══════════════════════════════════════════════════════════════

1. Button : variants (primary, secondary, danger, ghost), sizes (sm, md, lg), 
   states (normal, hover, active, disabled, loading avec spinner)

2. Input : label flottant, validation error state (bordure rouge + message), 
   icônes gauche/droite, password toggle (œil)

3. Badge : variants pour chaque statut (success, warning, error, info, neutral)

4. Modal : titre, contenu, footer avec boutons, fermeture multiple

5. Toast : 4 types (success, error, warning, info) avec icônes et barre de progression

6. Card : hover shadow, image zoom, contenu structuré

7. Table : responsive, triable, lignes alternées, actions dropdown

8. StarRating : lecture seule (étoiles or) et interactive (clic 1-5)

9. Skeleton : placeholders animés pour les états de chargement

10. EmptyState : illustration SVG + message + bouton d'action

═══════════════════════════════════════════════════════════════
ESPACE CLIENT - 11 PAGES
═══════════════════════════════════════════════════════════════

LAYOUT : Navbar horizontale fixe en haut avec logo, liens, notifications, avatar

PAGE 1 : ACCUEIL (/)
──────────────────────
Hero section FULL WIDTH avec :
  • Image de fond : voiture de luxe sur route côtière (haute qualité)
  • Overlay gradient : noir 40% → transparent
  • Titre animé : "Votre liberté. Vos routes. Votre voiture." (fadeIn + slideUp)
  • Sous-titre : "Louez la voiture parfaite pour chaque occasion"
  • 2 boutons CTA : [Explorer les voitures] (primaire) [Comment ça marche] (outline)
  • Hauteur : 90vh

Section "Comment ça marche" : 3 étapes avec icônes, numéros, animation au scroll
Section "Voitures populaires" : slider horizontal de 4-5 voitures avec flèches
Footer élégant : 4 colonnes, fond sombre, newsletter

PAGE 2 : LISTE DES VOITURES (/cars)
─────────────────────────────────────
Hero miniature + barre de recherche sticky avec filtres avancés
Grille de cartes animées (fadeIn stagger)
Chaque carte : image avec lazy loading, overlay prix, badges, hover scale(1.03)

PAGE 3 : DÉTAIL VOITURE (/cars/:id)
─────────────────────────────────────
Galerie photos avec lightbox (clic pour agrandir)
Layout 2 colonnes avec réservation rapide en sticky
Section avis avec barres de progression animées

PAGE 4 : CONNEXION (/login)
─────────────────────────────
Design épuré, carte centrée avec animation slideUp
Illustration de voiture à gauche sur desktop

PAGE 5 : INSCRIPTION (/register)
───────────────────────────────────
Même layout que login, formulaire multi-step si beaucoup de champs

PAGE 6 : MES RÉSERVATIONS (/my-reservations)
───────────────────────────────────────────────
Onglets filtrants animés, tableaux responsives, badges colorés

PAGE 7 : DÉTAIL RÉSERVATION (/reservation/:id)
─────────────────────────────────────────────────
Timeline de progression visuelle, sections organisées en cartes

PAGE 8 : CONTRAT (/contract/:reservationId)
──────────────────────────────────────────────
Design "document officiel" avec papier texturé, police serif, signatures

PAGE 9 : PAIEMENT (/payment/:reservationId)
──────────────────────────────────────────────
Interface épurée, carte bancaire stylisée, animation succès avec confettis

PAGE 10 : MES AVIS (/my-reviews)
───────────────────────────────────
Cartes d'avis avec étoiles, photo voiture, date

PAGE 11 : NOTIFICATIONS (/notifications)
───────────────────────────────────────────
Liste avec animations, pastilles lues/non lues, filtres par type

═══════════════════════════════════════════════════════════════
ESPACE ADMIN - 10 PAGES
═══════════════════════════════════════════════════════════════

LAYOUT : Sidebar gauche fixe (dark blue #1E3A5F) + contenu droite

PAGE 12 : DASHBOARD (/admin/dashboard)
─────────────────────────────────────────
Cartes statistiques avec icônes, tendances (% hausse/baisse)
Graphique revenus interactif (Recharts bar chart)
Top voitures en tableau avec mini photos
Widgets actualisables

PAGE 13 : RÉSERVATIONS (/admin/reservations)
───────────────────────────────────────────────
DataTable complète : tri, filtre, recherche, pagination
Actions contextuelles selon statut avec dropdown menu

PAGE 14 : DÉMARRER LOCATION (/admin/reservation/:id/start)
─────────────────────────────────────────────────────────────
Formulaire état des lieux avec validation en temps réel

PAGE 15 : TERMINER LOCATION (/admin/reservation/:id/complete)
────────────────────────────────────────────────────────────────
Même structure que démarrage, comparaison départ vs retour

PAGE 16 : GESTION VOITURES (/admin/cars)
───────────────────────────────────────────
Tableau CRUD complet, modale formulaire 2 colonnes avec upload images

PAGE 17 : CATÉGORIES (/admin/categories)
───────────────────────────────────────────
CRUD simple avec modale inline

PAGE 18 : CONTRATS (/admin/contracts)
────────────────────────────────────────
Tableau avec filtres statut, actions Voir/Annuler

PAGE 19 : PAIEMENTS (/admin/payments)
────────────────────────────────────────
Tableau avec badges, filtre statut, action Rembourser

PAGE 20 : UTILISATEURS (/admin/users)
────────────────────────────────────────
Gestion des rôles et statuts avec toggle switches

PAGE 21 : NOTIFICATIONS ADMIN (/admin/notifications)
───────────────────────────────────────────────────────
Même que client mais dans layout admin

═══════════════════════════════════════════════════════════════
ANIMATIONS & MICRO-INTERACTIONS
═══════════════════════════════════════════════════════════════

✅ Transitions de page fluides (fadeIn + slideUp)
✅ Cartes : hover scale(1.02) avec shadow-lg
✅ Boutons : ripple effect au clic
✅ Images : zoom léger au hover + lazy loading avec blur-up
✅ Notifications : slideIn droite, fadeOut après 5s
✅ Modales : scale + fade, backdrop blur
✅ Tableaux : lignes qui apparaissent en cascade (stagger)
✅ Toggle switches : animation fluide
✅ Squelettes : shimmer effect pour chargement

═══════════════════════════════════════════════════════════════
ÉTATS À GÉRER POUR CHAQUE COMPOSANT
═══════════════════════════════════════════════════════════════

✅ Normal (état par défaut)
✅ Hover (survol souris)
✅ Active (clic en cours)
✅ Focus (navigation clavier)
✅ Disabled (grisé, non cliquable)
✅ Loading (spinner ou squelette)
✅ Empty (aucune donnée, illustration + message)
✅ Error (message d'erreur avec icône)
✅ Success (confirmation verte)