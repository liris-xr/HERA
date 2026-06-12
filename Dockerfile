# ---- Stage 1: build admin frontend ----
FROM node:20-alpine AS admin-build
WORKDIR /app
COPY frontend/admin/package*.json ./
RUN npm install
COPY frontend/admin/ ./
RUN npm run build

# ---- Stage 2: build user frontend ----
FROM node:20-alpine AS user-build
WORKDIR /app
COPY frontend/user/package*.json ./
RUN npm install
COPY frontend/user/ ./
RUN npm run build

# ---- Stage 3: final image with API + both built frontends ----
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install API dependencies
COPY backend/api/package*.json ./
RUN npm install

# Copy API source
COPY backend/api/ ./

# Generate self-signed certs (so fs.readFileSync doesn't crash)
RUN openssl req -x509 -newkey rsa:2048 -keyout privatekey.key -out certificate.crt -days 365 -nodes -subj "/CN=localhost"

# Copy built frontends into the API's static-serving locations
COPY --from=admin-build /app/dist ./public/editor
COPY --from=user-build /app/dist ./public/viewer

EXPOSE 8080

CMD ["node", "app.js"]