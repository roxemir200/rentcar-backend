import { onCLS, onINP, onLCP, type Metric } from "web-vitals";
import { API_BASE_URL } from "../config/env";

/**
 * Mesure l'expérience réellement perçue par les visiteurs, et l'envoie au
 * backend, qui la transforme en métrique Grafana.
 *
 * Pourquoi ce détour : un frontend est un ensemble de fichiers statiques servis
 * par un CDN. Il n'a aucun processus à interroger — ni Prometheus ni personne
 * ne peut venir y chercher quoi que ce soit. Seul le navigateur du visiteur
 * sait combien de temps la page a mis à s'afficher chez lui. C'est donc lui,
 * et lui seul, qui peut le dire.
 *
 * Trois mesures, et trois seulement, parce que ce sont les seules sur
 * lesquelles on peut agir :
 *
 *   LCP  temps d'affichage du contenu principal   → image trop lourde, script bloquant
 *   INP  latence de réponse aux interactions      → travail trop long sur le fil principal
 *   CLS  stabilité visuelle de la mise en page    → éléments sans dimensions réservées
 */

/** Une page émet exactement trois mesures ; le lot ne dépassera jamais cette taille. */
const LOT_MAX = 10;

/**
 * Journalise dans la console du navigateur.
 *
 * La première version de ce fichier avalait toute erreur sans un mot
 * (`.catch(() => {})`) et ne signalait aucun envoi. Résultat : des panneaux
 * vides, et aucun moyen de savoir si la mesure n'avait pas été prise, pas
 * envoyée, ou pas acceptée. Il a fallu instrumenter `fetch` dans la page en
 * production pour l'établir.
 *
 * C'est le même défaut qui a coûté le plus cher côté backend, et pour la même
 * raison : un dispositif de mesure qui ne dit rien quand il ne mesure rien
 * n'est pas silencieux, il est aveugle. Deux lignes de console remplacent une
 * enquête.
 */
function tracer(message: string, details?: unknown): void {
  // eslint-disable-next-line no-console
  console.debug(`[web-vitals] ${message}`, details ?? "");
}

const file: Metric[] = [];

/**
 * Envoie le lot accumulé.
 *
 * `navigator.sendBeacon` et non `fetch` : c'est l'API prévue exactement pour
 * cet instant. Le navigateur prend l'envoi à sa charge et le mène à terme même
 * si la page est détruite dans la milliseconde qui suit. Un `fetch`, même avec
 * `keepalive`, reste soumis au cycle de vie du document.
 *
 * Elle impose en revanche un type de contenu « simple » : `application/json`
 * déclencherait un préflight CORS que `sendBeacon` ne sait pas mener. D'où le
 * `text/plain`, que le backend accepte explicitement pour cette route.
 *
 * `fetch` reste en repli pour les rares navigateurs sans `sendBeacon`.
 */
function envoyer(): void {
  if (file.length === 0) return;

  const lot = file.splice(0, LOT_MAX).map((mesure) => ({
    name: mesure.name,
    value: mesure.value,
    rating: mesure.rating,
    // Le chemin seul : le backend le ramènera à un motif de route connu.
    // Transmettre la chaîne de requête ne servirait qu'à multiplier
    // inutilement les valeurs possibles.
    path: window.location.pathname,
  }));

  const url = `${API_BASE_URL}/public/web-vitals`;
  const corps = JSON.stringify(lot);
  tracer(`envoi de ${lot.length} mesure(s)`, lot.map((m) => `${m.name}=${Math.round(m.value)}`));

  if (typeof navigator.sendBeacon === "function") {
    const accepte = navigator.sendBeacon(url, new Blob([corps], { type: "text/plain;charset=UTF-8" }));
    if (accepte) return;
    tracer("sendBeacon a refuse le lot, repli sur fetch");
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: corps,
    keepalive: true,
  }).catch((erreur) => {
    // Une mesure perdue reste sans conséquence, et sans reprise : mieux vaut
    // cela que retarder la fermeture d'un onglet. Mais elle est desormais dite.
    tracer("envoi impossible", erreur);
  });
}

/** Empile la mesure et l'envoie au prochain tour de boucle, groupée avec les autres. */
let envoiProgramme = false;

function programmerEnvoi(mesure: Metric): void {
  tracer(`mesure relevee : ${mesure.name} = ${Math.round(mesure.value)} (${mesure.rating})`);
  file.push(mesure);
  if (envoiProgramme) return;

  envoiProgramme = true;
  setTimeout(() => {
    envoiProgramme = false;
    envoyer();
  }, 0);
}

/**
 * Démarre la collecte. Appelée une seule fois, au lancement de l'application.
 *
 * En développement, on ne mesure rien : les temps d'un serveur Vite local, avec
 * ses modules non regroupés, n'ont aucun rapport avec ceux d'un visiteur réel.
 * Les mélanger fausserait la seule chose que ces métriques servent à établir.
 */
export function startWebVitals(): void {
  if (import.meta.env?.DEV) {
    tracer("collecte desactivee en developpement");
    return;
  }

  // `reportAllChanges` est LA raison pour laquelle rien ne remontait.
  //
  // Par défaut, ces trois fonctions ne rappellent qu'une fois, au moment où la
  // page disparaît — c'est cohérent de leur point de vue : le LCP n'est
  // définitif qu'à la fin, le CLS s'accumule jusqu'au bout.
  //
  // Mais cette application est une SPA. Un visiteur passe de l'accueil au
  // catalogue puis à une réservation sans jamais recharger la page : l'instant
  // « la page disparaît » n'arrive qu'à la fermeture de l'onglet, souvent
  // jamais. Et lorsqu'il arrive, le navigateur est déjà en train de détruire
  // le document.
  //
  // Avec cette option, chaque évolution est rapportée. Les données remontent
  // pendant la session au lieu d'être suspendues à sa fin.
  const options = { reportAllChanges: true };

  onLCP(programmerEnvoi, options);
  onINP(programmerEnvoi, options);
  onCLS(programmerEnvoi, options);

  // Filet de sécurité : si la page disparaît avant l'envoi différé, on part
  // avec ce qui a été relevé. `visibilitychange` est le seul événement fiable
  // sur mobile, où `beforeunload` ne se déclenche pas.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") envoyer();
  });

  tracer("collecte demarree");
}
