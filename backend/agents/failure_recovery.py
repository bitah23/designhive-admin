import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase, TABLE_PROFILES, TABLE_EMAIL_LOGS
from services.email import _send_one

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(daemon=True)

_AGENT_KEY = "failure_recovery"
_DEFAULT_CONFIG = {
    "retry1_minutes": 15,
    "retry2_minutes": 120,
    "retry3_minutes": 1440,
    "max_retries": 3,
}


def get_config() -> dict:
    try:
        row = supabase.table("agent_config").select("config").eq("agent", _AGENT_KEY).execute()
        if row.data:
            return {**_DEFAULT_CONFIG, **row.data[0]["config"]}
    except Exception as exc:
        logger.warning("Could not read failure_recovery config from DB: %s", exc)
    return dict(_DEFAULT_CONFIG)


def update_config(data: dict) -> dict:
    current = get_config()
    merged = {**current, **data}
    supabase.table("agent_config").upsert({"agent": _AGENT_KEY, "config": merged}).execute()
    return merged


def _backoff_list(cfg: dict) -> list:
    return [cfg["retry1_minutes"], cfg["retry2_minutes"], cfg["retry3_minutes"]]


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start():
    if MOCK_MODE:
        logger.info("Failure recovery: MOCK_MODE — skipping start")
        return
    if _scheduler.running:
        return
    interval = int(os.getenv("FAILURE_RECOVERY_POLL_INTERVAL", "300"))  # default 5 min
    _scheduler.add_job(
        _poll, "interval", seconds=interval,
        id="failure_recovery_poll", replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Failure recovery scheduler started (poll every {interval}s)")


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Failure recovery scheduler stopped")


# ---------------------------------------------------------------------------
# Poll + execute
# ---------------------------------------------------------------------------

def _poll():
    """Scans email_logs for failed rows that are due for a retry."""
    cfg = get_config()
    max_retries = cfg["max_retries"]
    backoff = _backoff_list(cfg)
    try:
        rows = (
            supabase.table(TABLE_EMAIL_LOGS)
            .select("*")
            .eq("status", "failed")
            .lt("retry_count", max_retries)
            .execute()
        )
    except Exception as exc:
        logger.error(f"Failure recovery poll error: {exc}")
        return

    now = datetime.now(timezone.utc)
    for row in rows.data:
        if _is_due(row, now, backoff):
            _retry(row, max_retries, backoff)


def _is_due(row: dict, now: datetime, backoff: list) -> bool:
    """Returns True if enough time has passed since the last attempt."""
    retry_count = row.get("retry_count") or 0
    last_attempt_str = row.get("timestamp")
    if not last_attempt_str:
        return True
    try:
        last_attempt = datetime.fromisoformat(last_attempt_str.replace("Z", "+00:00"))
    except ValueError:
        return True
    idx = min(retry_count, len(backoff) - 1)
    wait = timedelta(minutes=backoff[idx])
    return now >= last_attempt + wait


def _retry(row: dict, max_retries: int, backoff: list):
    log_id = row["id"]
    retry_count = row.get("retry_count") or 0
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # Fetch template
        tmpl_res = (
            supabase.table("email_templates")
            .select("*")
            .eq("id", row["template_id"])
            .execute()
        )
        if not tmpl_res.data:
            raise ValueError(f"Template {row['template_id']} not found")
        template = tmpl_res.data[0]

        # Fetch user by email
        user_res = (
            supabase.table(TABLE_PROFILES)
            .select("id,name,email")
            .eq("email", row["user_email"])
            .execute()
        )
        if not user_res.data:
            raise ValueError(f"User {row['user_email']} not found in profiles")
        user = user_res.data[0]

        result = _send_one(template, user)

        if result.get("status") == "sent":
            supabase.table(TABLE_EMAIL_LOGS).update({
                "status": "sent",
                "retry_count": retry_count + 1,
                "timestamp": now_iso,
                "error_message": None,
            }).eq("id", log_id).execute()
            logger.info(
                f"Failure recovery: retry {retry_count + 1} succeeded for "
                f"{row['user_email']} (log {log_id})"
            )
        else:
            _mark_failed(log_id, retry_count, now_iso, result.get("error", "Unknown error"), max_retries)

    except Exception as exc:
        logger.error(f"Failure recovery error on log {log_id}: {exc}")
        _mark_failed(log_id, retry_count, now_iso, str(exc), max_retries)


def _mark_failed(log_id: str, retry_count: int, now_iso: str, error: str, max_retries: int):
    new_count = retry_count + 1
    new_status = "permanently_failed" if new_count >= max_retries else "failed"
    supabase.table(TABLE_EMAIL_LOGS).update({
        "status": new_status,
        "retry_count": new_count,
        "timestamp": now_iso,
        "error_message": error,
    }).eq("id", log_id).execute()
    logger.warning(
        f"Failure recovery: retry {new_count} failed (log {log_id}) → {new_status}"
    )


# ---------------------------------------------------------------------------
# Manual trigger (called by route)
# ---------------------------------------------------------------------------

def run() -> dict:
    """Manually trigger a recovery scan right now. Returns counts."""
    cfg = get_config()
    max_retries = cfg["max_retries"]
    backoff = _backoff_list(cfg)
    try:
        rows = (
            supabase.table(TABLE_EMAIL_LOGS)
            .select("*")
            .eq("status", "failed")
            .lt("retry_count", max_retries)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError(f"Could not query email_logs: {exc}")

    now = datetime.now(timezone.utc)
    due = [r for r in rows.data if _is_due(r, now, backoff)]

    for row in due:
        _retry(row, max_retries, backoff)

    return {
        "failed_rows_found": len(rows.data),
        "retried_now": len(due),
        "not_yet_due": len(rows.data) - len(due),
    }
