::install-command
/plugin install aio-bun-fullstack-setup@aiocean-plugins
::

# aio-bun-fullstack-setup

Starting a fullstack project with Bun involves more repetitive setup than it should: a server that proxies to Vite in development but serves static files directly in production, config validation that fails fast on missing env vars, PM2 to run both processes side by side, a multi-stage Dockerfile that builds the frontend then discards those dev dependencies. None of this is hard, but assembling it correctly every time is friction.

This plugin eliminates that friction. It scaffolds the complete monorepo structure in one shot, detects what already exists so it never overwrites your work, and generates only the missing pieces. The result is a project that runs cleanly in development (`pm2 start ecosystem.config.cjs`) and deploys cleanly in production (`docker compose up`) with zero leftover configuration work.

## The architecture it sets up

```
Development:
  Vite (port 3000) --proxy /api --> Bun server (port 3001)

Production:
  Bun server (port 3000) serves both:
    /api/*  -->  API handlers
    /*      -->  Static files from webapp/dist
```

Single port in production means one reverse proxy rule, one health check endpoint, one exposed container port. The Vite proxy in development means hot module replacement works without CORS configuration.

## What gets generated

| File | Purpose |
|---|---|
| `pkgs/server/config.ts` | Env validation — fails at startup if required vars are absent |
| `pkgs/server/index.ts` | Bun server entry, dual-mode (API-only in dev, API + static in prod) |
| `pkgs/webapp/vite.config.ts` | Vite with `/api` proxy pointing at the server |
| `ecosystem.config.cjs` | PM2 config to run webapp and server concurrently in dev |
| `Dockerfile` | Multi-stage build: frontend stage, then production stage |
| `docker-entrypoint.sh` | Single `exec bun run index.ts` |
| `docker-compose.yml` | Service definition with data volume |
| `.env.example` | Documents every env var the server expects |

## Install

```bash
/plugin install aio-bun-fullstack-setup@aiocean-plugins
```

## How it works

Say "scaffold bun project" or "setup bun fullstack". The skill first checks what already exists in your project root, then presents a plan of what it will create before generating anything. Files that already exist are left untouched.

After generation it runs a quick smoke test — starts the server, hits `/api/health`, shuts it down — so you know the scaffold actually works before you build on it.

Trigger phrases: "scaffold bun", "bun fullstack", "bun server", "vite proxy", "bootstrap bun project", "single port", "monorepo bun", "docker bun".

## Requirements

- Bun installed (`bun --version`)
