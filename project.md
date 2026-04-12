# DesignHive Admin Panel — Project Reference

## Overview

DesignHive Admin is a full-stack email automation dashboard for managing and sending bulk email campaigns to registered users. It provides an admin interface for managing email templates, sending campaigns via Gmail API, and tracking delivery analytics.

---

## Repository Structure

```
designhive-admin/
├── .env                          # Root-level env vars (used by the server)
├── .gitignore
├── project.md                    # This file
└── email-automation/
    ├── client/                   # React + Vite frontend (SPA)
    │   ├── public/
    │   ├── src/
    │   │   ├── assets/
    │   │   ├── components/
    │   │   │   └── Layout.jsx    # Master layout (sidebar + topbar)
    │   │   ├── pages/
    │   │   │   ├── Analytics.jsx
    │   │   │   ├── Campaign.jsx
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── Login.jsx
    │   │   │   ├── Logs.jsx
    │   │   │   ├── Scheduled.jsx
    │   │   │   ├── Settings.jsx
    │   │   │   ├── Templates.jsx
    │   │   │   ├── TestPreview.jsx
    │   │   │   └── Users.jsx
    │   │   ├── services/
    │   │   │   └── api.js        # Axios instance with JWT interceptor
    │   │   ├── App.jsx           # Router config, lazy-loaded routes
    │   │   └── main.jsx          # React entry point
    │   ├── index.html
    │   ├── vite.config.js
    │   └── package.json
    └── server/                   # Node.js + Express backend (REST API)
        ├── config/
        │   └── supabase.js       # Supabase client initialization
        ├── middleware/
        │   └── auth.js           # JWT verification middleware
        ├── routes/
        │   ├── auth.js           # Login + password management
        │   ├── email.js          # Bulk email sending
        │   ├── logs.js           # Email log retrieval
        │   ├── templates.js      # Template CRUD
        │   └── users.js          # User list
        ├── services/
        │   └── emailService.js   # Gmail API send logic, variable substitution
        ├── index.js              # Express entry point, realtime listener
        └── package.json
```

---

## Tech Stack

### Frontend
| Concern | Library / Version |
|---|---|
| Framework | React 19.2.4 |
| Build tool | Vite 8.0.4 |
| Routing | React Router DOM 7.14.0 |
| UI / Grid | Bootstrap 5.3.8 + React Bootstrap 2.10.10 |
| Forms | React Hook Form 7.72.1 |
| Rich text editor | React Quill New 3.8.3 |
| Charts | Recharts 3.8.1 |
| Animations | Framer Motion 12.38.0 |
| Icons | Lucide React 1.7.0 |
| Notifications | React Hot Toast 2.6.0 + SweetAlert2 11.26.24 |
| HTTP client | Axios 1.15.0 |
| Database client | Supabase JS 2.102.1 (used on frontend for realtime) |

### Backend
| Concern | Library / Version |
|---|---|
| Runtime | Node.js (LTS) |
| Web framework | Express 5.2.1 |
| Authentication | jsonwebtoken 9.0.3 |
| Password hashing | bcryptjs 3.0.3 |
| Database | Supabase / PostgreSQL (@supabase/supabase-js 2.102.1) |
| Email delivery | Gmail API via googleapis 144.0.0 |
| HTML sanitisation | sanitize-html 2.17.2 |
| Concurrency | p-limit 3.1.0 |
| Dev runner | nodemon 3.1.14 |

---

## Architecture

### Data Flow
```
Browser (React SPA)
    │  HTTP/REST (Axios + Bearer JWT)
    ▼
Express API  (port 5000)
    │  Supabase JS SDK
    ▼
Supabase (PostgreSQL)   ←──  Realtime Change Streams ──► server/index.js
    │
    └── Gmail API (OAuth2 refresh token) ──► SMTP delivery
```

