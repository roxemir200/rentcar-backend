# Supervision du backend RentCar

Dernière étape du cycle DevOps : **Monitor**. Ce document décrit ce qui est en
place, pourquoi c'est construit ainsi, et les manipulations à faire côté
Grafana Cloud et Render.

## L'architecture, et pourquoi elle a deux chemins

Une seule instrumentation Micrometer alimente deux destinations.

```
                          ┌──────────────────────────────────────┐
                          │  Backend Spring Boot                 │
                          │  (métriques Micrometer)              │
                          └───────┬──────────────────────┬───────┘
                                  │                      │
              /actuator/prometheus│                      │ push OTLP
                   (exposé LOCAL) │                      │ (sortant)
                                  ▼                      ▼
                        ┌──────────────────┐   ┌──────────────────────┐
                        │  Prometheus      │   │  Grafana Cloud       │
                        │  (docker-compose)│   │  (production Render) │
                        └────────┬─────────┘   └──────────────────────┘
                                 ▼
                        ┌──────────────────┐
                        │  Grafana local   │
                        └──────────────────┘
```

**En local, le modèle *pull*.** Prometheus vient chercher les métriques toutes
les 15 secondes sur `/actuator/prometheus`. C'est l'architecture classique,
celle qu'on attend derrière le mot « Prometheus », et elle se démontre au
vidéoprojecteur sans dépendre d'un compte tiers ni du réseau.

**En production, le modèle *push*.** L'application envoie ses métriques à
Grafana Cloud. Ce n'est pas un choix de confort, c'est le seul mode viable :

- l'instance Render gratuite dispose de 512 Mo, déjà occupés par la JVM — il
  n'y a nulle part où héberger un collecteur ;
- le service s'endort après 15 minutes d'inactivité, et son démarrage à froid
  a dépassé 4 minutes. Un scrutateur externe le réveillerait en permanence, ou
  ne récolterait que des trous ;
- pousser n'ouvre **aucun** endpoint. La surface publique du backend reste
  `/actuator/health`, et rien d'autre.

Les deux chemins observent les mêmes compteurs : ce qu'on voit en local est ce
qui remonte en production.

## Ce qui est mesuré

Spring Boot fournit d'office les métriques techniques : mémoire JVM, threads,
pool de connexions Hikari, temps de réponse HTTP par route, pauses du
ramasse-miettes.

S'y ajoutent deux métriques **métier**, qui ne se déduisent d'aucune mesure
système — un backend parfaitement sain peut n'encaisser aucun paiement :

| Métrique | Signification |
|---|---|
| `rentcar_payments_total{status="completed\|failed"}` | Issue de chaque paiement |
| `rentcar_payment_intents_total` | Intentions de paiement créées |

Le rapport entre les deux mesure l'abandon dans le tunnel de paiement.

## Les deux dépendances, et pourquoi il en faut deux

En Spring Boot 4, l'auto-configuration OTLP porte cette condition :

```java
@ConditionalOnClass({ OtlpMeterRegistry.class, OpenTelemetryProperties.class })
```

`micrometer-registry-otlp` fournit la première ; la seconde vient de
**`spring-boot-opentelemetry`**, module sorti du cœur d'Actuator en Boot 4.

Sans lui, la condition échoue **sans le moindre message** : Spring retombe sur
`SimpleMeterRegistry`, l'application démarre normalement, la configuration OTLP
est lue et validée, et rien n'est jamais émis. Un registre existe — il n'envoie
simplement nulle part.

C'est la panne qui a coûté le plus de temps sur ce projet. `MonitoringConfig`
la rend désormais visible au démarrage, et le test `OtlpRegistryContextTest`
échouerait si la dépendance disparaissait du `pom.xml`.

## Utilisation locale

```bash
docker compose up --build
```

| Service | Adresse | Identifiants |
|---|---|---|
| Grafana | http://localhost:3001 | `admin` / `admin` (modifiables via `GRAFANA_USER` et `GRAFANA_PASSWORD`) |
| Prometheus | http://localhost:9090 | — |
| Backend | http://localhost:8089 | — |

Le tableau de bord **RentCar — Backend** est chargé automatiquement, dans le
dossier `RentCar`. Sa définition est versionnée dans
`grafana/provisioning/dashboards/rentcar-backend.json` : elle n'est pas
modifiable depuis l'interface, afin que le fichier reste la source de vérité.

