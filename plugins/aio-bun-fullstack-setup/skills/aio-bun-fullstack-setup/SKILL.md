---
name: aio-bun-fullstack-setup
description: |
  Bootstrap or scaffold a Bun fullstack project in one shot — single-port server, Vite dev proxy, monorepo layout,
  and Docker config. Use when starting a new fullstack project with Bun, setting up a bun server with vite proxy,
  creating a monorepo bun layout, configuring docker bun deployment, or bootstrapping a bun project from scratch.
  Skips files that already exist so it never overwrites your work.
when_to_use: scaffold bun, bun fullstack, bun server, vite proxy, single port, monorepo bun, docker bun, bootstrap bun project, new fullstack project
argument-hint: "Project name or path (e.g. my-app)"
effort: medium
---

# Bun Fullstack Setup

## Environment
- bun: !`bun --version 2>/dev/null || echo "NOT INSTALLED"`

## Scaffold Mode (when setting up a new project)

Use this mode to bootstrap a Bun fullstack project, filling in only what is missing.

### Step 1: DETECT
Check what already exists in the project root:
```bash
ls -la package.json bun.lock* Dockerfile docker-compose.yml docker-entrypoint.sh ecosystem.config.cjs .env.example 2>/dev/null
ls -la pkgs/server/index.ts pkgs/server/config.ts pkgs/webapp/vite.config.ts pkgs/shared/ 2>/dev/null
```

### Step 2: PLAN
Compare against the full project structure and list what needs to be created:

| File | Purpose | Exists? |
|------|---------|---------|
| `pkgs/shared/package.json` | Shared types package (required by Dockerfile COPY steps) | ? |
| `pkgs/server/config.ts` | Env validation, fail-fast startup | ? |
| `pkgs/server/index.ts` | Bun server entry (API + static serving) | ? |
| `pkgs/webapp/vite.config.ts` | Vite config with API proxy | ? |
| `ecosystem.config.cjs` | PM2 dev runner (webapp + server) | ? |
| `Dockerfile` | Multi-stage production build | ? |
| `docker-entrypoint.sh` | Container entry script | ? |
| `docker-compose.yml` | Container orchestration | ? |
| `.env.example` | Environment variable documentation | ? |

Present the plan to the user before generating.

### Step 3: GENERATE
Create each missing file using the templates in the Reference section below. Adapt ports, paths, and env vars to match the user's project name and requirements.

### Step 4: VERIFY
Run a quick validation:
```bash
cd pkgs/server && DATA_DIR=./data PORT=3001 bun run index.ts &
SERVER_PID=$!
for i in $(seq 1 15); do
  curl -sf http://localhost:3001/api/health && break
  sleep 1
done
kill $SERVER_PID 2>/dev/null
```
If webapp exists, also verify: `cd pkgs/webapp && bun run build`

---

## Reference Mode (templates and patterns)

Pattern for Bun server that serves API + static frontend on single port in production, with Vite proxy in development.

## Architecture

```
Development:
  Vite (3000) --proxy /api--> Bun Server (3001)

Production:
  Bun Server (3000) serves both:
    /api/*  → API handlers
    /*      → Static files (webapp/dist)
```

## 1. Shared Package

Create `pkgs/shared/package.json` — required by both Dockerfile stages that `COPY pkgs/shared/package.json` before running `bun install`:

```json
{
  "name": "@project/shared",
  "version": "0.0.1",
  "private": true,
  "types": "./index.ts"
}
```

Create `pkgs/shared/index.ts` as the entry point for shared types:

```typescript
// pkgs/shared/index.ts
// Shared types used by both server and webapp
export type {}; // extend with your shared types
```

## 2. Config with Env Validation

Create `config.ts` - validates required env vars at startup, fails fast if missing:

```typescript
// pkgs/server/config.ts
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  // Required - app fails if missing
  dataDir: required("DATA_DIR"),

  // Optional with defaults
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  get isDev() {
    return this.nodeEnv === "development";
  },
  get isProd() {
    return this.nodeEnv === "production";
  },
};

console.log(`📁 DATA_DIR: ${config.dataDir}`);
console.log(`🔌 PORT: ${config.port}`);
```

