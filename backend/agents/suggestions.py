import json
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from anthropic import Anthropic

from config import MOCK_MODE, supabase, TABLE_PROFILES, TABLE_EMAIL_LOGS
from agents.segmentation import segment_users

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600
_anthropic: Anthropic | None = None


def _get_client() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        _anthropic = Anthropic(api_key=api_key)
    return _anthropic

_cache: dict = {"data": None, "expires_at": None, "generated_at": None}


# ---------------------------------------------------------------------------
# Data gathering
# ---------------------------------------------------------------------------

def _gather_signals() -> dict:
    now = datetime.now(timezone.utc)
    since_90 = (now - timedelta(days=90)).isoformat()
    since_7  = (now - timedelta(days=7)).isoformat()

    logs = (
        supabase.table(TABLE_EMAIL_LOGS)
        .select("template_id,status,timestamp")
        .gte("timestamp", since_90)
        .limit(5000)
        .execute()
    ).data

    templates = supabase.table("email_templates").select("id,title").execute().data
    template_map = {t["id"]: t["title"] for t in templates}

    total_users = len(supabase.table(TABLE_PROFILES).select("id").execute().data)
    new_users_7d = len(
        supabase.table(TABLE_PROFILES).select("id").gte("created_at", since_7).execute().data
    )

    inactive_count = len(segment_users("inactive", {"days": 30}))
    never_emailed_count = len(segment_users("never_emailed", {}))

    upcoming = (
        supabase.table("scheduled_campaigns")
        .select("id,template_id,segment_rule,send_at")
        .eq("status", "pending")
        .order("send_at")
        .limit(5)
        .execute()
    ).data
    for c in upcoming:
        c["template_title"] = template_map.get(c.get("template_id"), "Unknown")

    tmpl_stats: dict = defaultdict(lambda: {"sent": 0, "failed": 0, "total": 0, "last_used": None})
    day_hour_counts: dict = defaultdict(int)

    for log in logs:
        tid    = log.get("template_id")
        status = log.get("status", "")
        ts     = log.get("timestamp")

        if tid:
            tmpl_stats[tid]["total"] += 1
            if status == "sent":
                tmpl_stats[tid]["sent"] += 1
                if ts and (tmpl_stats[tid]["last_used"] is None or ts > tmpl_stats[tid]["last_used"]):
                    tmpl_stats[tid]["last_used"] = ts
            elif status in ("failed", "permanently_failed"):
                tmpl_stats[tid]["failed"] += 1

        if ts and status == "sent":
            try:
                dt  = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                key = f"{dt.strftime('%A')} {dt.hour:02d}:00 UTC"
                day_hour_counts[key] += 1
            except Exception:
                pass

    used_ids = set(tmpl_stats.keys())
    tmpl_perf = []
    for tid, stats in tmpl_stats.items():
        rate = round(stats["sent"] / stats["total"] * 100, 1) if stats["total"] else 0.0
        tmpl_perf.append({
            "id": tid,
            "title": template_map.get(tid, f"Unknown ({tid[:8]})"),
            "sent":         stats["sent"],
            "failed":       stats["failed"],
            "total":        stats["total"],
            "success_rate": rate,
            "last_used":    stats["last_used"],
        })
    tmpl_perf.sort(key=lambda x: x["success_rate"], reverse=True)

    unused = [
        {"id": t["id"], "title": t["title"]}
        for t in templates
        if t["id"] not in used_ids
    ]

    best_times = sorted(day_hour_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "analysis_date":       now.isoformat(),
        "total_users":         total_users,
        "new_users_7d":        new_users_7d,
        "inactive_users_30d":  inactive_count,
        "never_emailed_users": never_emailed_count,
        "total_emails_90d":    len(logs),
        "template_performance": tmpl_perf[:10],
        "unused_templates_90d": unused,
        "best_send_times":     [{"slot": k, "sent_count": v} for k, v in best_times],
        "upcoming_scheduled":  upcoming,
    }


# ---------------------------------------------------------------------------
# Claude analysis
# ---------------------------------------------------------------------------

_PROMPT = """You are analysing email marketing data for DesignHive Admin and generating actionable suggestions.

Analytics snapshot:
{signals}

Generate 3–6 specific, actionable suggestions based on the actual numbers above.

Rules:
- Include real numbers in every message (e.g. "47 users", "82% success rate").
- Skip a suggestion type if data is insufficient (fewer than 20 total sends → skip timing analysis).
- For template_id values in suggested_action use the exact UUIDs from the data.

Return ONLY valid JSON — a flat array with no markdown fences, no extra text. Each object:
  "type":             "timing" | "audience" | "re-engagement" | "template" | "general"
  "message":          string (1–2 sentences, specific and actionable)
  "confidence":       float 0.0–1.0
  "suggested_action": object or null
    send action  → {{"segment": "<rule>", "template_id": "<uuid>"}}
    agent action → {{"agent": "reengagement"}} or {{"agent": "failure_recovery"}}
    info only    → null"""


def _generate(signals: dict) -> list:
    response = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": _PROMPT.format(signals=json.dumps(signals, indent=2, default=str))}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text  = "\n".join(lines[1:-1])
    return json.loads(text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_suggestions(force_refresh: bool = False) -> dict:
    if MOCK_MODE:
        return _mock_response()

    now = datetime.now(timezone.utc)
    if (
        not force_refresh
        and _cache["data"] is not None
        and _cache["expires_at"] is not None
        and now < _cache["expires_at"]
    ):
        return {
            "suggestions":   _cache["data"],
            "cached":        True,
            "generated_at":  _cache["generated_at"],
        }

    signals     = _gather_signals()
    suggestions = _generate(signals)

    _cache["data"]         = suggestions
    _cache["expires_at"]   = now + timedelta(seconds=_CACHE_TTL)
    _cache["generated_at"] = now.isoformat()

    return {
        "suggestions":  suggestions,
        "cached":       False,
        "generated_at": now.isoformat(),
    }


def _mock_response() -> dict:
    return {
        "suggestions": [
            {
                "type":             "general",
                "message":          "MOCK_MODE active — connect to Supabase to see real suggestions.",
                "confidence":       1.0,
                "suggested_action": None,
            }
        ],
        "cached":       False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
