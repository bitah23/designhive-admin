# DesignHive Admin — Agents

This file tracks every agent planned or built for the DesignHive Admin platform. Each agent is a discrete, automated capability that runs on the backend without manual intervention from an admin.

**Stack context:** FastAPI · Supabase (PostgreSQL) · Gmail API · Claude API (Anthropic)  
**Agent home:** `backend/agents/` (one file per agent)

---

## Status Legend

| Symbol | Meaning |
|---|---|
| `planned` | Designed, not yet built |
| `in progress` | Currently being implemented |
| `done` | Built, tested, integrated |

---

## Agent Index

| # | Agent | Status | File |
|---|---|---|---|
| 1 | [Smart Segmentation](#1-smart-segmentation-agent) | `done` | `backend/agents/segmentation.py` |
| 2 | [Content Generation](#2-content-generation-agent) | `done` | `backend/agents/content_gen.py` |
| 3 | [Campaign Scheduler](#3-campaign-scheduler-agent) | `done` | `backend/agents/scheduler.py` |
| 4 | [Drip Sequences](#4-drip-sequence-agent) | `done` | `backend/agents/drip.py` |
| 5 | [Welcome Sequence](#5-welcome-sequence-agent) | `done` | `backend/agents/welcome_sequence.py` |
| 6 | [Re-engagement Agent](#6-re-engagement-agent) | `done` | `backend/agents/reengagement.py` |
| 7 | [Failure Recovery](#7-failure-recovery-agent) | `done` | `backend/agents/failure_recovery.py` |
| 8 | [Campaign Reporter](#8-campaign-reporter-agent) | `done` | `backend/agents/reporter.py` |
| 9 | [Chat Interface](#9-chat-interface-agent) | `done` | `backend/agents/chat.py` |
| 10 | [Suggestion Agent](#10-suggestion-agent) | `done` | `backend/agents/suggestions.py` |

---

## 1. Smart Segmentation Agent

**Status:** `done`  
**Files:** `backend/agents/segmentation.py` · `backend/routes/agents.py` · `frontend/js/campaign-page.js`

**What it does:** Filters the `profiles` table down to a target audience based on rules. Returns a list of user IDs ready to pass into the bulk send endpoint.

**Rules it supports:**

| Rule | Logic |
|---|---|
| `new_users` | `created_at >= now() - interval '7 days'` |
| `inactive` | No row in `email_logs` for this user in the last 30 days |
| `never_emailed` | No row in `email_logs` for this user at all |
| `all` | Every user in `profiles` |
| `custom_date_range` | `created_at` between two provided dates |

**Inputs:** A rule name (string) + optional parameters (date range, inactivity threshold in days).  
**Output:** `List[str]` — list of user IDs matching the rule.

**Integration points:**
- Called by the Campaign Scheduler before sending
- Called by the Re-engagement Agent to find inactive users
- Will be exposed as `POST /api/agents/segment` so the frontend can preview audience size before a campaign send

**DB tables used:** `profiles`, `email_logs`

---

## 2. Content Generation Agent

**Status:** `done`  
**Files:** `backend/agents/content_gen.py` · `backend/routes/agents.py` · `frontend/templates.html` · `frontend/js/templates-page.js`  
**Requires:** Claude API (`claude-sonnet-4-6`)

**What it does:** Takes a short brief from the admin (1–3 sentences describing the email goal) and returns a complete email subject line and HTML body, ready to save as a template.

**Inputs:**
```json
{
  "brief": "Re-engage users who haven't logged in for 30 days. Offer them a free design asset.",
  "tone": "friendly",       // friendly | professional | urgent
  "include_cta": true,
  "cta_text": "Claim your free asset"
}
```

**Output:**
```json
{
  "subject": "We miss you — here's something free",
  "body": "<html>...</html>"
}
```

**Claude prompt strategy:**
- System prompt: instructs the model to write email-safe HTML with inline styles, using `{{name}}`, `{{email}}`, `{{date}}` placeholders
- Temperature: low (0.3) for consistent structure, slightly higher (0.7) for tone variation
- Output is validated to contain `<html>` before returning

**Integration points:**
- Exposed as `POST /api/agents/generate-content`
- Frontend will add a "Generate with AI" button to the Templates modal that calls this endpoint and pre-fills the Quill editor

**DB tables used:** `email_templates` (writes on save, not on generation)

---

## 3. Campaign Scheduler Agent

**Status:** `done`  
**Files:** `backend/agents/scheduler.py` · `backend/routes/agents.py` · `frontend/campaign.html` · `frontend/js/campaign-page.js`

**What it does:** Stores scheduled campaign jobs and fires them at the configured time. Runs as an APScheduler `BackgroundScheduler` inside the FastAPI process, polling every `SCHEDULER_POLL_INTERVAL` seconds (default 60).

**Scheduled job record (table: `scheduled_campaigns`):**

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `template_id` | uuid | Which template to send |
| `segment_rule` | text | Which segmentation rule to use |
| `segment_params` | jsonb | Optional params for the rule (e.g. `{"days": 30}`) |
| `send_at` | timestamptz | When to fire |
| `status` | text | `pending` / `running` / `sent` / `failed` / `cancelled` |
| `created_at` | timestamptz | When the job was created |
| `result_summary` | jsonb | Sent/failed counts after execution, or error message |

**Endpoints:**
- `POST /api/agents/schedule` — create a scheduled campaign
- `GET /api/agents/schedule` — list all campaigns (newest first)
- `DELETE /api/agents/schedule/{id}` — cancel a pending campaign

**Flow:**
1. Admin selects template + segment on Campaign page, clicks "Schedule", picks a datetime
2. `POST /api/agents/schedule` saves a `pending` row in `scheduled_campaigns`
3. Scheduler polls every 60 s for rows where `send_at <= now()` and `status = 'pending'`
4. On match: optimistic lock (sets `running`) → `segment_users()` → fetches template → `send_bulk_emails()` → writes `result_summary`, sets `sent` or `failed`

**Integration points:**
- Calls Smart Segmentation Agent (#1) directly (Python import, no HTTP)
- Calls `services/email.py:send_bulk_emails`
- Will call Campaign Reporter (#8) after each send once Agent #8 is built

**DB tables used:** `scheduled_campaigns`, `email_templates`, `profiles`, `email_logs`

---

## 4. Drip Sequence Agent

**Status:** `done`  
**Files:** `backend/agents/drip.py` · `backend/routes/agents.py` · `backend/models.py`

**What it does:** Enrolls a user in a sequence of emails sent at fixed intervals. Each step in the sequence is a separate template sent N days after the previous one.

**New tables:**

`drip_sequences`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | e.g. "Onboarding Drip" |
| `steps` | jsonb | Array of `{ template_id, delay_days }` |
| `is_active` | bool | Whether new enrollments are accepted |

`drip_enrollments`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `sequence_id` | uuid | FK to `drip_sequences` |
| `user_id` | uuid | FK to `profiles` |
| `current_step` | int | Which step to send next (0-indexed) |
| `next_send_at` | timestamptz | When to send the next step |
| `enrolled_at` | timestamptz | When enrollment started |
| `status` | text | `active` / `completed` / `cancelled` |

**Flow:**
1. User is enrolled (manually or automatically by Welcome Sequence / Re-engagement Agent)
2. Agent polls `drip_enrollments` for rows where `next_send_at <= now()` and `status = 'active'`
3. Sends the step's template, advances `current_step`, updates `next_send_at`
4. When all steps are done, sets `status = 'completed'`

**DB tables used:** `drip_sequences` (new), `drip_enrollments` (new), `email_templates`, `profiles`, `email_logs`

---

## 5. Welcome Sequence Agent

**Status:** `done`  
**Files:** `backend/agents/welcome_sequence.py` · `backend/routes/agents.py`

**What it does:** Automatically sends a structured series of welcome emails when a new user signs up. Distinct from the existing single-email webhook — this sends multiple emails across the first week.

**Default sequence:**

| Day | Email |
|---|---|
| Day 0 (immediately) | Welcome + account confirmation |
| Day 1 | Getting started guide |
| Day 3 | Feature spotlight |
| Day 7 | Check-in + support offer |

**How it differs from the existing webhook (`routes/webhooks.py`):**
- The existing webhook sends one welcome email immediately on signup
- This agent creates a Drip Enrollment (#4) for the new user in the Welcome drip sequence
- The Day 0 email replaces the current single webhook email (once this is built, the old webhook can be retired)

**Trigger:** Same Supabase DB trigger as the existing webhook (`on_profile_insert`), but calls `POST /api/agents/welcome-enroll` instead of (or in addition to) the current endpoint.

**Integration points:**
- Creates a row in `drip_enrollments` linked to the "Welcome" drip sequence
- The Drip Sequence Agent (#4) handles all subsequent sends

**DB tables used:** `profiles`, `drip_enrollments`, `drip_sequences`

---

## 6. Re-engagement Agent

**Status:** `done`  
**Files:** `backend/agents/reengagement.py` · `backend/routes/agents.py`

**What it does:** Runs on a schedule (e.g. daily at 9 AM), finds users who have been inactive for a configured number of days, and either sends them a one-off re-engagement email or enrolls them in a drip sequence.

**Inactivity definition:** No row in `email_logs` with `status = 'sent'` for this user in the last N days (configurable, default 30).

**Config (stored in `agent_config` table or `.env`):**
```
REENGAGEMENT_THRESHOLD_DAYS = 30
REENGAGEMENT_TEMPLATE_ID = <uuid>
REENGAGEMENT_MODE = "single" | "drip"
REENGAGEMENT_DRIP_SEQUENCE_ID = <uuid>   # used when mode = drip
```

**Flow:**
1. Runs Smart Segmentation Agent (#1) with rule `inactive`
2. For each inactive user:
   - If `mode = single`: sends the re-engagement template directly
   - If `mode = drip`: enrolls in the configured drip sequence (if not already enrolled)
3. Logs results

**Integration points:**
- Calls Smart Segmentation (#1)
- Calls `send_bulk_emails` or enrolls in Drip Sequence (#4)

**DB tables used:** `profiles`, `email_logs`, `drip_enrollments`

---

## 7. Failure Recovery Agent

**Status:** `done`  
**Files:** `backend/agents/failure_recovery.py` · `backend/routes/agents.py`

**What it does:** Periodically scans `email_logs` for `status = 'failed'` rows and retries the send. Implements exponential backoff — it won't retry a message more than 3 times.

**New column on `email_logs`:** `retry_count int default 0`

**Retry logic:**
- Retry 1: 15 minutes after failure
- Retry 2: 2 hours after first retry
- Retry 3: 24 hours after second retry
- After 3 retries: marks as `status = 'permanently_failed'`, stops

**Flow:**
1. Queries `email_logs` for rows where `status = 'failed'` and `retry_count < 3`
2. Checks that enough time has elapsed since the last attempt (`timestamp`)
3. Re-fetches the template and user, re-sends
4. On success: updates `status = 'sent'`, increments `retry_count`
5. On failure: increments `retry_count`, updates `timestamp` to now

**Integration points:**
- Reads from `email_logs` directly (no segmentation needed — it targets specific failed log rows)
- Calls `services/email.py:_send_one`

**DB tables used:** `email_logs`, `email_templates`, `profiles`

---

## 8. Campaign Reporter Agent

**Status:** `done`  
**Files:** `backend/agents/reporter.py` · `backend/routes/agents.py` · `backend/routes/email.py` · `backend/agents/scheduler.py`

**What it does:** After any bulk send completes, generates a structured summary and optionally sends it to the admin via email.

**Report contents:**
- Campaign name (template title)
- Total recipients targeted
- Emails sent successfully
- Emails failed
- Success rate (%)
- List of failed recipients with error messages
- Timestamp

**Trigger:** Called at the end of every bulk send in `routes/email.py` and by the Campaign Scheduler (#3) after each scheduled run.

**Delivery options:**
- API response (always — returned inline with the send result as `"report": {...}`)
- Email to admin (optional, configurable via `REPORTER_EMAIL_ADMIN = true/false` in config)

**Endpoints:**
- `GET /api/agents/report?limit=20` — returns recent completed/failed scheduled campaigns with their result summaries

**Integration points:**
- Called by `routes/email.py:POST /email/send` (inline with bulk send result)
- Called by Campaign Scheduler (#3) `_execute()` after each run — also enriches `result_summary` with `success_rate`

**Environment variables:**
```env
REPORTER_EMAIL_ADMIN=false          # Set to true to email report to admin after each send
REPORTER_ADMIN_EMAIL=info@...       # Admin address to receive reports
```

**DB tables used:** `email_logs`, `email_templates`, `scheduled_campaigns`

---

## 9. Chat Interface Agent

**Status:** `done`  
**Files:** `backend/agents/chat.py` · `backend/routes/agents.py` · `backend/models.py` · `frontend/js/layout.js`  
**Requires:** Claude API (`claude-sonnet-4-6`)

**What it does:** Accepts a plain-English instruction from an admin and maps it to a platform action — a natural language interface to the entire system. Uses Claude's tool use (function calling) API with an agentic loop (up to 10 tool calls per message).

**Example inputs → actions:**

| Input | Action |
|---|---|
| "Send the welcome email to all new users from this week" | Calls `list_templates` → `send_campaign_now` |
| "Schedule the promo campaign for Friday at 10 AM" | Calls `list_templates` → `schedule_campaign` |
| "Show me how many emails failed yesterday" | Calls `get_email_stats` with `since_days=1` |
| "Run the re-engagement agent" | Calls `run_reengagement` |
| "Generate a re-engagement email about our new design toolkit" | Calls `generate_content` |

**Available tools (10):** `list_templates`, `segment_users`, `send_campaign_now`, `schedule_campaign`, `generate_content`, `run_reengagement`, `run_failure_recovery`, `get_email_stats`, `list_scheduled_campaigns`, `get_campaign_report`

**Architecture:**
- `chat()` builds a messages array and enters an agentic loop
- Each loop: Claude responds with `tool_use` blocks → backend executes → result appended as `tool_result` → repeat
- Loop exits on `end_turn` (Claude's final text reply) or after 10 rounds
- `action_taken` captures the first tool call + result for the frontend

**Endpoint:** `POST /api/agents/chat`  
**Request:** `{ "message": "..." }`  
**Response:** `{ "reply": "...", "action_taken": { "tool": "...", "input": {...}, "result": {...} } }`

**Frontend:** Chat drawer slides in from the right, accessible via "AI Assistant" button at the bottom of every page's sidebar. Supports Enter to send, Shift+Enter for newline, auto-growing textarea.

**DB tables used:** Varies by action taken

---

## 10. Suggestion Agent

**Status:** `done`  
**Files:** `backend/agents/suggestions.py` · `backend/routes/agents.py` · `frontend/dashboard.html` · `frontend/js/dashboard-page.js`  
**Requires:** Claude API (`claude-sonnet-4-6`)

**What it does:** Gathers analytics from the DB (last 90 days of email logs, user counts, template performance, scheduled campaigns), feeds them to Claude, and receives 3–6 structured, actionable suggestions. Results are cached in memory for 1 hour.

**Signals gathered:**
- Template success rates (sent vs failed per template, last 90 days)
- Day-of-week + hour-of-day patterns in successful sends (top 5 time slots)
- Inactive users (no email in 30 days)
- New users (last 7 days)
- Never-emailed users
- Unused templates (no sends in last 90 days)
- Upcoming scheduled campaigns

**Output:**
```json
[
  {
    "type": "timing",
    "message": "Your best send rate is on Tuesdays at 10 AM — 94% success across 38 sends.",
    "confidence": 0.84,
    "suggested_action": null
  },
  {
    "type": "audience",
    "message": "47 users signed up in the last 7 days and haven't received the Getting Started email.",
    "confidence": 0.92,
    "suggested_action": { "segment": "new_users", "template_id": "<uuid>" }
  },
  {
    "type": "re-engagement",
    "message": "23 users haven't been emailed in over 30 days.",
    "confidence": 0.88,
    "suggested_action": { "agent": "reengagement" }
  }
]
```

**Endpoints:**
- `GET /api/agents/suggestions` — returns cached or fresh suggestions
- `GET /api/agents/suggestions?refresh=true` — forces a fresh Claude analysis

**Frontend:** "AI Suggestions" card on the Dashboard, loaded on page open. Each suggestion shows type, message, confidence %, and an optional "Apply" button that either redirects to the Campaign page (pre-filled) or triggers the relevant agent endpoint directly.

**Cache:** In-memory, 1-hour TTL (configurable via `SUGGESTIONS_CACHE_TTL` env var).

**Environment variables:**
```env
SUGGESTIONS_CACHE_TTL=3600   # seconds before cache expires (default 1 hour)
```

**DB tables used:** `email_logs`, `profiles`, `email_templates`, `scheduled_campaigns`

---

## Shared Infrastructure

All agents will share:

- **`backend/agents/__init__.py`** — empty, marks the directory as a package
- **`backend/agents/base.py`** — shared helpers: `get_all_users()`, `get_template_by_id()`, `log_result()` — thin wrappers around Supabase queries to avoid repeating the same boilerplate in every agent
- **`backend/services/email.py`** — unchanged, agents call `send_bulk_emails` and `_send_one` from here
- **`backend/config.py`** — unchanged, agents import `supabase`, `gmail`, and any new env vars added here

**New environment variables (to add to `.env` as agents are built):**

```env
ANTHROPIC_API_KEY=...          # Required for agents 2, 9, 10 (Claude API)
REENGAGEMENT_THRESHOLD_DAYS=30 # Agent 6
REPORTER_EMAIL_ADMIN=false     # Agent 8
SCHEDULER_POLL_INTERVAL=60     # Agent 3 (seconds between polls)
DRIP_POLL_INTERVAL=60          # Agent 4 (seconds between drip polls)
WELCOME_SEQUENCE_ID=<uuid>     # Agent 5 (UUID of the Welcome drip sequence in drip_sequences)
```

---

## Database Changes Summary

| Table | Change | Required by |
|---|---|---|
| `scheduled_campaigns` | New table | Agent 3 |
| `drip_sequences` | New table | Agents 4, 5 |
| `drip_enrollments` | New table | Agents 4, 5, 6 |
| `email_logs` | Add `retry_count int` column | Agent 7 |
| `agent_suggestions` | New table (optional cache) | Agent 10 |
| `agent_config` | New table for runtime config (optional) | Agents 3, 6 |