**Key principle**: Import config first in index.ts to validate before anything else runs.

## 3. Server (Single Port, Dual Mode)

```typescript
// pkgs/server/index.ts
import { config } from "./config"; // Validate env first!
import { serve, file } from "bun";
import { join } from "path";

const STATIC_DIR = join(import.meta.dir, "../webapp/dist");

serve({
  port: config.port,
  routes: {
    // Health check — used by smoke test, load balancers, and Docker HEALTHCHECK
    "/api/health": () => new Response("ok"),

    // API routes
    "/api/items": () => listItems(),
    "/api/items/:id": (req) => getItem(req.params.id),
    // ... more routes
  },

  async fetch(req) {
    // Production: serve static files for non-API routes
    if (config.isProd) {
      const url = new URL(req.url);
      let pathname = url.pathname;

      // SPA: serve index.html for routes without extension
      if (pathname === "/" || !pathname.includes(".")) {
        pathname = "/index.html";
      }

      const f = file(join(STATIC_DIR, pathname));
      if (await f.exists()) return new Response(f);

      // Fallback to index.html for SPA routing
      return new Response(file(join(STATIC_DIR, "index.html")));
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`🚀 Server running at http://localhost:${config.port}`);
if (config.isProd) console.log(`📦 Serving static files from ${STATIC_DIR}`);
```

## 4. Vite Proxy (Development)

```typescript
// pkgs/webapp/vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

## 5. PM2 Config (Development)

```javascript
// ecosystem.config.cjs
const { join } = require("path");

module.exports = {
  apps: [
    {
      name: "webapp",
      cwd: "./pkgs/webapp",
      script: "bunx",
      args: "vite",
    },
    {
      name: "server",
      cwd: "./pkgs/server",
      script: "bun",
      args: "--watch index.ts",
      env: {
        NODE_ENV: "development",
        PORT: "3001",
        DATA_DIR: join(__dirname, "data"),
      },
    },
  ],
};
```

## 6. Docker Setup

**Dockerfile** (multi-stage build):

```dockerfile
# Stage 1: Build frontend
FROM oven/bun:1 AS frontend-builder
WORKDIR /app
COPY package.json bun.lock* ./
COPY pkgs/webapp/package.json ./pkgs/webapp/
COPY pkgs/shared/package.json ./pkgs/shared/
RUN bun install
COPY pkgs/shared ./pkgs/shared
COPY pkgs/webapp ./pkgs/webapp
WORKDIR /app/pkgs/webapp
RUN bun run build

# Stage 2: Production
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock* ./
COPY pkgs/server/package.json ./pkgs/server/
COPY pkgs/shared/package.json ./pkgs/shared/
RUN bun install
COPY pkgs/shared ./pkgs/shared
COPY pkgs/server ./pkgs/server
COPY --from=frontend-builder /app/pkgs/webapp/dist ./pkgs/webapp/dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["./docker-entrypoint.sh"]
```

**docker-entrypoint.sh** (simple, single server):

```bash
#!/bin/bash
set -e
cd /app/pkgs/server
exec bun run index.ts
```

**docker-compose.yml**:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/app/data
```

## 7. .env.example

```bash
# Required
DATA_DIR=/path/to/data

# Optional
PORT=3000
NODE_ENV=development
```

## Project Structure

```
project/
├── pkgs/
│   ├── webapp/          # Frontend (Vite + Vue/React)
│   │   ├── src/
│   │   ├── dist/        # Built static files
│   │   └── vite.config.ts
│   ├── server/          # Backend (Bun)
│   │   ├── config.ts    # Env validation
│   │   ├── index.ts     # Server entry
│   │   └── api.ts       # API handlers
│   └── shared/          # Shared types
├── data/                # Persistent data
├── ecosystem.config.cjs # PM2 config
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh
└── .env.example
```

## Key Principles

1. **Fail fast**: Validate env vars at startup, exit if missing
2. **Single port in prod**: Less complexity, easier deployment
3. **Vite proxy in dev**: Hot reload works, API calls proxied
4. **Config as code**: All paths come from env, not hardcoded
5. **Simple Docker**: One entrypoint, one process
