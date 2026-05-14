import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase
from agents.segmentation import segment_users
from agents.drip import enroll_user
from services.email import send_bulk_emails

logger = logging.getLogger(__name__)

_scheduler  = BackgroundScheduler(daemon=True)
_AGENT_KEY  = "reengagement"
_JOB_ID     = "reengagement_daily"


# ---------------------------------------------------------------------------
# Config  (DB-backed, falls back to env vars on first run)
# ---------------------------------------------------------------------------

def get_config() -> dict:
    try:
        row = (
            supabase.table("agent_config")
            .select("config")
            .eq("agent", _AGENT_KEY)
            .execute()
        )
        if row.data:
            return row.data[0]["config"]
    except Exception as exc:
        logger.warning("Could not read reengagement config from DB: %s", exc)

    # First-run fallback — env vars keep backward compatibility
    return {
        "threshold_days":   int(os.getenv("REENGAGEMENT_THRESHOLD_DAYS", "30")),
        "mode":             os.getenv("REENGAGEMENT_MODE", "single"),
        "template_id":      os.getenv("REENGAGEMENT_TEMPLATE_ID"),
        "drip_sequence_id": os.getenv("REENGAGEMENT_DRIP_SEQUENCE_ID"),
        "run_hour_utc":     int(os.getenv("REENGAGEMENT_HOUR_UTC", "9")),
    }


def update_config(data: dict) -> dict:
    """Merges data into stored config, upserts to DB, and live-reschedules if run_hour changed."""
    current = get_config()
    merged  = {**current, **data}

    supabase.table("agent_config").upsert({
        "agent":  _AGENT_KEY,
        "config": merged,
    }).execute()

    # If the daily run hour changed and the scheduler is already running, reschedule immediately
    if "run_hour_utc" in data and _scheduler.running:
        try:
            _scheduler.reschedule_job(
                _JOB_ID,
                trigger="cron",
                hour=int(merged["run_hour_utc"]),
                minute=0,
            )
            logger.info("Re-engagement job rescheduled to %02d:00 UTC", merged["run_hour_utc"])
        except Exception as exc:
            logger.warning("Could not reschedule re-engagement job: %s", exc)

    logger.info("Re-engagement config updated: %s", merged)
    return merged


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start():
    if MOCK_MODE:
        logger.info("Re-engagement scheduler: MOCK_MODE — skipping start")
        return
    if _scheduler.running:
        return
    config = get_config()
    _scheduler.add_job(
        run,
        "cron",
        hour=config["run_hour_utc"],
        minute=0,
        id=_JOB_ID,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Re-engagement scheduler started "
        "(daily at %02d:00 UTC, mode=%s, threshold=%dd)",
        config["run_hour_utc"], config["mode"], config["threshold_days"],
    )


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Re-engagement scheduler stopped")


# ---------------------------------------------------------------------------
# Core run
# ---------------------------------------------------------------------------

def run() -> dict:
    """
    Find inactive users and re-engage them.
    Called automatically by the daily cron or manually via POST /api/agents/reengagement/run.
    """
    config         = get_config()
    mode           = config["mode"]
    threshold_days = config["threshold_days"]

    logger.info("Re-engagement run started (mode=%s, threshold=%dd)", mode, threshold_days)

    inactive_users = segment_users("inactive", {"days": threshold_days})
    if not inactive_users:
        logger.info("Re-engagement: no inactive users found")
        return {"mode": mode, "threshold_days": threshold_days, "targeted": 0}

    if mode == "single":
        return _run_single(config, inactive_users)
    elif mode == "drip":
        return _run_drip(config, inactive_users)
    else:
        raise ValueError(f"Unknown mode: {mode!r}. Must be 'single' or 'drip'.")


# ---------------------------------------------------------------------------
# Mode implementations
# ---------------------------------------------------------------------------

def _run_single(config: dict, users: list) -> dict:
    template_id = config.get("template_id")
    if not template_id:
        raise ValueError("No template configured. Set a template in the Re-engagement agent config.")

    tmpl_res = (
        supabase.table("email_templates")
        .select("*")
        .eq("id", template_id)
        .execute()
    )
    if not tmpl_res.data:
        raise ValueError(f"Template {template_id} not found")
    template = tmpl_res.data[0]

    results = send_bulk_emails(template, users)
    sent    = sum(1 for r in results if r.get("status") == "sent")
    failed  = len(results) - sent

    logger.info("Re-engagement single send complete: sent=%d failed=%d", sent, failed)
    return {
        "mode":           "single",
        "threshold_days": config["threshold_days"],
        "targeted":       len(users),
        "sent":           sent,
        "failed":         failed,
    }


def _run_drip(config: dict, users: list) -> dict:
    seq_id = config.get("drip_sequence_id")
    if not seq_id:
        raise ValueError("No drip sequence configured. Set one in the Re-engagement agent config.")

    enrolled = 0
    skipped  = 0
    for user in users:
        try:
            enroll_user(sequence_id=seq_id, user_id=user["id"])
            enrolled += 1
        except ValueError:
            skipped += 1  # already actively enrolled

    logger.info("Re-engagement drip complete: enrolled=%d skipped=%d", enrolled, skipped)
    return {
        "mode":           "drip",
        "threshold_days": config["threshold_days"],
        "targeted":       len(users),
        "enrolled":       enrolled,
        "skipped":        skipped,
    }
