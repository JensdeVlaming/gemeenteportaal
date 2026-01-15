SHELL := /bin/bash

BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: compose-dev compose-prod compose-dev-down compose-prod-down

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
