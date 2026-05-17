import json
import logging
import os
from datetime import datetime, timedelta, timezone

from anthropic import Anthropic

from config import supabase, TABLE_PROFILES, TABLE_EMAIL_LOGS
from agents.segmentation import segment_users as _segment_users
from agents.content_gen import generate_email_content as _generate_content
from agents.scheduler import (
    create_scheduled_campaign as _create_scheduled,
    list_scheduled_campaigns as _list_scheduled,
)
from agents.reporter import get_campaign_history as _get_report
from agents.reengagement import run as _run_reengagement
from agents.failure_recovery import run as _run_failure_recovery
from services.email import send_bulk_emails as _send_bulk

logger = logging.getLogger(__name__)

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        _client = Anthropic(api_key=api_key, timeout=120.0)
    return _client

_SYSTEM_PROMPT = (
    "You are the DesignHive Admin AI assistant — a natural language interface for an email marketing platform.\n\n"
    "Platform overview:\n"
    "- Templates: pre-written emails stored in the database (each has id, title, subject, body).\n"
    "- Segments: rules that filter users — all | new_users | inactive | never_emailed | custom_date_range.\n"
    "- Campaigns: send a template to a segment now, or schedule for a future datetime.\n"
    "- Drip sequences: multi-step email sequences sent over days.\n"
    "- Re-engagement agent: finds inactive users (no email in N days) and emails them.\n"
    "- Failure recovery agent: retries previously failed sends with exponential backoff.\n\n"
    "Behaviour rules:\n"
    "1. When the admin names a template (e.g. 'welcome email'), call list_templates first to resolve its ID.\n"
    "2. After executing an action, reply with a concise, friendly summary including key numbers.\n"
    "3. If required info is missing (e.g. no send time given for scheduling), ask — don't guess.\n"
    "4. Never expose raw UUIDs in your reply unless specifically asked.\n"
    "4b. If a tool returns an 'error' field, always quote the exact error message in your reply — never give a generic 'something went wrong' response. The admin needs to know the specific failure reason.\n"
    "5. When generating NEW email content:\n"
    "   a. Always call generate_content then save_template first (to create a record).\n"
    "   b. If the admin explicitly asks to send immediately — phrases like 'send now', 'no scheduling', 'send immediately', 'create and send' — call send_campaign_now right after save_template using the template id returned by save_template. Do not wait for dashboard approval in this case.\n"
    "   c. If the admin does NOT say to send immediately, stop after save_template and tell them the draft is ready for review on the dashboard.\n"
    "6. When the admin approves a template (message contains 'approved template' and a template id), call send_campaign_now using that exact template id and the specified segment.\n\n"
    f"Today's date (UTC): {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
)

