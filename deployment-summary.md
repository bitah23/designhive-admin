# DesignHive Deployment — File Summary & Context for Claude

This document summarises every deployment-related file in the project so Claude can give accurate, step-by-step deployment guidance. Paste this entire file into Claude.ai when asking for help.

---

## Project Stack (Quick Reference)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, served by Nginx inside Docker |
| Backend | Node.js + Express, runs inside Docker |
| Database | Supabase (hosted PostgreSQL) |
| Email | Gmail API via OAuth2 |
| Auth | JWT stored in localStorage |
| Container registry | GitHub Container Registry (GHCR) |
| CI/CD | GitHub Actions |
| Deployment target | Linux VPS (Ubuntu 22.04 recommended) |

---

## Deployment Architecture

```
Internet
   │
   ▼
VPS Port 3000
   │
Frontend container (Nginx on :3000)
   │  serves React SPA static files
   │  proxies /api/* →
   ▼
Backend container (Express on :5000)
   │
   ├── Supabase (PostgreSQL, hosted externally)
   └── Gmail API (OAuth2, hosted externally)
```

The frontend container's Nginx handles both SPA routing (React Router) and API proxying — no host-level Nginx is required unless you want SSL/domain termination.

---

## File 1 — `Dockerfile.frontend`

Builds the React app and packages it with Nginx.

```dockerfile
# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY email-automation/client/package*.json ./
RUN npm ci
COPY email-automation/client/ .
RUN npm run build

# Stage 2: Runtime — serve with Nginx
FROM nginx:alpine
COPY email-automation/client/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

**Key points:**
- Multi-stage build: Node builds the React app, Nginx serves the static `dist/` output
- Listens on port **3000**
- Uses a custom `nginx.conf` (see File 3)
- `npm ci` requires `package-lock.json` to be committed (it is)

---

## File 2 — `Dockerfile.backend`

Packages the Express API.

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY email-automation/server/package*.json ./
RUN npm ci --omit=dev
COPY email-automation/server/ .
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "index.js"]
```

**Key points:**
- Runs as a non-root user (`nodejs`) for security
- Installs only production dependencies (`--omit=dev`)
- Listens on port **5000**
- Health check hits `GET /api/health` — this endpoint must exist in `server/index.js` (it does)

---

## File 3 — `email-automation/client/nginx.conf`