### Authentication
1. Admin POSTs credentials to `POST /api/auth/login`.
2. Server checks `admins` table (or falls back to `.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
3. JWT is returned and stored in `localStorage`.
4. Every subsequent API request includes `Authorization: Bearer <token>`.
5. `middleware/auth.js` verifies the JWT and attaches the decoded payload to `req.user`.

### Realtime Welcome Email
- `server/index.js` subscribes to Postgres INSERT events on the `profiles` table.
- When a new user is inserted, the server checks for a template titled **"Welcome"** and sends it automatically via Gmail API.

---

## Database Schema (Supabase / PostgreSQL)

Managed through the Supabase dashboard — no migration files in the repo.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| email | text | |
| (additional columns) | | Extendable |

### `email_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| title | text | Used to match auto-send triggers (e.g. "Welcome") |
| subject | text | Supports `{{variable}}` tokens |
| body | text | HTML; sanitised before save |
| variables | jsonb / text | List of supported variable names |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `email_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_email | text | |
| template_id | uuid (FK → email_templates) | |
| status | text | `"sent"` or `"failed"` |
| timestamp | timestamptz | |
| error_message | text | Null on success |

### `admins`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| email | text | |
| password_hash | text | bcrypt hash |

---

## API Reference

All authenticated routes require `Authorization: Bearer <jwt>` header.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Returns JWT on valid credentials |
| PUT | `/auth/password` | Yes | Update admin password |

### Templates — `/api/templates`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/templates` | Yes | List all templates |
| POST | `/templates` | Yes | Create template (body sanitised) |
| PUT | `/templates/:id` | Yes | Update template |
| DELETE | `/templates/:id` | Yes | Delete template |

### Users — `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Yes | All rows from `profiles` |

### Email — `/api/email`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/email/send` | Yes | Bulk send — body: `{ templateId, userIds: string[] }` |

### Logs — `/api/logs`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/logs` | Yes | All logs ordered by timestamp DESC |

---

## Environment Variables

Place these in `designhive-admin/.env` (used by the Express server).

```env
PORT=5000

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Gmail OAuth2
GMAIL_CLIENT_ID=<oauth-client-id>
GMAIL_CLIENT_SECRET=<oauth-client-secret>
GMAIL_REFRESH_TOKEN=<oauth-refresh-token>
GMAIL_SENDER_EMAIL=support@designhiveai.com.au
GMAIL_SENDER_NAME=DesignHive

# JWT
JWT_SECRET=<strong-random-secret>

# Fallback admin credentials (used if admins table is empty)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=securepassword123
```

> **Security note:** Rotate `JWT_SECRET` and all API keys before production. Never commit `.env` to version control.

---

## Available Scripts

### Client (`email-automation/client/`)
```bash
npm run dev       # Vite dev server (HMR)
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint
```

### Server (`email-automation/server/`)
```bash
npm run dev       # nodemon (auto-restart on change)
npm start         # node index.js (production)
```

---

## VPS Deployment Guide

### Prerequisites on the VPS

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # should print v20.x.x

# 3. Install PM2 (process manager)
npm install -g pm2

# 4. Install Nginx
sudo apt install nginx -y

# 5. Install Git
sudo apt install git -y
```

---

### Step 1 — Clone the Repository

```bash
cd /var/www
sudo mkdir designhive && sudo chown $USER:$USER designhive
cd designhive
git clone <your-repo-url> .
```

---

### Step 2 — Configure Environment Variables

```bash
cp /var/www/designhive/.env.example /var/www/designhive/.env   # if you have one
nano /var/www/designhive/.env
# Paste and fill in all env vars from the section above
```

---

### Step 3 — Install Dependencies & Build Frontend

```bash
# Backend dependencies
cd /var/www/designhive/email-automation/server
npm install --omit=dev

# Frontend dependencies + production build
cd /var/www/designhive/email-automation/client
npm install
npm run build
# Output goes to: email-automation/client/dist/
```

---

### Step 4 — Start the Backend with PM2

```bash
cd /var/www/designhive/email-automation/server
pm2 start index.js --name designhive-api
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Useful PM2 commands:
```bash
pm2 status           # see running processes
pm2 logs designhive-api  # tail logs
pm2 restart designhive-api
pm2 stop designhive-api
```

---

### Step 5 — Configure Nginx

Nginx serves the static frontend files and proxies `/api` calls to the Express server.

```bash
sudo nano /etc/nginx/sites-available/designhive
```

Paste the following (replace `yourdomain.com` with your domain or server IP):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React frontend
    root /var/www/designhive/email-automation/client/dist;
    index index.html;

    # SPA fallback — all non-asset routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/designhive /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Step 6 — (Optional but Recommended) HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Certbot will edit the Nginx config and set up auto-renewal
```

---

### Step 7 — Vite API Base URL

Before building the frontend for production, ensure the Axios base URL in `email-automation/client/src/services/api.js` points to the correct origin. If Nginx proxies `/api` on the same domain this should already be `/api` or `https://yourdomain.com/api`. Rebuild after any change:

```bash
cd /var/www/designhive/email-automation/client
npm run build
```

---

### Step 8 — Firewall

```bash
sudo ufw allow 'Nginx Full'   # ports 80 and 443
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

### Deployment Summary

| Service | How it runs |
|---|---|
| React frontend | Static files served by Nginx from `client/dist/` |
| Express backend | Node.js process managed by PM2 on port 5000 |
| Nginx | Reverse proxy — routes `/api/*` to port 5000, everything else to `dist/` |
| Supabase | Hosted externally (no self-hosting needed) |
| Gmail API | External OAuth2 service (no self-hosting needed) |

---

### Updating the App After Code Changes

```bash
cd /var/www/designhive
git pull

# If server code changed:
cd email-automation/server && npm install --omit=dev
pm2 restart designhive-api

# If client code changed:
cd ../client && npm install && npm run build
# Nginx picks up the new dist/ files immediately — no reload needed
```

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| [email-automation/server/index.js](email-automation/server/index.js) | Express entry point, route mounting, Supabase realtime listener |
| [email-automation/server/services/emailService.js](email-automation/server/services/emailService.js) | Gmail API integration, bulk send, template variable substitution |
| [email-automation/server/middleware/auth.js](email-automation/server/middleware/auth.js) | JWT verification middleware applied to protected routes |
| [email-automation/server/config/supabase.js](email-automation/server/config/supabase.js) | Supabase client initialised with service role key |
| [email-automation/client/src/services/api.js](email-automation/client/src/services/api.js) | Axios instance — sets base URL and injects JWT from localStorage |
| [email-automation/client/src/App.jsx](email-automation/client/src/App.jsx) | React Router setup, lazy-loaded page imports, protected route logic |
| [email-automation/client/src/components/Layout.jsx](email-automation/client/src/components/Layout.jsx) | Shared sidebar/topbar shell wrapping all authenticated pages |
| [.env](.env) | All secrets and configuration — never commit to version control |
