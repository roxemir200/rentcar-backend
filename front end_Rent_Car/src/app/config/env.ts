/**
 * Point d'entrée unique de la configuration d'environnement du frontend.
 *
 * Toutes les URLs pointant vers le backend passent par ce module. Elles
 * étaient auparavant écrites en dur dans cinq fichiers, ce qui rendait
 * l'application inutilisable une fois déployée : le navigateur du visiteur
 * appelait `localhost:8089`, c'est-à-dire sa propre machine.
 *
 * ⚠️ Vite fige les variables `VITE_*` au moment du **build**, pas à
 * l'exécution. Changer l'URL de l'API impose donc de reconstruire — et,
 * dans une image Docker, de les passer en `ARG` à `docker build` et non
 * en variables de `docker run`.
 */

/** Origine utilisée quand aucune variable n'est définie (développement et tests). */
const DEFAULT_ORIGIN = "http://localhost:8089";

/**
 * `||` et non `??` : une variable définie mais vide (cas fréquent des
 * plateformes de déploiement) doit retomber sur la valeur par défaut,
 * ce que `??` ne ferait pas.
 */
const rawOrigin = import.meta.env?.VITE_API_URL?.trim() || DEFAULT_ORIGIN;

/**
 * Origine du backend, sans barre oblique finale.
 * Sert à préfixer les ressources statiques (images téléversées).
 */
export const API_ORIGIN = rawOrigin.replace(/\/+$/, "");

/** Base des appels REST, consommée par l'instance axios. */
export const API_BASE_URL = `${API_ORIGIN}/api`;

/** Point de connexion SockJS / STOMP du chat. */
export const WS_URL = `${API_ORIGIN}/ws`;

/** Flux SSE des notifications temps réel. */
export const NOTIFICATIONS_STREAM_URL = `${API_BASE_URL}/notifications/stream`;

/** Clé publiable Stripe. Publique par conception : elle est destinée au navigateur. */
export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || "";

/**
 * Préfixe une URL d'image relative renvoyée par l'API (`/uploads/...`) par
 * l'origine du backend. Les URLs absolues et les data-URI sont renvoyées
 * telles quelles.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}