_TOOLS = [
    {
        "name": "list_templates",
        "description": "List all email templates with their IDs and titles. Call this first when the admin refers to a template by name.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "segment_users",
        "description": "Count (and list) users matching a segment rule.",
        "input_schema": {
            "type": "object",
            "properties": {
                "rule": {
                    "type": "string",
                    "enum": ["all", "new_users", "inactive", "never_emailed", "custom_date_range"],
                },
                "params": {
                    "type": "object",
                    "description": "Optional: {days: int} for inactive; {start_date: YYYY-MM-DD, end_date: YYYY-MM-DD} for custom_date_range",
                },
            },
            "required": ["rule"],
        },
    },
    {
        "name": "send_campaign_now",
        "description": "Send an email template to a segment of users immediately.",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_id": {"type": "string", "description": "UUID of the template to send"},
                "segment_rule": {
                    "type": "string",
                    "enum": ["all", "new_users", "inactive", "never_emailed", "custom_date_range"],
                },
                "segment_params": {"type": "object", "description": "Optional segmentation params"},
            },
            "required": ["template_id", "segment_rule"],
        },
    },
    {
        "name": "schedule_campaign",
        "description": "Schedule an email campaign to send at a future datetime (UTC).",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_id": {"type": "string"},
                "segment_rule": {
                    "type": "string",
                    "enum": ["all", "new_users", "inactive", "never_emailed", "custom_date_range"],
                },
                "segment_params": {"type": "object"},
                "send_at": {
                    "type": "string",
                    "description": "ISO 8601 datetime in UTC, e.g. 2026-05-15T10:00:00Z",
                },
            },
            "required": ["template_id", "segment_rule", "send_at"],
        },
    },
    {
        "name": "generate_content",
        "description": "Generate an email subject and HTML body using AI from a brief description. The admin can then save it as a new template.",
        "input_schema": {
            "type": "object",
            "properties": {
                "brief": {"type": "string", "description": "1-3 sentence description of the email goal"},
                "tone": {
                    "type": "string",
                    "enum": ["friendly", "professional", "urgent"],
                },
                "include_cta": {"type": "boolean"},
                "cta_text": {"type": "string"},
            },
            "required": ["brief"],
        },
    },
    {
        "name": "run_reengagement",
        "description": "Run the re-engagement agent now — finds inactive users and emails (or enrolls) them.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "run_failure_recovery",
        "description": "Run the failure recovery agent now — retries failed email sends.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_email_stats",
        "description": "Get email send statistics (sent / failed / permanently_failed counts) for a recent time window.",
        "input_schema": {
            "type": "object",
            "properties": {
                "since_days": {"type": "integer", "description": "Look back this many days. Default 30."},
            },
        },
    },
    {
        "name": "list_scheduled_campaigns",
        "description": "List all scheduled campaigns with their status, template, segment, and scheduled time.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_campaign_report",
        "description": "Get recent campaign run history with sent/failed counts and success rates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of campaigns to return. Default 10."},
            },
        },
    },
    {
        "name": "save_template",
        "description": (
            "Save a generated email as a DRAFT template awaiting admin approval. "
            "Use this after generate_content — never send freshly generated content directly. "
            "The admin reviews it on the dashboard and clicks Approve, which triggers the send automatically."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title":          {"type": "string", "description": "Short descriptive name, e.g. 'Black Friday 50% Off'"},
                "subject":        {"type": "string", "description": "Email subject line"},
                "body":           {"type": "string", "description": "Full HTML email body"},
                "segment_rule":   {
                    "type": "string",
                    "enum": ["all", "new_users", "inactive", "never_emailed", "custom_date_range"],
                    "description": "Segment to send to once approved",
                },
                "segment_params": {"type": "object", "description": "Optional segment params"},
            },
            "required": ["title", "subject", "body", "segment_rule"],
        },
    },
]


