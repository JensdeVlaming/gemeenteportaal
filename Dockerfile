# ---- frontend build stage ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
RUN npm run build

# ---- backend build stage ----
FROM golang:1.25.5-alpine AS build
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 go build -o pocketbase

# ---- runtime stage ----
FROM alpine
WORKDIR /app

COPY --from=build /app/backend/pocketbase .
COPY --from=frontend-build /app/frontend/dist ./pb_public_dist
EXPOSE 8090

CMD ["sh", "-c", "rm -rf /app/pb_public; mkdir -p /app/pb_public; cp -a /app/pb_public_dist/. /app/pb_public; exec ./pocketbase serve --http=0.0.0.0:8090"]
