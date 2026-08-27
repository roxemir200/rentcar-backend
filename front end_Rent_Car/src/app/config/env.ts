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
 * Valide qu'une valeur ressemble à une origine HTTP.
 *
 * Sans ce contrôle, une variable mal renseignée est utilisée telle quelle
 * et produit des symptômes indéchiffrables : saisir `VITE_API_URL` dans le
 * champ *valeur* d'une plateforme de déploiement construit l'URL relative
 * `VITE_API_URL/api/...`, que le navigateur résout contre le domaine du
 * frontend. L'hébergeur statique répond alors `405` aux requêtes POST,
 * sans que rien n'indique l'origine du problème.
 */
const looksLikeOrigin = (value?: string): boolean =>
  !!value && /^https?:\/\/.+/i.test(value);

const configuredOrigin = import.meta.env?.VITE_API_URL?.trim();

if (configuredOrigin && !looksLikeOrigin(configuredOrigin)) {
  console.error(
    `[config] VITE_API_URL vaut "${configuredOrigin}", ce qui n'est pas une URL. ` +
      `Attendu : une origine complète, par exemple https://mon-api.onrender.com. ` +
      `Repli sur ${DEFAULT_ORIGIN}. Rappel : Vite fige les variables VITE_* au build — ` +
      `il faut reconstruire après les avoir corrigées.`,
  );
}

/**
 * `||` et non `??` : une variable définie mais vide (cas fréquent des
 * plateformes de déploiement) doit retomber sur la valeur par défaut,
 * ce que `??` ne ferait pas.
 */
const rawOrigin = looksLikeOrigin(configuredOrigin)
  ? (configuredOrigin as string)
  : DEFAULT_ORIGIN;

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

/**
 * Caractères admis dans un jeton porteur : ceux du base64 standard et du
 * base64url, plus le point qui sépare les trois segments d'un JWT. Ni `&`,
 * ni `?`, ni `#`, ni espace — c'est-à-dire aucun des délimiteurs d'une URL.
 */
const TOKEN_PATTERN = /^[\w.~+\/=-]{1,4096}$/;

/**
 * Construit l'URL du flux SSE en y plaçant le jeton d'authentification.
 *
 * Ce détour par le paramètre de requête n'est pas un choix : `EventSource`
 * est la seule API de flux du navigateur, et elle n'accepte aucun en-tête —
 * impossible d'y envoyer un `Authorization: Bearer`. Le jeton doit donc
 * voyager dans l'URL. Le WebSocket du chat, lui, accepte des en-têtes STOMP
 * et n'a pas ce problème : voir `useWebSocket`.
 *
 * Le jeton vient de `localStorage`, que rien ne garantit intact : son contenu
 * est modifiable par n'importe quel script s'exécutant sur le domaine. Inséré
 * tel quel, un jeton contenant `&` ou `#` ne serait pas une valeur mais une
 * suite de paramètres — de quoi détourner la connexion vers autre chose que
 * ce flux. D'où les deux contrôles, dans cet ordre :
 *
 *   1. liste blanche de caractères, et refus pur et simple sinon ;
 *   2. encodage de la valeur, qui neutralise ce qui aurait pu passer.
 *
 * @returns l'URL du flux, ou `null` si le jeton stocké n'est pas exploitable
 */
export function notificationsStreamUrl(token?: string | null): string | null {
  if (!token || !TOKEN_PATTERN.test(token)) return null;
  return `${NOTIFICATIONS_STREAM_URL}?token=${encodeURIComponent(token)}`;
}

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
