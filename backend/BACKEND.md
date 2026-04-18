# DesignHive Admin — Backend Documentation

**Stack:** Python 3.11+ · FastAPI · Supabase (PostgreSQL) · Gmail API · JWT Auth

**Run:** `pip install -r requirements.txt` → `uvicorn main:app --reload` (from `backend/`)

**API Base URL:** `http://localhost:8000`  
**Auto-generated docs:** `http://localhost:8000/docs`

---

## # File Structure

```
backend/
├── main.py
├── config.py
├── models.py
├── deps.py
├── requirements.txt
├── .env
├── services/
│   └── email.py
└── routes/
    ├── auth.py
    ├── templates.py
    ├── users.py
    ├── email.py
    ├── logs.py
    ├── admins.py
    └── webhooks.py
```

---

## `requirements.txt`

Lists every Python package the backend depends on, pinned to specific versions for reproducible installs.

| Package | Purpose |
|---|---|
| `fastapi` | Web framework — handles routing, validation, dependency injection |
| `uvicorn[standard]` | ASGI server that runs the FastAPI app |
| `python-dotenv` | Loads variables from `.env` into `os.environ` |
| `supabase` | Official Supabase Python client for database queries |
| `python-jose[cryptography]` | JWT encoding and decoding |
| `passlib[bcrypt]` | Secure password hashing and verification |
| `google-api-python-client` | Gmail API client |
| `google-auth-httplib2` | HTTP transport layer for Google API auth |
| `google-auth-oauthlib` | OAuth2 flow helpers for Google APIs |
| `pydantic` | Request/response data validation (bundled with FastAPI, pinned for consistency) |
| `python-multipart` | Required by FastAPI for parsing form data |
| `httpx` | Async HTTP client used internally by the Supabase Python client |

**Install:** `pip install -r requirements.txt`

---

## `.env`

Contains all secrets and configuration values. Never committed to version control.

```env
PORT=8000                        # Port uvicorn listens on

SUPABASE_URL=...                 # Your Supabase project URL
SUPABASE_KEY=...                 # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...    # Service role key (bypasses RLS — used server-side only)

GMAIL_CLIENT_ID=...              # OAuth2 client ID from Google Cloud Console
GMAIL_CLIENT_SECRET=...          # OAuth2 client secret
GMAIL_REFRESH_TOKEN=...          # Long-lived refresh token from OAuth2 playground
GMAIL_SENDER_EMAIL=...           # The Gmail address emails are sent from
GMAIL_SENDER_NAME=...            # Display name shown in the From field

JWT_SECRET=...                   # Random string used to sign and verify JWTs
WEBHOOK_SECRET=...               # Shared secret between Supabase DB trigger and this server
```

> The `SUPABASE_SERVICE_ROLE_KEY` is intentionally used (not the anon key) because the backend performs admin-level DB operations that bypass Row Level Security.

---

## `config.py`

**Purpose:** Initialises shared clients and constants once at startup. Every other file imports from here instead of re-initialising clients individually.

**What it does:**

1. Calls `load_dotenv()` to read the `.env` file.
2. Creates the **Supabase client** using the service role key — this single instance is shared across all route files via `from config import supabase`.
3. Reads and exposes **JWT settings** (`JWT_SECRET`, `JWT_ALGORITHM`) used by both the auth routes and the `deps.py` middleware.
4. Builds the **Gmail API client** — creates a `google.oauth2.credentials.Credentials` object from the refresh token and OAuth2 credentials, then calls `build("gmail", "v1", ...)` to get a ready-to-use Gmail service object. Imported by `services/email.py` as `from config import gmail`.
5. Exposes **sender details** (`GMAIL_SENDER_EMAIL`, `GMAIL_SENDER_NAME`) used when constructing outgoing emails.
6. Exposes the **webhook secret** used by `routes/webhooks.py` to validate incoming Supabase trigger requests.

**Why it exists:** Without this file, every route would need to initialise its own Supabase client and Gmail credentials — wasteful, repetitive, and a maintenance problem if credentials change.

