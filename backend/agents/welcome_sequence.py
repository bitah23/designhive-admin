import logging
import os

from config import supabase
from agents.drip import enroll_user

logger = logging.getLogger(__name__)

_AGENT_KEY            = "welcome"
_DEFAULT_SEQUENCE_NAME = "Welcome Sequence"


# ---------------------------------------------------------------------------
# Config  (DB-backed, falls back to env var on first run)
# ---------------------------------------------------------------------------

def get_config() -> dict:
    """
    Returns the current welcome sequence config from the agent_config table.
    Falls back to env var / name lookup if no DB row exists yet.
    """
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
        logger.warning("Could not read welcome config from DB: %s", exc)

    # First-run fallback: build from env var or sequence name lookup
    seq_id = os.getenv("WELCOME_SEQUENCE_ID")
    if not seq_id:
        try:
            result = (
                supabase.table("drip_sequences")
                .select("id")
                .eq("name", _DEFAULT_SEQUENCE_NAME)
                .eq("is_active", True)
                .execute()
            )
            seq_id = result.data[0]["id"] if result.data else None
        except Exception:
            seq_id = None

    return {"enabled": True, "sequence_id": seq_id}


def update_config(data: dict) -> dict:
    """Merges data into the stored config and upserts to agent_config."""
    current = get_config()
    merged  = {**current, **data}
    supabase.table("agent_config").upsert({
        "agent":  _AGENT_KEY,
        "config": merged,
    }).execute()
    logger.info("Welcome sequence config updated: %s", merged)
    return merged


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------

def enroll_new_user(user_id: str) -> dict:
    """
    Enrolls a newly signed-up user in the configured Welcome drip sequence.
    Called by the welcome-enroll webhook endpoint on every new profile insert.
    """
    config = get_config()

    if not config.get("enabled", True):
        logger.info("Welcome sequence disabled — skipping enrollment for user %s", user_id)
        return {"enrolled": False, "reason": "Welcome sequence is disabled"}

    seq_id = config.get("sequence_id")
    if not seq_id:
        logger.warning(
            "Welcome sequence not configured — set sequence_id via the Agents UI "
            "or WELCOME_SEQUENCE_ID env var. Skipping enrollment for user %s.", user_id,
        )
        return {"enrolled": False, "reason": "Welcome sequence not configured"}

    try:
        enrollment = enroll_user(sequence_id=seq_id, user_id=user_id)
        logger.info("User %s enrolled in welcome sequence %s", user_id, seq_id)
        return {"enrolled": True, "enrollment": enrollment}
    except ValueError as exc:
        logger.warning("Welcome enrollment skipped for user %s: %s", user_id, exc)
        return {"enrolled": False, "reason": str(exc)}
