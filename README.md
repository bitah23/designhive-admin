# DesignHive Admin

Internal admin platform for DesignHive's email marketing: write templates, pick
an audience, send or schedule campaigns, and let a set of background agents
handle drips, re-engagement, and failure recovery. An AI assistant on the
dashboard can drive most of it conversationally.

**Stack:** FastAPI · Supabase (PostgreSQL) · Gmail API · Claude API · static
HTML/CSS/JS frontend

---

## Layout

```
backend/          FastAPI app — routes, agents, services
  main.py         app entry; mounts frontend/ as static files
  routes/         one router per resource, mounted under /api/*
  agents/         one file per automated agent
  services/       Gmail sending and other integrations
  BACKEND.md      backend reference

frontend/         served as-is by the backend, no build step
  *.html          one file per page
  css/app.css     the whole stylesheet
  js/             one script per page, plus shared modules
  FRONTEND.md     frontend reference

assets/           source artwork, not served
  brand-source/   original brand exports
  email-source/   full-resolution email hero art
docs/             production notes and test cases
scripts/          one-off database maintenance
AGENTS.md         what every agent does, and its status
```

---

## Running locally

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # if present; otherwise see Configuration below
uvicorn main:app --reload
```

Then open <http://localhost:8000>. The backend serves the frontend at `/` and
the API under `/api`, so there is nothing else to start. `GET /api/health`
returns `{"status": "ok"}`.

Frontend changes need only a browser reload — there is no bundler.

### Configuration

Environment variables read by `backend/config.py`:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database access |
| `JWT_SECRET` | Signs admin session tokens |
| `WEBHOOK_SECRET` | Verifies inbound webhooks |
| `GMAIL_SENDER_EMAIL`, `GMAIL_SENDER_NAME` | From: header on outbound mail |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Gmail API OAuth |
| `ANTHROPIC_API_KEY` | Content generation and the chat assistant |
| `TABLE_PROFILES`, `TABLE_EMAIL_LOGS` | Table name overrides |

Never commit a populated `.env` — `backend/.env` is gitignored.

---

## Using the admin

Sign in at `/login.html`. Once in:

- **⌘K / Ctrl+K** opens the command palette — jump to any page or run a quick
  action without reaching for the sidebar.
- The **sidebar collapses** to an icon rail; the choice is remembered.
- The **dashboard assistant** can send campaigns, schedule, generate content,
  run agents, and pull stats from a plain-language instruction.

---

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`: it builds the
Dockerfile, pushes to GHCR, and restarts the container on the VPS with secrets
written to `/root/app.env`. The image contains only `backend/` and `frontend/`.

---

## Where to read next

- `AGENTS.md` — every agent, what it does, and whether it is built
- `backend/BACKEND.md` — routes, models, and integrations
- `frontend/FRONTEND.md` — page structure, the icon set, and the stylesheet
- `docs/PRODUCTION_READINESS.md` — deployment checklist