Nginx config inside the frontend container.

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 20M;

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript ...;

    server {
        listen 3000;
        root /usr/share/nginx/html;
        index index.html;

        # SPA fallback — all routes serve index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets (JS, CSS, images) for 1 year
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Proxy /api/* to the backend container
        location /api/ {
            proxy_pass http://backend:5000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering off;
        }
    }
}
```

**Key points:**
- `proxy_pass http://backend:5000` — `backend` resolves via Docker's internal DNS because both containers are on the same `designhive-network`
- SPA fallback (`try_files`) is required for React Router to work on direct URL loads
- Static assets are aggressively cached (1 year) — Vite adds content hashes to filenames so this is safe

---

## File 4 — `docker-compose.yml`

Defines both containers and their shared network.

```yaml
services:
  frontend:
    image: ghcr.io/${GITHUB_REPOSITORY}/frontend:latest
    container_name: designhive-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - designhive-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  backend:
    image: ghcr.io/${GITHUB_REPOSITORY}/backend:latest
    container_name: designhive-backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
    env_file:
      - .env
    restart: unless-stopped
    networks:
      - designhive-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/health', ...)"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

networks:
  designhive-network:
    driver: bridge
```

**Key points:**
- `${GITHUB_REPOSITORY}` is resolved from the environment at deploy time (set to e.g. `muhammad5330/designhive-admin`)
- Backend reads all secrets from the `.env` file written by the deploy script
- Both containers are on `designhive-network` so Nginx can reach the backend by hostname `backend`
- `restart: unless-stopped` means containers auto-start on VPS reboot

---

## File 5 — `.github/workflows/ci-cd.yml`

GitHub Actions workflow — triggers on every push to `main`.

### Job 1: `build`

1. Checks out the repo
2. Logs in to GHCR using `GHCR_TOKEN` secret
3. Builds `Dockerfile.frontend` → pushes two tags to GHCR:
   - `ghcr.io/<repo>/frontend:latest`
   - `ghcr.io/<repo>/frontend:<git-sha>`
4. Builds `Dockerfile.backend` → pushes two tags:
   - `ghcr.io/<repo>/backend:latest`
   - `ghcr.io/<repo>/backend:<git-sha>`

### Job 2: `deploy` (runs after build succeeds)

1. Sets up SSH using `VPS_SSH_KEY` secret
2. SSHes into the VPS and runs a script that:
   - Exports `GITHUB_REPOSITORY`, `DEPLOY_SHA`, and all app secrets as env vars
   - Creates `/var/www/designhive-admin` if it doesn't exist
   - Clones the repo on first deploy; `git pull origin main` on subsequent deploys
   - Writes a fresh `.env` file with all secrets
   - Logs in to GHCR on the VPS
   - **Pulls images by exact SHA tag** (e.g. `frontend:abc123`) — not `:latest`
   - Re-tags the SHA images as `:latest` so `docker-compose.yml` resolves them
   - Runs `docker compose up -d --pull always --force-recreate`
   - Prunes dangling images

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `VPS_HOST` | IP or hostname of the VPS |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key (ed25519 recommended) |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` + `write:packages` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GMAIL_CLIENT_ID` | Google OAuth2 client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth2 client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth2 refresh token |
| `GMAIL_SENDER_EMAIL` | Outgoing email address |
| `GMAIL_SENDER_NAME` | Display name for outgoing emails |
| `JWT_SECRET` | Secret for signing JWTs (use `openssl rand -hex 64`) |

---

## VPS Prerequisites Checklist

Before the first deploy will succeed, the VPS must have:

- [ ] **Docker Engine** installed (includes `docker compose` as a plugin — Compose V2)
- [ ] **Git** installed
- [ ] The **deploy user** added to the `docker` group (`sudo usermod -aG docker <user>`)
- [ ] `/var/www/designhive-admin` directory created and owned by the deploy user
- [ ] The **public SSH key** added to `~/.ssh/authorized_keys` for the deploy user
- [ ] Firewall allows port **3000** (or 80/443 if using a host Nginx in front)

---

## Changes Made to Fix Deployments Not Updating

The following bugs were fixed. Mentioning them here so Claude understands the current state of the files.

### Bug 1 — Stale Docker image cache (root cause of "changes not reflected")

**Problem:** The old deploy script called `docker compose pull` which fetches the `:latest` tag. Docker's local image cache can silently skip re-downloading if it already has a tag named `:latest` locally — even if the registry has a newer image with the same tag. This meant the VPS containers kept running old code despite a "successful" deploy.

**Fix in `ci-cd.yml`:**
- Added `DEPLOY_SHA: ${{ github.sha }}` to the env block passed to the VPS
- Added `DEPLOY_SHA="$DEPLOY_SHA"` to the SSH inline-env forwarding
- Replaced `docker compose pull` with explicit SHA-based pulls:
  ```bash
  # OLD (broken — could use cached :latest)
  docker compose pull
  docker compose up -d --force-recreate

  # NEW (correct — pulls the exact image built in this CI run)
  docker pull ghcr.io/${GITHUB_REPOSITORY}/frontend:${DEPLOY_SHA}
  docker pull ghcr.io/${GITHUB_REPOSITORY}/backend:${DEPLOY_SHA}
  docker tag ghcr.io/${GITHUB_REPOSITORY}/frontend:${DEPLOY_SHA} ghcr.io/${GITHUB_REPOSITORY}/frontend:latest
  docker tag ghcr.io/${GITHUB_REPOSITORY}/backend:${DEPLOY_SHA} ghcr.io/${GITHUB_REPOSITORY}/backend:latest
  docker compose up -d --pull always --force-recreate
  ```

### Bug 2 — `docker system prune` was too aggressive

**Problem:** `docker system prune -f` removes ALL unused images, volumes, and networks — including images that could be used for a quick rollback.

**Fix:** Changed to `docker image prune -f` which only removes dangling (untagged) images.

```bash
# OLD
docker system prune -f

# NEW
docker image prune -f
```

### Bug 3 — Deprecated `version` field in `docker-compose.yml`

**Problem:** `version: "3.8"` is obsolete in Docker Compose V2 and generates warnings.

**Fix:** Removed the `version` field entirely.

```yaml
# OLD
version: "3.8"
services:
  ...

# NEW
services:
  ...
```

---

## Common Questions for Claude

When pasting this document into Claude.ai, you can ask:

- "Walk me through setting up this VPS from scratch, step by step"
- "How do I generate the GHCR_TOKEN and add it to GitHub Secrets?"
- "How do I create the SSH key pair for the VPS_SSH_KEY secret?"
- "The deploy job is failing at the SSH step — what should I check?"
- "How do I set up SSL with a domain name on this VPS?"
- "How do I manually re-deploy without pushing a commit?"
- "How do I roll back to a previous version?"
