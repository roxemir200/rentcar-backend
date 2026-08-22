# ============================================================
#  Image du frontend RentCar — construction multi-etapes
#
#  Etape 1 (build) : Node + Vite pour produire dist/.
#  Etape 2 (runtime) : nginx seul, sans Node ni node_modules.
#
#  L'image finale pese quelques dizaines de Mo : elle ne contient
#  que des fichiers statiques et le serveur qui les sert.
#
#  Contexte de build attendu : ./front end_Rent_Car
#    docker build -t rentcar-frontend "./front end_Rent_Car"
#
#  /!\ DIFFERENCE ESSENTIELLE AVEC L'IMAGE DU BACKEND /!\
#
#  Le backend est une image unique, valable pour tous les
#  environnements : sa configuration arrive a l'execution, par
#  variables d'environnement. Ici, c'est impossible. Vite fige les
#  variables VITE_* au moment du BUILD, dans le JavaScript livre au
#  navigateur. Cette image est donc liee a un environnement precis,
#  determine par les ARG ci-dessous. Deployer la meme image ailleurs
#  la ferait appeler la mauvaise API.
# ============================================================

# ---------- Etape 1 : construction ----------
FROM node:20-alpine AS build

WORKDIR /build

# package.json et package-lock.json copies SEULS, avant les sources :
# tant que les dependances ne changent pas, une modification de code
# ne relance pas leur installation. Inverser ces deux COPY ferait
# retomber le cache a chaque commit.
COPY package.json package-lock.json ./
RUN npm ci

# Declares apres npm ci : une valeur d'ARG qui change n'invalide
# alors que les couches suivantes, jamais l'installation.
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

COPY . .

# Les tests ont deja tourne dans la CI : les rejouer ici doublerait
# le temps de build sans rien apporter.
RUN npm run build


# ---------- Etape 2 : execution ----------
# Image non privilegiee : le processus tourne en uid 101, jamais en
# root. Un conteneur root transforme toute evasion en compromission
# de l'hote -- et un serveur web expose est precisement ce qu'on ne
# veut pas voir tourner en root.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 8080

# Sonde interne : rend `docker ps` et `docker compose` capables de
# distinguer "demarre" de "pret a servir".
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:8080/ || exit 1
