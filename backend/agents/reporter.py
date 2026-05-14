import logging
import os
from datetime import datetime, timezone

from config import supabase

logger = logging.getLogger(__name__)

_ADMIN_EMAIL = os.getenv("REPORTER_ADMIN_EMAIL", "")
_EMAIL_ADMIN = os.getenv("REPORTER_EMAIL_ADMIN", "false").lower() == "true"


def generate_report(
    template: dict,
    results: list,
    *,
    total_targeted: int = None,
    send_admin_email: bool = None,
) -> dict:
    """
    Build a campaign report from the results of a bulk send.

    Args:
        template: The email_templates row that was sent.
        results: List of dicts returned by send_bulk_emails — each has
                 {"email": str, "status": "sent"|"failed", "error": str (optional)}.
        total_targeted: Override for total audience size (defaults to len(results)).
        send_admin_email: Override the REPORTER_EMAIL_ADMIN env var.

    Returns:
        A structured report dict.
    """
    should_email = _EMAIL_ADMIN if send_admin_email is None else send_admin_email

    sent = [r for r in results if r.get("status") == "sent"]
    failed = [r for r in results if r.get("status") != "sent"]
    total = total_targeted if total_targeted is not None else len(results)
    success_rate = round(len(sent) / total * 100, 1) if total else 0.0

    report = {
        "campaign_name": template.get("title", "Untitled"),
        "template_id": template.get("id"),
        "total_targeted": total,
        "sent": len(sent),
        "failed": len(failed),
        "success_rate": success_rate,
        "failed_recipients": [
            {"email": r.get("email"), "error": r.get("error", "Unknown error")}
            for r in failed
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if should_email and _ADMIN_EMAIL:
        _email_report(report)

    return report


def _email_report(report: dict):
    """Send the campaign report to the admin email address."""
    try:
        from services.email import send_direct_email

        failed_rows = ""
        if report["failed_recipients"]:
            rows = "".join(
                f"<tr><td style='padding:4px 8px;border-bottom:1px solid #eee;'>{r['email']}</td>"
                f"<td style='padding:4px 8px;border-bottom:1px solid #eee;color:#c0392b;'>{r['error']}</td></tr>"
                for r in report["failed_recipients"]
            )
            failed_rows = f"""
            <h3 style='color:#c0392b;'>Failed Recipients</h3>
            <table style='border-collapse:collapse;width:100%;font-size:14px;'>
              <tr>
                <th style='text-align:left;padding:4px 8px;background:#f5f5f5;'>Email</th>
                <th style='text-align:left;padding:4px 8px;background:#f5f5f5;'>Error</th>
              </tr>
              {rows}
            </table>"""

        html = f"""
        <h2>Campaign Report — {report['campaign_name']}</h2>
        <table style='border-collapse:collapse;font-size:15px;'>
          <tr><td style='padding:6px 16px 6px 0;color:#666;'>Total targeted</td>
              <td><strong>{report['total_targeted']}</strong></td></tr>
          <tr><td style='padding:6px 16px 6px 0;color:#666;'>Sent</td>
              <td><strong style='color:#27ae60;'>{report['sent']}</strong></td></tr>
          <tr><td style='padding:6px 16px 6px 0;color:#666;'>Failed</td>
              <td><strong style='color:#c0392b;'>{report['failed']}</strong></td></tr>
          <tr><td style='padding:6px 16px 6px 0;color:#666;'>Success rate</td>
              <td><strong>{report['success_rate']}%</strong></td></tr>
          <tr><td style='padding:6px 16px 6px 0;color:#666;'>Timestamp</td>
              <td>{report['timestamp']}</td></tr>
        </table>
        {failed_rows}
        """

        send_direct_email(
            to=_ADMIN_EMAIL,
            subject=f"[DesignHive] Campaign Report — {report['campaign_name']}",
            html_body=html,
        )
        logger.info(f"Campaign report emailed to {_ADMIN_EMAIL}")
    except Exception as exc:
        logger.error(f"Failed to email campaign report: {exc}")


def get_campaign_history(limit: int = 20) -> list:
    """
    Return recent scheduled campaign runs with their result summaries.
    Used by the GET /api/agents/report endpoint.
    """
    try:
        rows = (
            supabase.table("scheduled_campaigns")
            .select("id,template_id,segment_rule,send_at,status,result_summary,created_at")
            .in_("status", ["sent", "failed"])
            .order("send_at", desc=True)
            .limit(limit)
            .execute()
        )
        return rows.data
    except Exception as exc:
        logger.error(f"Failed to fetch campaign history: {exc}")
        return []