Pour vérifier que la collecte fonctionne, ouvrez
http://localhost:9090/targets : la cible `rentcar-backend` doit être `UP`.

## Mise en place de Grafana Cloud

Les libellés exacts de l'interface évoluent ; la logique, elle, ne change pas.

### 1. Créer la pile

Créez un compte sur [grafana.com](https://grafana.com) et une pile en offre
gratuite, dans une région proche de votre service Render (Europe).

### 2. Relever l'endpoint OTLP et le jeton

Dans votre pile, section **OpenTelemetry** (ou *Connections → OTLP*), relevez :

- l'**URL de la passerelle**, de la forme
  `https://otlp-gateway-prod-eu-west-0.grafana.net/otlp` ;
- l'**identifiant d'instance**, numérique ;
- un **jeton d'accès**, à générer avec la permission d'écriture des métriques.

### 3. Composer l'en-tête d'authentification

Grafana Cloud attend une authentification HTTP *Basic*, dont l'utilisateur est
l'identifiant d'instance et le mot de passe le jeton :

```bash
printf '%s' "IDENTIFIANT_INSTANCE:VOTRE_JETON" | base64 -w0
```

Le résultat s'utilise préfixé de `Basic `.

### 4. Renseigner les variables sur Render

**Render → votre service → Environment** :

| Variable | Valeur |
|---|---|
| `OTLP_ENABLED` | `true` |
| `OTLP_METRICS_URL` | `https://otlp-gateway-<zone>.grafana.net/otlp/v1/metrics` |
| `OTLP_AUTH_HEADER` | `Basic <résultat de l'étape 3>` |
| `APP_ENV` | `production` |
| `OTLP_STEP` | *(facultatif)* `60s` par défaut |

⚠️ **L'URL comporte deux parties que l'on oublie facilement.** Grafana Cloud
affiche la passerelle sous la forme `https://otlp-gateway-<zone>.grafana.net/otlp`
— le segment `/otlp` en fait partie. Il faut y ajouter le chemin du signal,
`/v1/metrics`. D'où :

```
https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics
                                              └──┬──┘└────┬────┘
                                            passerelle   signal
```

Omettre `/otlp` produit une URL qui *paraît* complète, puisqu'elle finit bien
par `/v1/metrics`. Grafana Cloud rejette alors chaque envoi, sans qu'aucune
erreur ne remonte côté application.

Le backend vérifie désormais cette forme au démarrage et journalise :

```
Metriques : export OTLP actif vers https://otlp-gateway-.../otlp/v1/metrics
```

ou, si quelque chose cloche, une ligne `ERROR` qui nomme précisément le
problème. C'est la première chose à regarder dans les logs Render.

`APP_ENV` étiquette toutes les métriques. Sans lui, la production et un poste
de développement qui pousseraient vers la même pile s'additionneraient dans un
seul graphique, sans que rien ne le signale.

### 5. Vérifier

D'abord dans les **logs Render**, au démarrage : la ligne `Metriques : export
OTLP actif vers ...` confirme que la configuration est exploitable.

Ensuite, comptez une à deux fois `OTLP_STEP` — les premières métriques
n'arrivent qu'au premier envoi, pas au démarrage. Puis, dans Grafana Cloud,
ouvrez **Explore** et interrogez :

```promql
jvm_memory_used_bytes{application="rentcar-backend", env="production"}
```

Une série qui apparaît confirme la chaîne complète.

⚠️ N'utilisez pas le bouton **Test connection** de l'assistant OpenTelemetry
pour juger du résultat : il cherche des **traces**, or nous n'envoyons que des
**métriques**. Son message « We could not find any traces yet » est donc
attendu, et ne dit rien de l'état de votre supervision.

## Ce que le pipeline automatise

`backend-cd` ne se contente plus de livrer : après avoir déclenché Render, il
enchaîne trois étapes liées à la supervision. Chacune est **facultative** —
tant que ses secrets ne sont pas renseignés, elle est ignorée et le pipeline
reste vert.

| Étape | Ce qu'elle fait | Secrets requis |
|---|---|---|
| Attente de santé | Interroge `/actuator/health` jusqu'à `UP`, 12 min max | `BACKEND_HEALTH_URL` |
| Publication du tableau de bord | Envoie le JSON versionné vers Grafana Cloud | `GRAFANA_URL`, `GRAFANA_API_TOKEN` |
| Annotation | Pose un repère daté sur les graphiques | `GRAFANA_URL`, `GRAFANA_API_TOKEN` |

**L'attente de santé** ferme une lacune : le hook Render répond immédiatement,
il accuse réception sans rien dire du résultat. Le pipeline déclarait donc
victoire sans jamais vérifier que le service était revenu. Il constate
maintenant que l'application répond et se déclare saine — sans pour autant
prouver qu'il s'agit du nouveau build, ce qui exigerait d'exposer la version.

**La publication du tableau de bord** est ce qui en fait du *code* plutôt
qu'un objet dessiné à la souris : il se relit dans une revue, se corrige par
commit, et se retrouve à l'identique si la pile est recréée. Vous n'avez donc
aucun tableau de bord à construire dans Grafana Cloud — le pipeline s'en
charge à chaque livraison.

**L'annotation** aligne les livraisons sur les courbes. Sans elle, une montée
de latence après un déploiement reste une coïncidence à démontrer.

### Le même fichier pour les deux Grafana

Le tableau de bord ne fige pas l'identifiant de sa source de données : il
déclare une variable `DS_PROM` de type *datasource*. En local elle se résout
sur la source provisionnée, en Grafana Cloud sur celle de la pile. Un
identifiant écrit en dur fonctionnerait ici et afficherait « Datasource not
found » là-bas.

Une seconde variable, `application`, permet de filtrer si plusieurs services
poussent un jour vers la même pile.

### Secrets GitHub à ajouter

| Secret | Valeur |
|---|---|
| `BACKEND_HEALTH_URL` | `https://<votre-service>.onrender.com/actuator/health` |
| `GRAFANA_URL` | L'URL de votre instance Grafana Cloud, **sans** barre finale — de la forme `https://<votre-pile>.grafana.net` |
| `GRAFANA_API_TOKEN` | Jeton de compte de service, rôle *Editor* |

⚠️ `GRAFANA_URL` n'est **pas** l'URL OTLP. Ce sont deux services distincts :
l'un reçoit les métriques, l'autre est l'interface qui les affiche et expose
l'API des tableaux de bord.

Le jeton se crée dans Grafana Cloud : **Administration → Users and access →
Service accounts → Add service account**, rôle *Editor*, puis *Add service
account token*. Il n'est affiché qu'une fois.

## Les deux avertissements du démarrage

Au premier envoi suivant un démarrage à froid, vous verrez souvent :

```
WARN  Failed to publish metrics to OTLP receiver
      java.net.http.HttpConnectTimeoutException: HTTP connect timed out
```

**C'est attendu, et sans conséquence.** L'instance gratuite dispose d'un seul
cœur ; elle vient de passer près de trois minutes à démarrer. Résolution DNS et
poignée de main TLS se disputent alors le processeur, et le délai de connexion
par défaut expire.

Le point de contrôle est simple : `PushMeterRegistry` journalise un `WARN` à
**chaque** échec. Un ou deux avertissements suivis de silence signifient que
les envois suivants ont abouti. Un avertissement **par minute** signale une
panne réelle — et le message dit alors laquelle : `connect timed out` pour un
réseau bloqué, `401` pour une authentification refusée.

Compter les avertissements dit donc davantage que les lire.

## Limites assumées

**Les métriques s'interrompent pendant les mises en veille.** L'application ne
pousse rien quand elle dort. Le ping UptimeRobot toutes les 10 minutes la
maintient éveillée et limite les trous : sans lui, les graphiques seraient
hachés.

**Le frontend n'est pas couvert.** Ce sont des fichiers statiques servis par
un CDN : aucun processus à interroger, ni qui puisse pousser. Sa supervision
relèverait d'une mesure côté navigateur (Web Vitals), ou de l'outillage propre
à Vercel.

**UptimeRobot reste utile.** Il répond à « le service est-il joignable ? » et
alerte ; Grafana répond à « comment se comporte-t-il ? ». Deux étages
distincts du Monitor, complémentaires plutôt que redondants.
