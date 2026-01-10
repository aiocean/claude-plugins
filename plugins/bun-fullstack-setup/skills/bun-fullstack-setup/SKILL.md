---
name: bun-fullstack-setup
description: Setup Bun server serving both API and static frontend on single port. Use when creating fullstack apps, setting up monorepo with frontend/backend, configuring Docker for Bun projects, or when user mentions "single port", "Bun server", "Vite proxy".
---

# Bun Fullstack Setup

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

## 1. Config with Env Validation

Create `config.ts` - validates required env vars at startup, fails fast if missing:

```typescript
// pkgs/server/config.ts
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

export const config = {
  // Required - app fails if missing
  dataDir: required('DATA_DIR'),

  // Optional with defaults
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  get isDev() { return this.nodeEnv === 'development' },
  get isProd() { return this.nodeEnv === 'production' }
}

console.log(`📁 DATA_DIR: ${config.dataDir}`)
console.log(`🔌 PORT: ${config.port}`)
```

**Key principle**: Import config first in index.ts to validate before anything else runs.

## 2. Server (Single Port, Dual Mode)

```typescript
// pkgs/server/index.ts
import { config } from './config'  // Validate env first!
import { serve, file } from 'bun'
import { join } from 'path'

const STATIC_DIR = join(import.meta.dir, '../webapp/dist')

serve({
  port: config.port,
  routes: {
    // API routes
    '/api/items': () => listItems(),
    '/api/items/:id': req => getItem(req.params.id),
    // ... more routes
  },

  async fetch(req) {
    // Production: serve static files for non-API routes
    if (config.isProd) {
      const url = new URL(req.url)
      let pathname = url.pathname

      // SPA: serve index.html for routes without extension
      if (pathname === '/' || !pathname.includes('.')) {
        pathname = '/index.html'
      }

      const f = file(join(STATIC_DIR, pathname))
      if (await f.exists()) return new Response(f)

      // Fallback to index.html for SPA routing
      return new Response(file(join(STATIC_DIR, 'index.html')))
    }

    return new Response('Not found', { status: 404 })
  }
})

console.log(`🚀 Server running at http://localhost:${config.port}`)
if (config.isProd) console.log(`📦 Serving static files from ${STATIC_DIR}`)
```

## 3. Vite Proxy (Development)

```typescript
// pkgs/webapp/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

## 4. PM2 Config (Development)

```javascript
// ecosystem.config.cjs
const { join } = require('path')

module.exports = {
  apps: [
    {
      name: 'webapp',
      cwd: './pkgs/webapp',
      script: 'bunx',
      args: 'vite',
    },
    {
      name: 'server',
      cwd: './pkgs/server',
      script: 'bun',
      args: '--watch index.ts',
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
        DATA_DIR: join(__dirname, 'data'),
      },
    },
  ],
}
```

## 5. Docker Setup

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

## 6. .env.example

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
