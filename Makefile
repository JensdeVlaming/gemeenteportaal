SHELL := /bin/bash

BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: backend frontend install backend-install frontend-install compose-dev compose-prod compose-dev-down compose-prod-down

## backend: start PocketBase backend (exits when you hit Ctrl+C)
backend:
\tcd $(BACKEND_DIR) && go run .

## frontend: start the Vite dev server
frontend:
\tcd $(FRONTEND_DIR) && npm run dev -- --host 0.0.0.0

## backend-install: install backend dependencies
backend-install:
\tcd $(BACKEND_DIR) && go mod download

## frontend-install: install frontend dependencies
frontend-install:
\tcd $(FRONTEND_DIR) && npm install

## install: install both frontend + backend dependencies
install: backend-install frontend-install

## compose-dev: start dev services (backend, frontend watcher, mailpit)
compose-dev:
	docker compose -f docker-compose.dev.yml up --build

## compose-prod: start prod services (backend only)
compose-prod:
	docker compose -f docker-compose.prod.yml up --build -d

## compose-dev-down: stop dev services
compose-dev-down:
	docker compose -f docker-compose.dev.yml down

## compose-prod-down: stop prod services
compose-prod-down:
	docker compose -f docker-compose.prod.yml down