---

## `models.py`

**Purpose:** All Pydantic data models (schemas) for the entire API in one file. FastAPI uses these to automatically validate incoming request bodies and return helpful error messages when data is missing or wrong.

### Auth models

```python
LoginRequest        # email: str, password: str
ResetPasswordRequest # otp: str, new_password: str
```

### Template models

```python
TemplateCreate  # title: str, subject: str, body: str  — all required
TemplateUpdate  # title, subject, body — all Optional, allows partial updates
```

`TemplateUpdate` uses `Optional` fields so a PUT request can update just one field without blanking the others.

### Email models

```python
SendBulkRequest    # template_id: str, user_ids: List[str]
Attachment         # name: str, mime_type: str, data: str (base64)
SendDirectRequest  # to: str, subject: str, body: str, attachments: Optional[List[Attachment]]
```

`Attachment.data` is a base64-encoded string — the frontend reads files with `FileReader`, strips the data-URI prefix, and sends the raw base64.

### Admin models

```python
AdminCreate  # email: str, password: str, name: Optional[str]
```

### Webhook models

```python
WebhookRecord   # id, email, name — all Optional (Supabase may omit columns)
WebhookPayload  # type: str, table: str, record: WebhookRecord
```

`WebhookPayload` mirrors the exact JSON structure Supabase sends when a DB trigger fires.

---

## `deps.py`

**Purpose:** A single reusable FastAPI dependency that protects routes from unauthenticated access.

**How it works:**

1. Uses FastAPI's `HTTPBearer` security scheme — expects an `Authorization: Bearer <token>` header.
2. Decodes the JWT using `python-jose` with the secret and algorithm from `config.py`.
3. If the token is missing, malformed, or expired, raises a `401 Unauthorized` HTTP exception.
4. If valid, returns the decoded payload dict (contains `id` and `email` of the logged-in admin).

**How routes use it:**

```python
@router.get("/some-route")
def my_route(admin = Depends(get_current_admin)):
    print(admin["id"])   # the logged-in admin's ID
    print(admin["email"])
```

FastAPI injects the dependency automatically — the route only executes if the token is valid.

---

## `services/email.py`

**Purpose:** All Gmail API logic — building emails, sending them, and logging results to Supabase. No routes live here, only reusable functions called by the route files.

### `_replace_variables(text, user)`

Substitutes template variables with actual user data:
- `{{name}}` → user's name
- `{{email}}` → user's email address
- `{{date}}` → today's date

### `_build_raw(to, subject, html_body, attachments)`

Constructs an RFC 2822-compliant MIME email using Python's `email.mime` module:
- Creates a `multipart/mixed` message to support attachments
- Attaches the HTML body as `text/html`
- For each attachment: decodes the base64 data, sets the correct MIME type, adds `Content-Disposition` header
- Base64url-encodes the entire message for the Gmail API `raw` field

### `_send_one(template, user)`

Sends a single email for one user:
1. Runs variable substitution on the body and subject
2. Builds the raw MIME message
3. Calls `gmail.users().messages().send()`
4. On success: inserts a `status: "sent"` row into `email_logs`
5. On failure: inserts a `status: "failed"` row with the error message
6. Returns a result dict `{ email, status }`

### `send_bulk_emails(template, users)`

Runs `_send_one` for each user concurrently using `ThreadPoolExecutor` with `max_workers=5` — a maximum of 5 emails are sent at the same time. This prevents Gmail API rate limit errors while still being significantly faster than sequential sending. Returns a list of all result dicts.

### `send_direct_email(to, subject, html_body, attachments)`

Sends a single one-off email (used from the Users page). Does **not** log to `email_logs` because it is a manual, individual send — not a campaign.

---

## `routes/auth.py`

**Prefix:** `/api/auth`

Handles admin authentication and password management.

### `POST /api/auth/login` — Public

**Request:** `{ email, password }`

