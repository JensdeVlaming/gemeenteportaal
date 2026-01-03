SHELL := /bin/bash

SUPABASE_DIR := supabase
WEB_DIR := web

.PHONY: start-supabase stop-supabase web install

## start-supabase: start the Supabase local services (exits when you hit Ctrl+C)
start-supabase:
\tcd $(SUPABASE_DIR) && supabase start

## stop-supabase: stop any running Supabase services started with the CLI
stop-supabase:
\tcd $(SUPABASE_DIR) && supabase stop

## web: start the Vite dev server
web:
\tcd $(WEB_DIR) && npm run dev -- --host 0.0.0.0

## install: install front-end deps (web only, supabase CLI is assumed installed globally)
install:
\tcd $(WEB_DIR) && npm install
