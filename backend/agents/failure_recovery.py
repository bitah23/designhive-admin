import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase
from services.email import _send_one

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(daemon=True)

# Minutes to wait before each retry attempt (indexed by current retry_count)
_BACKOFF_MINUTES = [15, 120, 1440]  # 15 min → 2 hours → 24 hours
_MAX_RETRIES = len(_BACKOFF_MINUTES)


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
    try:
        rows = (
            supabase.table("email_logs")
            .select("*")
            .eq("status", "failed")
            .lt("retry_count", _MAX_RETRIES)
            .execute()
        )
    except Exception as exc:
        logger.error(f"Failure recovery poll error: {exc}")
        return

    now = datetime.now(timezone.utc)
    for row in rows.data:
        if _is_due(row, now):
            _retry(row)


def _is_due(row: dict, now: datetime) -> bool:
    """Returns True if enough time has passed since the last attempt."""
    retry_count = row.get("retry_count") or 0
    last_attempt_str = row.get("timestamp")
    if not last_attempt_str:
        return True
    try:
        last_attempt = datetime.fromisoformat(last_attempt_str.replace("Z", "+00:00"))
    except ValueError:
        return True
    wait = timedelta(minutes=_BACKOFF_MINUTES[retry_count])
    return now >= last_attempt + wait


def _retry(row: dict):
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
            supabase.table("profiles")
            .select("id,name,email")
            .eq("email", row["user_email"])
            .execute()
        )
        if not user_res.data:
            raise ValueError(f"User {row['user_email']} not found in profiles")
        user = user_res.data[0]

        result = _send_one(template, user)

        if result.get("status") == "sent":
            supabase.table("email_logs").update({
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
            _mark_failed(log_id, retry_count, now_iso, result.get("error", "Unknown error"))

    except Exception as exc:
        logger.error(f"Failure recovery error on log {log_id}: {exc}")
        _mark_failed(log_id, retry_count, now_iso, str(exc))


def _mark_failed(log_id: str, retry_count: int, now_iso: str, error: str):
    new_count = retry_count + 1
    new_status = "permanently_failed" if new_count >= _MAX_RETRIES else "failed"
    supabase.table("email_logs").update({
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
    try:
        rows = (
            supabase.table("email_logs")
            .select("*")
            .eq("status", "failed")
            .lt("retry_count", _MAX_RETRIES)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError(f"Could not query email_logs: {exc}")

    now = datetime.now(timezone.utc)
    due = [r for r in rows.data if _is_due(r, now)]

    for row in due:
        _retry(row)

    return {
        "failed_rows_found": len(rows.data),
        "retried_now": len(due),
        "not_yet_due": len(rows.data) - len(due),
    }
