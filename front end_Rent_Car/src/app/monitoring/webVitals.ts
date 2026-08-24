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

const file: Metric[] = [];
let envoiProgramme = false;

/**
 * Envoie le lot accumulé.
 *
 * `keepalive` est indispensable : les Web Vitals se finalisent au moment où la
 * page disparaît — onglet fermé, navigation ailleurs. Une requête ordinaire
 * serait annulée par le navigateur avant d'aboutir. Avec cet indicateur, elle
 * survit à la page.
 *
 * Tout échec est ignoré volontairement. Le backend dort après quinze minutes
 * d'inactivité, et une mesure perdue n'est qu'une mesure perdue : mieux vaut
 * cela que retarder la fermeture d'un onglet. Un dispositif de mesure qui
 * dégrade l'expérience qu'il mesure n'a aucun sens.
 */
function envoyer(): void {
  envoiProgramme = false;
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

  void fetch(`${API_BASE_URL}/public/web-vitals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lot),
    keepalive: true,
  }).catch(() => {
    /* Mesure perdue. Sans conséquence, et sans reprise. */
  });
}

/**
 * Regroupe les mesures avant envoi.
 *
 * Les trois arrivent à quelques millisecondes d'intervalle : les envoyer
 * séparément ferait trois requêtes réseau là où une suffit, sur la page même
 * dont on mesure la rapidité.
 */
function programmerEnvoi(mesure: Metric): void {
  file.push(mesure);
  if (envoiProgramme) return;

  envoiProgramme = true;
  setTimeout(envoyer, 0);
}

/**
 * Démarre la collecte. Appelée une seule fois, au lancement de l'application.
 *
 * En développement, on ne mesure rien : les temps d'un serveur Vite local, avec
 * ses modules non regroupés, n'ont aucun rapport avec ceux d'un visiteur réel.
 * Les mélanger fausserait la seule chose que ces métriques servent à établir.
 */
export function startWebVitals(): void {
  if (import.meta.env?.DEV) return;

  onLCP(programmerEnvoi);
  onINP(programmerEnvoi);
  onCLS(programmerEnvoi);

  // Filet de sécurité : si la page disparaît avant l'envoi différé, on part
  // avec ce qui a été relevé. `visibilitychange` est le seul événement fiable
  // sur mobile, où `beforeunload` ne se déclenche pas.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") envoyer();
  });
}
