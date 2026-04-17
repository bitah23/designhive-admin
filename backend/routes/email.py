from fastapi import APIRouter, HTTPException, Depends
from config import supabase
from deps import get_current_admin
from models import SendBulkRequest, SendDirectRequest
from services.email import send_bulk_emails, send_direct_email

router = APIRouter()


@router.post("/send")
def bulk_send(body: SendBulkRequest, admin=Depends(get_current_admin)):
    template = supabase.table("email_templates").select("*").eq("id", body.template_id).single().execute().data
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    users = supabase.table("profiles").select("*").in_("id", body.user_ids).execute().data
    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    results = send_bulk_emails(template, users)
    return {"message": "Done", "results": results}


@router.post("/send-direct")
def direct_send(body: SendDirectRequest, admin=Depends(get_current_admin)):
    send_direct_email(
        to=body.to,
        subject=body.subject,
        html_body=body.body,
        attachments=body.attachments,
    )
    return {"message": "Email sent"}
