from fastapi import APIRouter, HTTPException, Header
from config import supabase, WEBHOOK_SECRET
from models import WebhookPayload
from services.email import send_bulk_emails

router = APIRouter()


@router.post("/welcome")
def welcome_webhook(body: WebhookPayload, x_webhook_secret: str = Header(None)):
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = body.record
    if not user.email:
        return {"message": "No email in payload, skipped"}

    template_result = (
        supabase.table("email_templates")
        .select("*")
        .ilike("title", "%welcome%")
        .limit(1)
        .execute()
    )
    if not template_result.data:
        return {"message": "No welcome template found, skipped"}

    template = template_result.data[0]
    send_bulk_emails(template, [{"email": user.email, "name": user.name or ""}])
    return {"message": "Welcome email sent"}
