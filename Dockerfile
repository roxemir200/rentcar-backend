# ============================================================
#  Image du backend RentCar — construction multi-etapes
#
#  Etape 1 (build) : JDK complet + Maven pour compiler.
#  Etape 2 (runtime) : JRE seul, sans outils de build.
#
#  L'image finale passe d'environ 450 Mo a ~200 Mo, et la
#  surface d'attaque diminue d'autant : ni compilateur, ni
#  Maven, ni sources dans l'image livree.
#
#  Contexte de build attendu : ./Rent_Car
#    docker build -t rentcar-backend ./Rent_Car
# ============================================================

# ---------- Etape 1 : compilation ----------
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Le pom.xml est copie SEUL, avant les sources. Docker met en cache
# le resultat de cette couche : tant que les dependances ne changent
# pas, une modification de code ne relance pas leur telechargement.
# Inverser ces deux COPY ferait retomber le cache a chaque commit.
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline

COPY src ./src

# Les tests ont deja tourne dans la CI avant d'arriver ici :
# les rejouer doublerait le temps de build sans rien apporter.
RUN mvn -B -ntp clean package -DskipTests


# ---------- Etape 2 : execution ----------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Utilisateur non privilegie. Un conteneur qui tourne en root
# transforme toute evasion en compromission de l'hote.
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /build/target/*.jar app.jar

# Repertoire de televersement, aligne sur app.upload.dir.
# En production, ce chemin doit pointer vers un stockage externe
# (Cloudinary) ou un volume : le disque d'un conteneur est ephemere.
RUN mkdir -p /app/uploads && chown -R app:app /app

USER app

EXPOSE 8089

# Sonde de vivacite interne. La plateforme d'hebergement a sa
# propre sonde HTTP, mais celle-ci rend `docker ps` et
# `docker compose` capables de distinguer "demarre" de "pret".
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:${PORT:-8089}/actuator/health || exit 1

# MaxRAMPercentage : sans cette option, la JVM ignore la limite
#   memoire du conteneur et se fait tuer (OOMKill) sur une petite
#   instance. C'est la premiere cause d'echec en hebergement gratuit.
# UseSerialGC : sur un conteneur de 512 Mo, le ramasse-miettes serie
#   consomme nettement moins de memoire que G1, choisi par defaut.
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75 -XX:+UseSerialGC -jar app.jar"]
