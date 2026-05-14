from datetime import datetime, timedelta, timezone

from config import supabase


def segment_users(rule: str, params: dict | None = None) -> list[dict]:
    """
    Returns filtered user dicts matching the given rule.
    Called directly by other agents (no HTTP overhead).
    """
    params = params or {}

    if rule == "all":
        return _all_users()
    elif rule == "new_users":
        days = int(params.get("days") or 7)
        return _new_users(days)
    elif rule == "inactive":
        days = int(params.get("days") or 30)
        return _inactive_users(days)
    elif rule == "never_emailed":
        return _never_emailed_users()
    elif rule == "custom_date_range":
        return _users_by_date_range(params["from_date"], params["to_date"])
    else:
        raise ValueError(f"Unknown segment rule: {rule!r}")


# ---------------------------------------------------------------------------
# Rule implementations
# ---------------------------------------------------------------------------

def _pick(user: dict) -> dict:
    return {k: user.get(k) for k in ("id", "name", "email", "created_at")}


def _all_users() -> list[dict]:
    result = supabase.table("profiles").select("id,name,email,created_at").order("created_at", desc=True).execute()
    return [_pick(u) for u in result.data]


def _new_users(days: int) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = (
        supabase.table("profiles")
        .select("id,name,email,created_at")
        .gte("created_at", cutoff)
        .order("created_at", desc=True)
        .execute()
    )
    return [_pick(u) for u in result.data]


def _inactive_users(days: int) -> list[dict]:
    # Inactive = no successful send in the last N days (includes never-emailed).
    # Supabase PostgREST can't do NOT IN (subquery), so we filter in Python.
    all_users = _all_users()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    logs = (
        supabase.table("email_logs")
        .select("user_email")
        .eq("status", "sent")
        .gte("timestamp", cutoff)
        .execute()
    )
    recently_emailed = {row["user_email"] for row in logs.data}
    return [u for u in all_users if u["email"] not in recently_emailed]


def _never_emailed_users() -> list[dict]:
    # Never received any successful email ever.
    all_users = _all_users()
    logs = (
        supabase.table("email_logs")
        .select("user_email")
        .eq("status", "sent")
        .execute()
    )
    ever_emailed = {row["user_email"] for row in logs.data}
    return [u for u in all_users if u["email"] not in ever_emailed]


def _users_by_date_range(from_date: str, to_date: str) -> list[dict]:
    # Accepts ISO date strings e.g. "2026-01-01". Treats to_date as inclusive end of day.
    to_dt = to_date if "T" in to_date else to_date + "T23:59:59+00:00"
    result = (
        supabase.table("profiles")
        .select("id,name,email,created_at")
        .gte("created_at", from_date)
        .lte("created_at", to_dt)
        .order("created_at", desc=True)
        .execute()
    )
    return [_pick(u) for u in result.data]
