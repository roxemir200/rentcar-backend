# Tests unitaires — Front-end RentCar

916 tests répartis en 55 fichiers, couvrant les services API, le contexte applicatif,
les composants d'interface et toutes les pages client / admin.

## Lancer les tests

```bash
npm test              # exécution unique (CI)
npm run test:watch    # mode interactif pendant le développement
npm run test:coverage # rapport de couverture (texte + HTML dans coverage/)
```

Le rapport HTML détaillé est généré dans `coverage/index.html`.

## Outillage

| Besoin | Outil | Pourquoi |
| --- | --- | --- |
| Lanceur de tests | **Vitest 3** | Même pipeline de transformation que Vite : aucune configuration Babel/Jest à maintenir, exécution rapide en parallèle. |
| Rendu des composants | **@testing-library/react 16** | Teste ce que l'utilisateur voit (rôles, libellés) plutôt que les détails d'implémentation. |
| Interactions | **@testing-library/user-event 14** | Simule de vraies interactions (focus, frappe, clavier) au lieu d'événements synthétiques. |
| Assertions DOM | **@testing-library/jest-dom** | Matchers lisibles (`toBeDisabled`, `toHaveValue`, …). |
| Environnement | **jsdom** | DOM complet en Node, sans navigateur. |
| Couche HTTP | **axios-mock-adapter** | Branché sur l'instance axios réelle : les intercepteurs (JWT, 401) restent sous test. |
| Couverture | **@vitest/coverage-v8** | Instrumentation native V8, sans transformation supplémentaire. |

## Architecture des tests

```
src/
├── test/                        # Infrastructure partagée (hors couverture)
│   ├── setup.ts                 # Mocks globaux, polyfills jsdom, isolation entre tests
│   ├── test-utils.tsx           # renderWithProviders + fabrique de valeur AppContext
│   ├── factories.ts             # Fabriques d'objets métier (Object Mother)
│   └── mocks/
│       ├── api.ts               # Doubles de tous les services API
│       ├── event-source.ts      # EventSource pilotable (flux SSE)
│       └── stomp.ts             # Client STOMP pilotable (chat WebSocket)
└── app/
    ├── api/__tests__/           # Services HTTP
    ├── context/__tests__/       # AppContext (auth / données / SSE), PrefsContext
    ├── hooks/__tests__/         # useTranslation, useWebSocket
    ├── lib/__tests__/           # format, exporters
    ├── components/**/__tests__/ # Composants communs, layouts, figma
    └── pages/**/__tests__/      # Pages auth, client et admin
```

Les tests sont **co-localisés** avec le code qu'ils vérifient (dossier `__tests__`
voisin du module) : la suite reste facile à retrouver et à faire évoluer.

### `renderWithProviders`

Point d'entrée unique pour rendre un composant dans son environnement réel :

```tsx
const { user, app } = renderWithProviders(<CarDetail />, {
  app: { cars: [makeCar({ id: '1' })], currentUser: makeUser() }, // surcharges AppContext
  route: '/cars/1',      // URL initiale
  path: '/cars/:id',     // pattern de route (expose les params)
  state: { clientSecret: 'pi_x' }, // state de navigation
  lang: 'fr',            // langue i18n
})
```

Il monte `I18nextProvider` (i18n réel, FR par défaut) → `PrefsProvider` (réel) →
`AppContext.Provider` (valeur mockée) → `MemoryRouter`. La valeur d'`AppContext`
retournée dans `app` contient des spies : `expect(app.saveCar).toHaveBeenCalledWith(...)`.

### Stratégie de doublure

| Périmètre testé | Ce qui est réel | Ce qui est mocké |
| --- | --- | --- |
| Services API | axios + intercepteurs | l'adaptateur HTTP (`axios-mock-adapter`) |
| `AppContext` | le provider complet, tout le mapping backend → front | les 13 modules `*.api`, `EventSource` |
| Composants / pages | le composant, i18n, le routeur | `AppContext`, les modules API appelés directement |
| Chat temps réel | `useWebSocket` | `@stomp/stompjs`, `sockjs-client` |

Trois librairies purement visuelles ou à effet de bord sont neutralisées globalement
dans `setup.ts` : `motion/react` (animations), `sonner` (toasts — espionnés pour
vérifier les messages) et `canvas-confetti`.

## Ce qui est couvert

- **Services API** — verbe HTTP, URL, corps et paramètres de chaque endpoint ;
  déballage des enveloppes backend ; injection du JWT ; purge de session et
  redirection sur 401.
- **AppContext** — restauration de session, login/register/logout, profil,
  chargements dépendants du rôle, mapping des DTO backend, cycle de vie complet
  d'une réservation (confirmation → contrat → paiement → remboursement),
  notifications optimistes avec rollback, flux SSE (événements, doublons, toasts,
  reconnexion exponentielle).
- **Composants** — rendu, variantes, états d'erreur/chargement, accessibilité
  (rôles et libellés), interactions clavier et souris.
- **Pages** — états vides / chargement / erreur, validation de formulaire,
  filtres et tris, actions métier et leurs échecs (refus backend, erreur réseau).

## Seuils de couverture

Configurés dans `vitest.config.ts`, la suite échoue si la couverture passe sous :
lignes 80 %, instructions 80 %, fonctions 75 %, branches 70 %.

Couverture actuelle :

| Métrique | Valeur |
| --- | --- |
| Lignes | **98,99 %** |
| Instructions | **98,99 %** |
| Fonctions | **91,55 %** |
| Branches | **89,85 %** |

Le périmètre mesuré est le code applicatif : `api/`, `components/{common,figma,layout}/`,
`context/`, `hooks/`, `lib/`, `pages/`. Sont exclus les primitives shadcn/ui
vendorisées (`components/ui/`), les dictionnaires de traduction (`locales/`, `i18n/`),
les types purs (`data/`) et les points d'entrée (`main.tsx`, `App.tsx`).

## Conventions

1. **Un comportement par test**, nommé en français à la voix active
   (« refuse un mot de passe trop court »), lisible comme une spécification.
2. **Arrange / Act / Assert** séparés par une ligne vide.
3. **Requêtes accessibles d'abord** : `getByRole`, `getByLabelText`, puis le texte ;
   jamais de sélecteur CSS quand une requête accessible existe.
4. **Aucun `data-testid` ajouté au code de production** — les tests s'appuient sur
   l'interface réellement exposée aux utilisateurs.
5. **Cas nominal ET cas limites** : chaque action métier est testée en succès, en
   refus métier (`success: false`) et en erreur réseau.
6. **Fabriques plutôt que fixtures figées** : `makeCar({ status: 'RENTED' })` ne
   déclare que ce qui compte pour le test.
