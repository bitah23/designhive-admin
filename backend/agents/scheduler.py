import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase
from agents.segmentation import segment_users
from services.email import send_bulk_emails as _send_bulk
from agents.reporter import generate_report

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(daemon=True)

_VALID_RULES = {"all", "new_users", "inactive", "never_emailed", "custom_date_range"}


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start():
    if MOCK_MODE:
        logger.info("Scheduler: MOCK_MODE — skipping start")
        return
    if _scheduler.running:
        return
    interval = 60
    _scheduler.add_job(
        _poll, "interval", seconds=interval,
        id="campaign_poll", replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Campaign scheduler started (poll every {interval}s)")


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Campaign scheduler stopped")


# ---------------------------------------------------------------------------
# Poll + execute
# ---------------------------------------------------------------------------

def _poll():
    """Runs on the background thread every SCHEDULER_POLL_INTERVAL seconds."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        rows = (
            supabase.table("scheduled_campaigns")
            .select("*")
            .eq("status", "pending")
            .lte("send_at", now)
            .execute()
        )
    except Exception as exc:
        logger.error(f"Scheduler poll failed: {exc}")
        return

    for job in rows.data:
        _execute(job)


def _execute(job: dict):
    job_id = job["id"]
    try:
        # Optimistic lock: only proceed if the row is still 'pending'
        locked = (
            supabase.table("scheduled_campaigns")
            .update({"status": "running"})
            .eq("id", job_id)
            .eq("status", "pending")
            .execute()
        )
        if not locked.data:
            return  # already picked up by another poll cycle

        # Resolve recipients
        params = job.get("segment_params") or {}
        users = segment_users(job["segment_rule"], params)

        # Fetch template
        tmpl = (
            supabase.table("email_templates")
            .select("*")
            .eq("id", job["template_id"])
            .execute()
        )
        if not tmpl.data:
            raise ValueError(f"Template {job['template_id']} not found")
        template = tmpl.data[0]

        if not users:
            supabase.table("scheduled_campaigns").update({
                "status": "sent",
                "result_summary": {"sent": 0, "failed": 0, "note": "No users matched segment"},
            }).eq("id", job_id).execute()
            return

        results = _send_bulk(template, users)
        report = generate_report(template, results, total_targeted=len(users))
        sent = report["sent"]
        failed = report["failed"]

        supabase.table("scheduled_campaigns").update({
            "status": "sent",
            "result_summary": {
                "sent": sent,
                "failed": failed,
                "total": report["total_targeted"],
                "success_rate": report["success_rate"],
            },
        }).eq("id", job_id).execute()
        logger.info(f"Campaign {job_id}: sent={sent} failed={failed}")

    except Exception as exc:
        logger.error(f"Campaign {job_id} execution error: {exc}")
        supabase.table("scheduled_campaigns").update({
            "status": "failed",
            "result_summary": {"error": str(exc)},
        }).eq("id", job_id).execute()


# ---------------------------------------------------------------------------
# CRUD helpers (called by routes)
# ---------------------------------------------------------------------------

def create_scheduled_campaign(
    template_id: str,
    segment_rule: str,
    segment_params: dict,
    send_at: str,
) -> dict:
    if segment_rule not in _VALID_RULES:
        raise ValueError(f"Unknown segment rule: {segment_rule!r}")

    send_dt = datetime.fromisoformat(send_at.replace("Z", "+00:00"))
    if send_dt <= datetime.now(timezone.utc):
        raise ValueError("send_at must be in the future")

    result = (
        supabase.table("scheduled_campaigns")
        .insert({
            "template_id": template_id,
            "segment_rule": segment_rule,
            "segment_params": segment_params or {},
            "send_at": send_dt.isoformat(),
            "status": "pending",
        })
        .execute()
    )
    return result.data[0] if result.data else {}


def list_scheduled_campaigns() -> list:
    result = (
        supabase.table("scheduled_campaigns")
        .select("*")
        .order("send_at", desc=True)
        .execute()
    )
    return result.data


def cancel_scheduled_campaign(job_id: str) -> dict:
    result = (
        supabase.table("scheduled_campaigns")
        .update({"status": "cancelled"})
        .eq("id", job_id)
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        raise ValueError("Campaign not found or is not pending")
    return result.data[0]