1. Queries the `admins` table for the given email.
2. Verifies the password against the stored bcrypt hash using `passlib`.
3. Checks `is_active` — deactivated accounts receive a `403 Forbidden`.
4. Returns a signed JWT valid for 7 days containing `{ id, email }`.

**Response:** `{ token: "eyJ..." }`

### `POST /api/auth/reset-request` — Protected

No request body needed — the admin's email is read from their JWT.

1. Generates a random 6-digit numeric OTP.
2. Stores it in a module-level dict `_otp_store` keyed by admin ID, with a 10-minute expiry timestamp.
3. Sends the OTP to the admin's email via `send_direct_email`.

**Response:** `{ message: "Reset code sent to your email" }`

### `POST /api/auth/reset-password` — Protected

**Request:** `{ otp, new_password }`

1. Looks up the OTP in `_otp_store` for the current admin.
2. Checks it hasn't expired.
3. Compares the submitted OTP against the stored one.
4. Hashes the new password with bcrypt and updates `admins` table.
5. Clears the OTP from the store.

**Response:** `{ message: "Password updated successfully" }`

> OTPs are stored in memory — they are cleared on server restart. This is intentional and acceptable for a single-admin-server use case.

---

## `routes/templates.py`

**Prefix:** `/api/templates` — All routes protected

Full CRUD for email templates stored in the `email_templates` Supabase table.

### `GET /api/templates`
Returns all templates ordered by `created_at` descending (newest first).

### `POST /api/templates`
Creates a new template. Accepts `{ title, subject, body }`. Returns the created row.

### `PUT /api/templates/{template_id}`
Updates an existing template. Only fields included in the request body are updated — fields not provided are left unchanged (uses `TemplateUpdate` with all-Optional fields). Raises `400` if the request body contains no fields to update.

### `DELETE /api/templates/{template_id}`
Deletes the template by ID. Returns `{ message: "Template deleted" }`.

---

## `routes/users.py`

**Prefix:** `/api/users` — All routes protected

### `GET /api/users`
Returns all rows from the `profiles` table ordered by `created_at` descending. These are the end-users of the DesignHive platform, not admins.

---

## `routes/email.py`

**Prefix:** `/api/email` — All routes protected

### `POST /api/email/send` — Bulk send

**Request:** `{ template_id, user_ids: [...] }`

1. Fetches the template from `email_templates` by ID.
2. Fetches the selected users from `profiles` by their IDs.
3. Calls `send_bulk_emails(template, users)` — runs up to 5 concurrent sends.
4. Returns per-user results so the frontend can display sent/failed counts.

**Response:** `{ message: "Done", results: [{ email, status }, ...] }`

### `POST /api/email/send-direct` — Direct send

**Request:** `{ to, subject, body, attachments?: [...] }`

Sends a one-off email to a single recipient. Used from the Users page when clicking "Send Email" on an individual user. Supports file attachments (base64-encoded). Does not log to `email_logs`.

**Response:** `{ message: "Email sent" }`

---

## `routes/logs.py`

**Prefix:** `/api/logs` — All routes protected

### `GET /api/logs`

Returns all rows from `email_logs` ordered by `timestamp` descending, with a Supabase JOIN to include the template title:

```sql
SELECT *, email_templates(title) FROM email_logs ORDER BY timestamp DESC
```

Each log row includes:
- `user_email` — who the email was sent to
- `template_id` — which template was used
- `email_templates.title` — the template's name (from the join)
- `status` — `"sent"` or `"failed"`
- `timestamp` — when it was attempted
- `error_message` — null on success, error string on failure

---

## `routes/admins.py`

**Prefix:** `/api/admins` — All routes protected

Manages admin accounts. All responses exclude `password_hash`.

### `GET /api/admins`
Returns all admins (selects `id, email, name, is_active, created_at` — no password hash).

### `POST /api/admins`
**Request:** `{ email, password, name? }`

Creates a new admin account. Checks for duplicate email first. Hashes the password with bcrypt before storing. Sets `is_active: true` by default.

