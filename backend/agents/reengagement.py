import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase
from agents.segmentation import segment_users
from agents.drip import enroll_user
from services.email import send_bulk_emails

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(daemon=True)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def get_config() -> dict:
    return {
        "threshold_days": int(os.getenv("REENGAGEMENT_THRESHOLD_DAYS", "30")),
        "mode": os.getenv("REENGAGEMENT_MODE", "single"),
        "template_id": os.getenv("REENGAGEMENT_TEMPLATE_ID"),
        "drip_sequence_id": os.getenv("REENGAGEMENT_DRIP_SEQUENCE_ID"),
        "run_hour_utc": int(os.getenv("REENGAGEMENT_HOUR_UTC", "9")),
    }


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
        id="reengagement_daily",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        f"Re-engagement scheduler started "
        f"(daily at {config['run_hour_utc']:02d}:00 UTC, "
        f"mode={config['mode']}, threshold={config['threshold_days']}d)"
    )


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Re-engagement scheduler stopped")


# ---------------------------------------------------------------------------
# Core run (also called manually via the API)
# ---------------------------------------------------------------------------

def run() -> dict:
    """
    Find inactive users and re-engage them.
    Called automatically by the daily cron or manually via POST /api/agents/reengagement/run.
    """
    config = get_config()
    mode = config["mode"]
    threshold_days = config["threshold_days"]

    logger.info(f"Re-engagement run started (mode={mode}, threshold={threshold_days}d)")

    inactive_users = segment_users("inactive", {"days": threshold_days})
    if not inactive_users:
        logger.info("Re-engagement: no inactive users found")
        return {"mode": mode, "threshold_days": threshold_days, "targeted": 0}

    if mode == "single":
        return _run_single(config, inactive_users)
    elif mode == "drip":
        return _run_drip(config, inactive_users)
    else:
        raise ValueError(f"Unknown REENGAGEMENT_MODE: {mode!r}. Must be 'single' or 'drip'.")


# ---------------------------------------------------------------------------
# Mode implementations
# ---------------------------------------------------------------------------

def _run_single(config: dict, users: list) -> dict:
    template_id = config["template_id"]
    if not template_id:
        raise ValueError("REENGAGEMENT_TEMPLATE_ID must be set in .env when mode=single")

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
    sent = sum(1 for r in results if r.get("status") == "sent")
    failed = len(results) - sent

    logger.info(f"Re-engagement single send complete: sent={sent} failed={failed}")
    return {
        "mode": "single",
        "targeted": len(users),
        "sent": sent,
        "failed": failed,
    }


def _run_drip(config: dict, users: list) -> dict:
    seq_id = config["drip_sequence_id"]
    if not seq_id:
        raise ValueError("REENGAGEMENT_DRIP_SEQUENCE_ID must be set in .env when mode=drip")

    enrolled = 0
    skipped = 0
    for user in users:
        try:
            enroll_user(sequence_id=seq_id, user_id=user["id"])
            enrolled += 1
        except ValueError:
            skipped += 1  # already actively enrolled — don't double-enroll

    logger.info(f"Re-engagement drip complete: enrolled={enrolled} skipped={skipped}")
    return {
        "mode": "drip",
        "targeted": len(users),
        "enrolled": enrolled,
        "skipped": skipped,
    }
