import logging
import os

from config import supabase
from agents.drip import enroll_user

logger = logging.getLogger(__name__)

_WELCOME_SEQUENCE_NAME = "Welcome Sequence"


def _get_welcome_sequence_id() -> str | None:
    """Returns the welcome drip sequence ID, preferring the env var over a name lookup."""
    seq_id = os.getenv("WELCOME_SEQUENCE_ID")
    if seq_id:
        return seq_id
    result = (
        supabase.table("drip_sequences")
        .select("id")
        .eq("name", _WELCOME_SEQUENCE_NAME)
        .eq("is_active", True)
        .execute()
    )
    return result.data[0]["id"] if result.data else None


def enroll_new_user(user_id: str) -> dict:
    """
    Enrolls a newly signed-up user in the Welcome drip sequence.
    Called by the welcome-enroll webhook endpoint on every new profile insert.
    """
    seq_id = _get_welcome_sequence_id()
    if not seq_id:
        logger.warning(
            "Welcome sequence not found — set WELCOME_SEQUENCE_ID or create a "
            "sequence named '%s'. Skipping enrollment for user %s.",
            _WELCOME_SEQUENCE_NAME,
            user_id,
        )
        return {"enrolled": False, "reason": "Welcome sequence not configured"}

    try:
        enrollment = enroll_user(sequence_id=seq_id, user_id=user_id)
        logger.info("User %s enrolled in welcome sequence %s", user_id, seq_id)
        return {"enrolled": True, "enrollment": enrollment}
    except ValueError as exc:
        # e.g. user already enrolled, sequence inactive — not a crash, just skip
        logger.warning("Welcome enrollment skipped for user %s: %s", user_id, exc)
        return {"enrolled": False, "reason": str(exc)}