def _execute_tool(name: str, inputs: dict) -> str:
    try:
        if name == "list_templates":
            rows = (
                supabase.table("email_templates")
                .select("id,title,subject")
                .order("created_at", desc=True)
                .execute()
            )
            return json.dumps(rows.data)

        elif name == "segment_users":
            params = inputs.get("params") or {}
            users = _segment_users(inputs["rule"], params)
            return json.dumps({
                "count": len(users),
                "sample_ids": users[:5],
                "note": "sample_ids shows first 5 only" if len(users) > 5 else None,
            })

        elif name == "send_campaign_now":
            params = inputs.get("segment_params") or {}
            users = _segment_users(inputs["segment_rule"], params)
            if not users:
                return json.dumps({"sent": 0, "failed": 0, "note": "No users matched the segment"})
            tmpl_res = (
                supabase.table("email_templates")
                .select("*")
                .eq("id", inputs["template_id"])
                .execute()
            )
            if not tmpl_res.data:
                return json.dumps({"error": f"Template {inputs['template_id']} not found"})
            template = tmpl_res.data[0]
            results = _send_bulk(template, users)
            from agents.reporter import generate_report
            report = generate_report(template, results, total_targeted=len(users))
            # Truncate failed_recipients so the tool result stays small enough
            # for the model to process — full list is already in the email logs.
            failed = report.get("failed_recipients", [])
            report["failed_recipients"] = failed[:5]
            if len(failed) > 5:
                report["failed_recipients_note"] = f"{len(failed)} total failures — showing first 5 only"
            return json.dumps(report)

        elif name == "schedule_campaign":
            job = _create_scheduled(
                template_id=inputs["template_id"],
                segment_rule=inputs["segment_rule"],
                segment_params=inputs.get("segment_params") or {},
                send_at=inputs["send_at"],
            )
            return json.dumps(job)

        elif name == "generate_content":
            result = _generate_content(
                brief=inputs["brief"],
                tone=inputs.get("tone", "friendly"),
                include_cta=inputs.get("include_cta", True),
                cta_text=inputs.get("cta_text", "Learn More"),
            )
            return json.dumps(result)

        elif name == "run_reengagement":
            return json.dumps(_run_reengagement())

        elif name == "run_failure_recovery":
            return json.dumps(_run_failure_recovery())

        elif name == "get_email_stats":
            since_days = inputs.get("since_days", 30)
            since = (datetime.now(timezone.utc) - timedelta(days=since_days)).isoformat()
            rows = (
                supabase.table(TABLE_EMAIL_LOGS)
                .select("status")
                .gte("timestamp", since)
                .execute()
            )
            counts: dict = {}
            for r in rows.data:
                s = r.get("status", "unknown")
                counts[s] = counts.get(s, 0) + 1
            return json.dumps({
                "since_days": since_days,
                "counts": counts,
                "total": len(rows.data),
            })

        elif name == "list_scheduled_campaigns":
            return json.dumps(_list_scheduled())

        elif name == "get_campaign_report":
            limit = inputs.get("limit", 10)
            return json.dumps(_get_report(limit=limit))

        elif name == "save_template":
            row = supabase.table("email_templates").insert({
                "title":            inputs["title"],
                "subject":          inputs["subject"],
                "body":             inputs["body"],
                "status":           "draft",
                "pending_campaign": {
                    "segment_rule":   inputs["segment_rule"],
                    "segment_params": inputs.get("segment_params") or {},
                },
            }).execute()
            saved = row.data[0] if row.data else {}
            return json.dumps({
                "id":      saved.get("id"),
                "title":   saved.get("title"),
                "status":  "draft",
                "message": "Draft saved. Admin will see it in the dashboard — campaign fires on approval.",
            })

        else:
            return json.dumps({"error": f"Unknown tool: {name}"})

    except Exception as exc:
        import traceback
        detail = traceback.format_exc()
        logger.error("Chat tool '%s' error: %s\n%s", name, exc, detail)
        return json.dumps({"error": str(exc), "detail": detail.splitlines()[-3:]})


def chat(message: str) -> dict:
    """
    Process a plain-English admin instruction, execute the appropriate
    platform action(s) via Claude tool use, and return a human-readable reply.
    """
    messages = [{"role": "user", "content": message}]
    action_taken = None

    client = _get_client()
    logger.info("Chat request: %.120s", message)

    for round_num in range(10):  # safety cap on tool-call rounds
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            tools=_TOOLS,
            messages=messages,
        )

        logger.debug("Round %d stop_reason=%s", round_num, response.stop_reason)
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            reply = next(
                (block.text for block in response.content if hasattr(block, "text")),
                "Done.",
            )
            logger.info("Chat completed after %d round(s)", round_num + 1)
            return {"reply": reply, "action_taken": action_taken}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    logger.info("Tool call: %s  input=%s", block.name, json.dumps(block.input)[:200])
                    result_str = _execute_tool(block.name, block.input)
                    logger.info("Tool result: %s  output=%s", block.name, result_str[:300])
                    if action_taken is None:
                        try:
                            parsed = json.loads(result_str)
                        except Exception:
                            parsed = result_str
                        action_taken = {
                            "tool": block.name,
                            "input": block.input,
                            "result": parsed,
                        }
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        logger.warning("Unexpected stop_reason=%r on round %d — breaking loop", response.stop_reason, round_num)
        break

    logger.error(
        "Chat loop exhausted or broke unexpectedly. message=%.120s  rounds=%d  last_stop_reason=%s",
        message,
        round_num + 1,
        getattr(response, "stop_reason", "unknown"),
    )
    return {"reply": "I was unable to complete the request.", "action_taken": action_taken}
