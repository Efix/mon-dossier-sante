# Image de la version web, construite depuis un simple clone du dépôt : aucun Node ni npm requis sur la machine.
#   docker compose -f deploiement/compose.yaml up -d --build
# ou
#   docker build -f deploiement/Dockerfile -t mon-dossier-sante .
#
# Pour une image reproductible, remplace les étiquettes par leur empreinte (image@sha256:…).

# Étape 1 : les pages publiées, tirées des tags git vX.Y.Z. Seules les versions notées dans
# deploiement/versions-publiees.txt sont acceptées, avec l'empreinte qui y figure.
FROM node:22-alpine AS publication
RUN apk add --no-cache git
WORKDIR /depot
COPY . .
RUN git config --global --add safe.directory /depot \
 && node outils/publier.mjs --registre

# Étape 2 : un serveur nginx sans privilèges qui ne sert que ces pages. Ni Node, ni git, ni l'historique
# du dépôt n'entrent dans l'image finale.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploiement/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploiement/entetes-securite.conf /etc/nginx/entetes-securite.conf
COPY --from=publication /depot/publication/ /usr/share/nginx/html/

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
