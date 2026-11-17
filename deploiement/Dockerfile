# Image de la version web : un serveur nginx sans privilèges qui sert le dossier publication/.
# Préparer d'abord ce dossier depuis la racine du dépôt : « npm run publier ». Puis :
#   docker build -f deploiement/Dockerfile -t mon-dossier-sante .
#
# Pour une image reproductible, remplace l'étiquette par son empreinte :
#   FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:…
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploiement/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploiement/entetes-securite.conf /etc/nginx/entetes-securite.conf
COPY publication/ /usr/share/nginx/html/

# Utilisateur sans privilèges de l'image de base ; les fichiers servis lui sont en lecture seule.
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
