from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from database import supabase
from dependencies import get_current_admin
from models.schemas import SendEmailRequest, SendWelcomeEmailRequest
from services.gmail_service import gmail_service

router = APIRouter()


def _log_email(user_email: str, template_id: str | None, status: str, error: str | None = None):
    supabase.table("email_logs").insert(
        {
            "user_email": user_email,
            "template_id": template_id,
            "status": status,
            "error_message": error,
        }
    ).execute()


def _get_template(template_id: str) -> dict:
    result = supabase.table("email_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


def _build_recipients(request: SendEmailRequest) -> list[tuple[str, str]]:
    """Returns a list of (email, name) tuples."""
    if request.recipient_type == "all":
        users = supabase.table("profiles").select("email, name").execute()
        return [
            (u["email"], u.get("name") or "User")
            for u in (users.data or [])
            if u.get("email")
        ]

    if request.recipient_type == "specific":
        if not request.recipient_emails:
            raise HTTPException(status_code=400, detail="recipient_emails is required for 'specific' type")
        recipients = []
        for email in request.recipient_emails:
            row = supabase.table("profiles").select("email, name").eq("email", email).execute()
            name = row.data[0].get("name") or "User" if row.data else "User"
            recipients.append((email, name))
        return recipients

    raise HTTPException(status_code=400, detail="recipient_type must be 'all' or 'specific'")


@router.post("/send")
def send_bulk_email(
    request: SendEmailRequest,
    background_tasks: BackgroundTasks,
    admin: str = Depends(get_current_admin),
):
    template = _get_template(request.template_id)
    recipients = _build_recipients(request)

    if not recipients:
        raise HTTPException(status_code=400, detail="No valid recipients found")

    def _send_all():
        for email, name in recipients:
            result = gmail_service.send_template_email(
                email, name, template["subject"], template["body"]
            )
            _log_email(
                email,
                template["id"],
                "sent" if result["success"] else "failed",
                result.get("error"),
            )

    background_tasks.add_task(_send_all)
    return {
        "message": f"Queued email to {len(recipients)} recipient(s). Sending in background.",
        "recipient_count": len(recipients),
    }


@router.post("/send-welcome")
def send_welcome_email(
    request: SendWelcomeEmailRequest,
    admin: str = Depends(get_current_admin),
):
    result = supabase.table("email_templates").select("*").eq("title", "Welcome Email").execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="'Welcome Email' template not found. Create it first.")
    template = result.data[0]

    send_result = gmail_service.send_template_email(
        request.user_email, request.user_name, template["subject"], template["body"]
    )
    _log_email(
        request.user_email,
        template["id"],
        "sent" if send_result["success"] else "failed",
        send_result.get("error"),
    )

    if not send_result["success"]:
        raise HTTPException(status_code=500, detail=send_result.get("error", "Failed to send email"))
    return {"message": "Welcome email sent successfully"}


@router.get("/stats")
def get_stats(admin: str = Depends(get_current_admin)):
    users = supabase.table("profiles").select("id", count="exact").execute()
    sent = supabase.table("email_logs").select("id", count="exact").eq("status", "sent").execute()
    failed = supabase.table("email_logs").select("id", count="exact").eq("status", "failed").execute()
    templates = supabase.table("email_templates").select("id", count="exact").execute()

    return {
        "total_users": users.count or 0,
        "total_emails_sent": sent.count or 0,
        "total_failed": failed.count or 0,
        "total_templates": templates.count or 0,
    }


@router.get("/users")
def get_users(admin: str = Depends(get_current_admin)):
    result = supabase.table("profiles").select("id, name, email, created_at").order("created_at", desc=True).execute()
    return result.data or []


@router.get("/gmail-status")
def gmail_status(admin: str = Depends(get_current_admin)):
    return gmail_service.check_connection()
