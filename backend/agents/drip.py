import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from config import MOCK_MODE, supabase, TABLE_PROFILES
from services.email import _send_one

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(daemon=True)

# Sentinel pushed into next_send_at while a step is being processed (optimistic lock)
_PROCESSING_SENTINEL = "9999-01-01T00:00:00+00:00"


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def start():
    if MOCK_MODE:
        logger.info("Drip scheduler: MOCK_MODE — skipping start")
        return
    if _scheduler.running:
        return
    interval = int(os.getenv("DRIP_POLL_INTERVAL", "60"))
    _scheduler.add_job(
        _poll, "interval", seconds=interval,
        id="drip_poll", replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Drip scheduler started (poll every {interval}s)")


def stop():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Drip scheduler stopped")


# ---------------------------------------------------------------------------
# Poll + execute
# ---------------------------------------------------------------------------

def _poll():
    """Runs on the background thread; finds due drip steps and sends them."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        rows = (
            supabase.table("drip_enrollments")
            .select("*")
            .eq("status", "active")
            .lte("next_send_at", now)
            .execute()
        )
    except Exception as exc:
        logger.error(f"Drip poll failed: {exc}")
        return

    for enrollment in rows.data:
        _execute_step(enrollment)


def _execute_step(enrollment: dict):
    enrollment_id = enrollment["id"]
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    try:
        # Optimistic lock: push next_send_at to far future so no concurrent poll picks this up
        locked = (
            supabase.table("drip_enrollments")
            .update({"next_send_at": _PROCESSING_SENTINEL})
            .eq("id", enrollment_id)
            .eq("status", "active")
            .lte("next_send_at", now_iso)
            .execute()
        )
        if not locked.data:
            return  # another poll cycle already claimed this row

        # Fetch sequence
        seq_res = (
            supabase.table("drip_sequences")
            .select("*")
            .eq("id", enrollment["sequence_id"])
            .execute()
        )
        if not seq_res.data:
            raise ValueError(f"Sequence {enrollment['sequence_id']} not found")
        sequence = seq_res.data[0]

        steps = sequence.get("steps") or []
        current_step = enrollment["current_step"]

        if current_step >= len(steps):
            supabase.table("drip_enrollments").update({"status": "completed"}).eq("id", enrollment_id).execute()
            return

        step = steps[current_step]

        # Fetch template
        tmpl_res = (
            supabase.table("email_templates")
            .select("*")
            .eq("id", step["template_id"])
            .execute()
        )
        if not tmpl_res.data:
            raise ValueError(f"Template {step['template_id']} not found")
        template = tmpl_res.data[0]

        # Fetch user
        user_res = (
            supabase.table(TABLE_PROFILES)
            .select("id,name,email")
            .eq("id", enrollment["user_id"])
            .execute()
        )
        if not user_res.data:
            raise ValueError(f"User {enrollment['user_id']} not found")
        user = user_res.data[0]

        _send_one(template, user)

        next_step = current_step + 1
        if next_step >= len(steps):
            supabase.table("drip_enrollments").update({
                "current_step": next_step,
                "status": "completed",
                "next_send_at": None,
            }).eq("id", enrollment_id).execute()
            logger.info(f"Drip enrollment {enrollment_id} completed for {user['email']}")
        else:
            delay_days = steps[next_step].get("delay_days", 1)
            next_send_at = (now + timedelta(days=delay_days)).isoformat()
            supabase.table("drip_enrollments").update({
                "current_step": next_step,
                "next_send_at": next_send_at,
            }).eq("id", enrollment_id).execute()
            logger.info(
                f"Drip {enrollment_id}: step {current_step} sent to {user['email']}, "
                f"next step in {delay_days}d"
            )

    except Exception as exc:
        logger.error(f"Drip enrollment {enrollment_id} step error: {exc}")
        # Restore next_send_at so the step retries on the next poll cycle
        supabase.table("drip_enrollments").update({
            "next_send_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", enrollment_id).execute()


# ---------------------------------------------------------------------------
# CRUD helpers (called by routes)
# ---------------------------------------------------------------------------

def create_drip_sequence(name: str, steps: list, is_active: bool = True) -> dict:
    if not steps:
        raise ValueError("A sequence must have at least one step")
    for i, step in enumerate(steps):
        if "template_id" not in step:
            raise ValueError(f"Step {i} is missing template_id")
        if "delay_days" not in step:
            raise ValueError(f"Step {i} is missing delay_days")
    result = (
        supabase.table("drip_sequences")
        .insert({"name": name, "steps": steps, "is_active": is_active})
        .execute()
    )
    return result.data[0] if result.data else {}


def list_drip_sequences() -> list:
    result = (
        supabase.table("drip_sequences")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def update_drip_sequence(seq_id: str, updates: dict) -> dict:
    allowed = {"name", "steps", "is_active"}
    filtered = {k: v for k, v in updates.items() if k in allowed and v is not None}
    if not filtered:
        raise ValueError("No valid fields to update")
    result = (
        supabase.table("drip_sequences")
        .update(filtered)
        .eq("id", seq_id)
        .execute()
    )
    if not result.data:
        raise ValueError(f"Sequence {seq_id} not found")
    return result.data[0]


def delete_drip_sequence(seq_id: str) -> dict:
    active = (
        supabase.table("drip_enrollments")
        .select("id")
        .eq("sequence_id", seq_id)
        .eq("status", "active")
        .execute()
    )
    if active.data:
        raise ValueError("Cannot delete a sequence that has active enrollments")
    result = (
        supabase.table("drip_sequences")
        .delete()
        .eq("id", seq_id)
        .execute()
    )
    if not result.data:
        raise ValueError(f"Sequence {seq_id} not found")
    return result.data[0]


def enroll_user(sequence_id: str, user_id: str) -> dict:
    seq_res = (
        supabase.table("drip_sequences")
        .select("*")
        .eq("id", sequence_id)
        .execute()
    )
    if not seq_res.data:
        raise ValueError(f"Sequence {sequence_id} not found")
    sequence = seq_res.data[0]

    if not sequence.get("is_active"):
        raise ValueError("Cannot enroll in an inactive sequence")

    steps = sequence.get("steps") or []
    if not steps:
        raise ValueError("Sequence has no steps")

    user_res = (
        supabase.table(TABLE_PROFILES)
        .select("id")
        .eq("id", user_id)
        .execute()
    )
    if not user_res.data:
        raise ValueError(f"User {user_id} not found")

    existing = (
        supabase.table("drip_enrollments")
        .select("id")
        .eq("sequence_id", sequence_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .execute()
    )
    if existing.data:
        raise ValueError("User is already actively enrolled in this sequence")

    now = datetime.now(timezone.utc)
    first_delay = steps[0].get("delay_days", 0)
    next_send_at = (now + timedelta(days=first_delay)).isoformat()

    result = (
        supabase.table("drip_enrollments")
        .insert({
            "sequence_id": sequence_id,
            "user_id": user_id,
            "current_step": 0,
            "next_send_at": next_send_at,
            "enrolled_at": now.isoformat(),
            "status": "active",
        })
        .execute()
    )
    return result.data[0] if result.data else {}


def list_enrollments(sequence_id: str = None) -> list:
    query = supabase.table("drip_enrollments").select("*")
    if sequence_id:
        query = query.eq("sequence_id", sequence_id)
    return query.order("enrolled_at", desc=True).execute().data


def cancel_enrollment(enrollment_id: str) -> dict:
    result = (
        supabase.table("drip_enrollments")
        .update({"status": "cancelled"})
        .eq("id", enrollment_id)
        .eq("status", "active")
        .execute()
    )
    if not result.data:
        raise ValueError("Enrollment not found or is not active")
    return result.data[0]
