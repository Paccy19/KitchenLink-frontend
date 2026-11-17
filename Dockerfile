# KitchenLink website — production image.
# Stage 1 builds the static site with Vite; stage 2 serves it with Caddy
# (SPA fallback, caching and security headers in docker/Caddyfile).
#
# The API address is baked in at build time, so pass it as a build argument:
#   docker build --build-arg VITE_API_BASE_URL=https://api.igikoni.online/api/v1 \
#                --build-arg VITE_UPLOADS_ORIGIN=https://api.igikoni.online .
# (deploy/docker-compose.prod.yml in the backend repo does this for you.)

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_UPLOADS_ORIGIN
ARG VITE_API_TIMEOUT=8000
ARG VITE_CARTO_API_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_UPLOADS_ORIGIN=$VITE_UPLOADS_ORIGIN \
    VITE_API_TIMEOUT=$VITE_API_TIMEOUT \
    VITE_CARTO_API_KEY=$VITE_CARTO_API_KEY \
    VITE_DEMO_MODE=false

# Refuse to build a production site that would call a relative/local API.
RUN case "$VITE_API_BASE_URL" in \
      https://*) ;; \
      *) echo "VITE_API_BASE_URL must be the public https API address (got '$VITE_API_BASE_URL')" >&2; exit 1 ;; \
    esac \
 && npm run build

FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