### `PATCH /api/admins/{admin_id}/toggle`
Toggles the `is_active` field of an admin account (active → inactive or vice versa). **Guards against self-deactivation** — you cannot disable your own account.

### `DELETE /api/admins/{admin_id}`
Permanently deletes an admin account. **Guards against self-deletion** — you cannot delete your own account.

---

## `routes/webhooks.py`

**Prefix:** `/api/webhooks` — No JWT auth (public, secured by shared secret header)

### `POST /api/webhooks/welcome`

Called automatically by a **Supabase PostgreSQL trigger** whenever a new row is inserted into the `profiles` table (i.e. a new user signs up).

**Security:** Validates the `x-webhook-secret` header against `WEBHOOK_SECRET` from `.env`. Requests without the correct secret receive a `401 Unauthorized`.

**Flow:**
1. Extracts the new user's `email` and `name` from `body.record`.
2. Queries `email_templates` for a template with "welcome" in the title (case-insensitive).
3. If no template is found, returns a `200` with a skipped message (no error — the trigger always expects a 200).
4. If found, calls `send_bulk_emails(template, [user])` to send the welcome email and log it.

**Why this approach over Supabase Realtime:** A DB trigger fires at the database level — it is reliable regardless of server restarts or WebSocket connection drops. The template is fetched fresh on every call, so changes to the Welcome template take effect immediately.

**Supabase SQL to set up the trigger:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://admin.designhivestudio.ai/api/webhooks/welcome',
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-webhook-secret', 'dh_welcome_wh_8f3a91c2e4b07d56f1a2c3e8b9d0f4e7'
               ),
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  'profiles',
                 'record', row_to_json(NEW)
               )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_insert ON profiles;
CREATE TRIGGER on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();
```

---

## `main.py`

**Purpose:** FastAPI application entry point. Wires everything together.

**What it does:**

1. Creates the `FastAPI` app instance with a title.
2. Adds **CORS middleware** — allows requests from `http://localhost:3000` (Next.js dev server) and `https://admin.designhivestudio.ai` (production). Allows all methods and headers.
3. Mounts all 7 routers at their respective `/api/...` prefixes.
4. Exposes a `GET /api/health` endpoint that returns `{ status: "ok" }` — used by monitoring tools and deployment health checks.

**How to run:**

```bash
# Development (auto-reloads on file changes)
uvicorn main:app --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Auto-generated API docs** are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc) — no extra setup needed, FastAPI generates these from the route definitions and Pydantic models automatically.

---

## Database Tables Referenced

| Table | Used by |
|---|---|
| `admins` | `routes/auth.py`, `routes/admins.py` |
| `profiles` | `routes/users.py`, `routes/email.py`, `routes/webhooks.py` |
| `email_templates` | `routes/templates.py`, `routes/email.py`, `routes/webhooks.py`, `routes/logs.py` |
| `email_logs` | `routes/logs.py`, `services/email.py` |

## API Endpoint Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/reset-request` | JWT | Send OTP to admin email |
| POST | `/api/auth/reset-password` | JWT | Verify OTP, update password |
| GET | `/api/templates` | JWT | List all templates |
| POST | `/api/templates` | JWT | Create template |
| PUT | `/api/templates/{id}` | JWT | Update template |
| DELETE | `/api/templates/{id}` | JWT | Delete template |
| GET | `/api/users` | JWT | List all users |
| POST | `/api/email/send` | JWT | Bulk send campaign |
| POST | `/api/email/send-direct` | JWT | Send to one user |
| GET | `/api/logs` | JWT | List email logs |
| GET | `/api/admins` | JWT | List admins |
| POST | `/api/admins` | JWT | Create admin |
| PATCH | `/api/admins/{id}/toggle` | JWT | Toggle admin active state |
| DELETE | `/api/admins/{id}` | JWT | Delete admin |
| POST | `/api/webhooks/welcome` | Secret header | Supabase signup trigger |
| GET | `/api/health` | No | Health check |
